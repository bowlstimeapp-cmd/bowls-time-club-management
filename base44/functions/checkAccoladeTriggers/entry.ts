import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Checks auto-trigger accolades for a club/member.
 *
 * When called from an automation, the payload has:
 *   { event, data, old_data }  — standard entity automation payload
 *   We extract club_id and the relevant user_email from data.
 *
 * When called manually (admin sweep), the payload has:
 *   { club_id, user_email? }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Determine if this is an automation event or a direct call
    let club_id, user_email, trigger_type;

    if (body.event && body.data) {
      // Called from an entity automation
      const entity = body.event?.entity_name;
      const data = body.data;
      club_id = data.club_id;

      if (entity === 'Booking') {
        user_email = data.booker_email;
        trigger_type = 'booking_count';
        // Also check first_booking
      } else if (entity === 'TeamSelection') {
        // We'll sweep all members since selection doesn't have a single user_email
        trigger_type = 'selection_count';
        user_email = null;
      }
    } else {
      // Direct / admin call
      club_id = body.club_id;
      user_email = body.user_email || null;
      trigger_type = body.trigger_type || null;
    }

    if (!club_id) {
      return Response.json({ error: 'club_id is required' }, { status: 400 });
    }

    const today = new Date().toISOString().slice(0, 10);

    // Load auto-trigger accolades for this club
    const allAccolades = await base44.asServiceRole.entities.ClubAccolade.filter({ club_id });
    const autoAccolades = allAccolades.filter(a =>
      a.auto_trigger && a.auto_trigger !== 'none' &&
      (!trigger_type || a.auto_trigger === trigger_type ||
        // Always check first_booking/first_selection on any relevant event
        (trigger_type === 'booking_count' && a.auto_trigger === 'first_booking') ||
        (trigger_type === 'selection_count' && a.auto_trigger === 'first_selection')
      )
    );

    if (autoAccolades.length === 0) {
      return Response.json({ awarded: 0, message: 'No matching auto-trigger accolades' });
    }

    // Load existing assignments to avoid double-awarding
    const existingAssignments = await base44.asServiceRole.entities.ClubAccoladeAssignment.filter({ club_id });

    // Load members to check
    let memberFilter = { club_id, status: 'approved' };
    if (user_email) memberFilter.user_email = user_email;
    const members = await base44.asServiceRole.entities.ClubMembership.filter(memberFilter);

    if (members.length === 0) {
      return Response.json({ awarded: 0, message: 'No matching members found' });
    }

    // Load bookings and selections once
    const [bookings, selections] = await Promise.all([
      base44.asServiceRole.entities.Booking.filter({ club_id }),
      base44.asServiceRole.entities.TeamSelection.filter({ club_id, status: 'published' }),
    ]);

    let awardedCount = 0;

    for (const member of members) {
      const email = member.user_email;

      for (const accolade of autoAccolades) {
        const alreadyHas = existingAssignments.some(
          a => a.accolade_id === accolade.id && a.user_email === email
        );
        if (alreadyHas) continue;

        let qualifies = false;
        const threshold = accolade.auto_trigger_threshold || 1;

        if (accolade.auto_trigger === 'booking_count') {
          const count = bookings.filter(
            b => b.booker_email === email && b.status === 'approved'
          ).length;
          qualifies = count >= threshold;

        } else if (accolade.auto_trigger === 'selection_count') {
          let count = 0;
          for (const sel of selections) {
            const positions = sel.selections ? Object.values(sel.selections) : [];
            if (positions.includes(email)) count++;
          }
          qualifies = count >= threshold;

        } else if (accolade.auto_trigger === 'league_games') {
          const leagueTeams = await base44.asServiceRole.entities.LeagueTeam.filter({ club_id });
          const memberTeamIds = leagueTeams
            .filter(t => (t.players || []).includes(email))
            .map(t => t.id);
          const fixtures = await base44.asServiceRole.entities.LeagueFixture.filter({ club_id, status: 'completed' });
          const count = fixtures.filter(
            f => memberTeamIds.includes(f.home_team_id) || memberTeamIds.includes(f.away_team_id)
          ).length;
          qualifies = count >= threshold;

        } else if (accolade.auto_trigger === 'first_booking') {
          const count = bookings.filter(b => b.booker_email === email).length;
          qualifies = count >= 1;

        } else if (accolade.auto_trigger === 'first_selection') {
          let found = false;
          for (const sel of selections) {
            const positions = sel.selections ? Object.values(sel.selections) : [];
            if (positions.includes(email)) { found = true; break; }
          }
          qualifies = found;
        }

        if (qualifies) {
          await base44.asServiceRole.entities.ClubAccoladeAssignment.create({
            club_id,
            accolade_id: accolade.id,
            user_email: email,
            awarded_date: today,
            auto_awarded: true,
          });
          // Update local cache so multiple accolades for same member don't double-award
          existingAssignments.push({ accolade_id: accolade.id, user_email: email });
          awardedCount++;
          console.log(`Auto-awarded "${accolade.name}" to ${email}`);
        }
      }
    }

    return Response.json({ awarded: awardedCount, message: `${awardedCount} accolade(s) auto-awarded` });
  } catch (error) {
    console.error('checkAccoladeTriggers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});