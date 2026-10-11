import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Saves live match scores for a team selection.
// Permission is based on the caller's club membership role (admin/selector/live_scorer),
// not on who originally created the score record.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { selectionId, clubId, opposition_players, club_scores, opposition_scores, ends } = body;
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
    if (existing[0]) {
      await service.entities.MatchScore.update(existing[0].id, data);
      return Response.json({ ok: true, id: existing[0].id, created: false });
    }
    const created = await service.entities.MatchScore.create({
      selection_id: selectionId,
      club_id: clubId,
      ...data,
    });
    return Response.json({ ok: true, id: created.id, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}