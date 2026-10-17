import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { sendPushToEmails } from '../../shared/webPush.ts';

// Saves live match scores for a team selection.
// Permission is based on the caller's club membership role (admin/selector/live_scorer),
// not on who originally created the score record.
// When the saved score is not 0-0, a live score push notification is sent to club members.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { selectionId, clubId, opposition_players, club_scores, opposition_scores, ends, version } = body;
    if (!selectionId || !clubId) {
      return Response.json({ error: 'selectionId and clubId are required' }, { status: 400 });
    }

    const memberships = await base44.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership || !['admin', 'selector', 'live_scorer'].includes(membership.role)) {
      return Response.json({ error: 'Not permitted to save scores' }, { status: 403 });
    }

    const data = {
      opposition_players: opposition_players || {},
      club_scores: club_scores || {},
      opposition_scores: opposition_scores || {},
      ends: ends || {},
    };

    const service = base44.asServiceRole;
    const existing = await service.entities.MatchScore.filter({ selection_id: selectionId });
    let scoreId;
    if (existing[0]) {
      // Stale-save guard: if the record has changed since the caller loaded it,
      // refuse the save so an older screen can't overwrite newer scores.
      if (version && existing[0].updated_date && existing[0].updated_date !== version) {
        return Response.json({
          error: 'conflict: newer scores were saved by someone else',
        }, { status: 409 });
      }
      await service.entities.MatchScore.update(existing[0].id, data);
      scoreId = existing[0].id;
    } else {
      const created = await service.entities.MatchScore.create({
        selection_id: selectionId,
        club_id: clubId,
        ...data,
      });
      scoreId = created.id;
    }

    // Live score push notification — non-blocking, doesn't delay the save response.
    waitUntil((async () => {
      try {
        const total = (scores) => Object.values(scores || {}).reduce((sum, s) => sum + (parseInt(s) || 0), 0);
        const clubTotal = total(data.club_scores);
        const oppositionTotal = total(data.opposition_scores);
        if (clubTotal === 0 && oppositionTotal === 0) return;

        const clubs = await service.entities.Club.filter({ id: clubId });
        const club = clubs[0];
        const selections = await service.entities.TeamSelection.filter({ id: selectionId });
        const selection = selections[0];
        if (!club || !selection) return;

        const members = await service.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' });
        const emails = members.map(m => m.user_email).filter(Boolean);
        if (emails.length === 0) return;

        const oppositionName = selection.opponent || 'Opposition';
        const message = `Live score update: ${selection.competition} - ${club.name} ${clubTotal} - ${oppositionName} ${oppositionTotal}`;

        await sendPushToEmails(base44, emails, {
          title: 'Live Score Update',
          body: message,
          url: `/LiveScoring?clubId=${clubId}&selectionId=${selectionId}`,
        });
      } catch (err) {
        console.error('Live score push failed:', err);
      }
    })());

    return Response.json({ ok: true, id: scoreId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}