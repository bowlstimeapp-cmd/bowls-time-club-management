import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { sendPushToEmails } from '../../shared/webPush.ts';

// Saves live match scores for a team selection.
// Permission is based on the caller's club membership role (admin/selector/live_scorer),
// not on who originally created the score record.
// scope: 'home' / 'away' saves BOTH teams' scores, ends and opposition players
// for match_keys taken from the matching venue labels in the scoring table.
// 'all' (default) saves everything, kept for compatibility.
// Each venue keeps its own version stamp (home_updated_date / away_updated_date),
// so home and away scorers never block or overwrite each other.
// When the saved score is not 0-0, a live score push notification is sent to club members.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { selectionId, clubId, opposition_players, club_scores, opposition_scores, ends, version, scope, match_keys } = body;
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

    const service = base44.asServiceRole;
    const { items: selections } = await service.entities.TeamSelection.filter({ id: selectionId, club_id: clubId }, { limit: 1 });
    const selection = selections[0];
    if (!selection) return Response.json({ error: 'Selection not found for this club' }, { status: 404 });
    const scoped = scope === 'home' || scope === 'away';
    if (scoped && (!Array.isArray(match_keys) || !match_keys.length || match_keys.some(key =>
      typeof key !== 'string' || !/^[a-zA-Z0-9_]+$/.test(key) ||
      !Object.keys(selection.selections || {}).some(position => position.startsWith(`${key}_`))
    ))) {
      return Response.json({ error: 'Choose the rink rows for this venue' }, { status: 400 });
    }
    if (scoped && [club_scores, opposition_scores, ends].some(value => !value || typeof value !== 'object' || Array.isArray(value))) {
      return Response.json({ error: 'Both teams scores and ends are required for a venue save' }, { status: 400 });
    }
    const stampField = scoped ? `${scope}_updated_date` : null;
    const stamp = new Date().toISOString();
    const data = {};
    for (const field of ['club_scores', 'opposition_scores', 'ends', 'opposition_players']) {
      if (scoped && body[field] === undefined) continue;
      data[field] = scoped ? Object.fromEntries(Object.entries(body[field] || {}).filter(([key]) =>
        field === 'opposition_players'
          ? match_keys.some(matchKey => key.startsWith(`${matchKey}_`) && ['Skip', '3', '2', 'Lead', 'Player'].includes(key.slice(matchKey.length + 1)))
          : match_keys.includes(key)
      )) : body[field] || {};
    }
    const { items: existing } = await service.entities.MatchScore.filter({ selection_id: selectionId, club_id: clubId }, { limit: 1 });
    let scoreId;
    if (existing[0]) {
      const recordedVersion = stampField ? existing[0][stampField] : null;
      if (recordedVersion && version && recordedVersion !== version) {
        return Response.json({ error: 'conflict: newer scores were saved by someone else' }, { status: 409 });
      }
      if (scoped) {
        // Set individual rink keys atomically: a simultaneous save at the other
        // venue cannot replace either team's scores, ends or player names here.
        const fields = { [stampField]: stamp };
        for (const [field, values] of Object.entries(data)) {
          for (const [key, value] of Object.entries(values)) fields[`${field}.${key}`] = value;
        }
        await service.entities.MatchScore.updateMany({ id: existing[0].id, club_id: clubId }, { $set: fields });
        // Single-record updates retain the existing realtime subscription event.
        await service.entities.MatchScore.update(existing[0].id, { [stampField]: stamp });
      } else {
        await service.entities.MatchScore.update(existing[0].id, data);
      }
      scoreId = existing[0].id;
    } else {
      const created = await service.entities.MatchScore.create({
        selection_id: selectionId, club_id: clubId, ...data,
        ...(scoped ? { [stampField]: stamp } : {}),
      });
      scoreId = created.id;
    }

    // Live score push notification — non-blocking, doesn't delay the save response.
    waitUntil((async () => {
      try {
        const merged = existing[0] || {};
        const total = (scores) => Object.values(scores || {}).reduce((sum, s) => sum + (parseInt(s) || 0), 0);
        const clubTotal = total(scoped ? { ...merged.club_scores, ...data.club_scores } : data.club_scores);
        const oppositionTotal = total(scoped ? { ...merged.opposition_scores, ...data.opposition_scores } : data.opposition_scores);
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

    return Response.json({
      ok: true,
      id: scoreId,
      ...(scope === 'home' ? { home_updated_date: stamp } : scope === 'away' ? { away_updated_date: stamp } : {}),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}