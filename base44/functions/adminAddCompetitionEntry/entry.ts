import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId, competitionId, emails, teamEntry } = await req.json();

    if (!clubId || !competitionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user is a club admin
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership || membership.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Club admin access required' }, { status: 403 });
    }

    // Fetch member names map
    const allMembers = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      status: 'approved',
    });
    const memberMap = {};
    allMembers.forEach(m => { memberMap[m.user_email] = m.user_name || m.user_email; });

    // Fetch existing entries to avoid duplicates
    const existingEntries = await base44.asServiceRole.entities.CompetitionEntry.filter({
      competition_id: competitionId,
    });

    // ─── Team Entry (pairs / triples) ───
    if (teamEntry) {
      const { leadEmail, teamMembers } = teamEntry;

      if (!leadEmail || !Array.isArray(teamMembers) || teamMembers.length === 0) {
        return Response.json({ error: 'Invalid team entry data' }, { status: 400 });
      }

      // Check if lead is already entered as lead
      const alreadyLead = existingEntries.some(e => e.user_email === leadEmail);
      if (alreadyLead) {
        return Response.json({ added: 0, message: `${memberMap[leadEmail] || leadEmail} is already entered as a lead entrant` });
      }

      await base44.asServiceRole.entities.CompetitionEntry.create({
        competition_id: competitionId,
        club_id: clubId,
        user_email: leadEmail,
        member_name: memberMap[leadEmail] || leadEmail,
        team_members: teamMembers.map(m => ({
          email: m.email,
          name: memberMap[m.email] || m.name || m.email,
        })),
        entry_date: new Date().toISOString(),
      });

      return Response.json({ added: 1, message: 'Team entry added successfully' });
    }

    // ─── Bulk Singles / Fours ───
    if (!Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'Missing emails or teamEntry' }, { status: 400 });
    }

    const existingEmails = new Set(existingEntries.map(e => e.user_email));
    const toAdd = emails.filter(email => !existingEmails.has(email));

    if (toAdd.length === 0) {
      return Response.json({ added: 0, message: 'All selected members are already entered' });
    }

    for (const email of toAdd) {
      await base44.asServiceRole.entities.CompetitionEntry.create({
        competition_id: competitionId,
        club_id: clubId,
        user_email: email,
        member_name: memberMap[email] || email,
        team_members: [],
        entry_date: new Date().toISOString(),
      });
    }

    return Response.json({ added: toAdd.length, message: `${toAdd.length} entrant(s) added successfully` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});