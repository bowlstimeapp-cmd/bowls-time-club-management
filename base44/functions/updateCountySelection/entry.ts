import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isPlatformAdminOrHasRole } from '../../shared/countyAuth.ts';
import { getAllCountyMemberEmails } from '../../shared/countyMembers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { selectionId, countyId, data, delete: doDelete } = await req.json();
    if (!countyId) return Response.json({ error: 'Missing required field: countyId' }, { status: 400 });

    const authorized = await isPlatformAdminOrHasRole(base44, user, countyId, ['admin', 'secretary', 'selector']);
    if (!authorized) return Response.json({ error: 'Forbidden: requires county admin or selector role' }, { status: 403 });

    // Delete mode
    if (doDelete) {
      if (!selectionId) return Response.json({ error: 'Missing selectionId for delete' }, { status: 400 });
      const existing = (await base44.asServiceRole.entities.CountySelection.filter({ id: selectionId }))[0];
      if (!existing) return Response.json({ error: 'Selection not found' }, { status: 404 });
      if (existing.county_id !== countyId) return Response.json({ error: 'Selection does not belong to this county' }, { status: 403 });
      await base44.asServiceRole.entities.CountySelection.delete(selectionId);
      return Response.json({ success: true, deleted: true });
    }

    const updates = { ...(data || {}) };

    if (updates.selected_players !== undefined) {
      let teamId = updates.county_team_id;
      let existingSelection = null;

      if (selectionId) {
        const existing = await base44.asServiceRole.entities.CountySelection.filter({ id: selectionId });
        existingSelection = existing[0];
        if (!existingSelection) return Response.json({ error: 'Selection not found' }, { status: 404 });
        if (existingSelection.county_id !== countyId) return Response.json({ error: 'Selection does not belong to this county' }, { status: 403 });
        teamId = updates.county_team_id || existingSelection.county_team_id;
      }

      if (teamId) {
        const teamRecord = (await base44.asServiceRole.entities.CountyTeam.filter({ id: teamId }))[0];
        if (teamRecord && teamRecord.team_type !== 'representative') {
          return Response.json({ error: 'Selections can only be made for representative teams' }, { status: 400 });
        }
        if (teamRecord && teamRecord.county_id !== countyId) {
          return Response.json({ error: 'Team does not belong to this county' }, { status: 403 });
        }
      }

      // Any member of the county may be selected — direct members and
      // members of affiliated clubs alike.
      const players = Array.isArray(updates.selected_players) ? updates.selected_players : [];
      if (players.length > 0) {
        const memberEmails = await getAllCountyMemberEmails(base44, countyId);
        const invalid = players.filter(p => !memberEmails.has(p));
        if (invalid.length > 0) {
          return Response.json({ error: `Players are not county members: ${invalid.join(', ')}` }, { status: 400 });
        }
      }
    }

    if (selectionId) {
      await base44.asServiceRole.entities.CountySelection.update(selectionId, updates);
      return Response.json({ success: true });
    } else {
      if (!updates.county_team_id) return Response.json({ error: 'Missing county_team_id for creation' }, { status: 400 });
      const teamRecord = (await base44.asServiceRole.entities.CountyTeam.filter({ id: updates.county_team_id }))[0];
      if (teamRecord) {
        if (teamRecord.team_type !== 'representative') return Response.json({ error: 'Selections can only be made for representative teams' }, { status: 400 });
        if (teamRecord.county_id !== countyId) return Response.json({ error: 'Team does not belong to this county' }, { status: 403 });
        updates.county_id = teamRecord.county_id;
      } else {
        updates.county_id = countyId;
      }
      const created = await base44.asServiceRole.entities.CountySelection.create(updates);
      return Response.json({ success: true, id: created.id, record: created });
    }
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to update selection' }, { status: e.status || 500 });
  }
});