import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isPlatformAdminOrHasRole } from '../../shared/countyAuth.ts';
import { getAllCountyMemberEmails } from '../../shared/countyMembers.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { squadId, countyId, data, delete: doDelete } = await req.json();
    if (!countyId) return Response.json({ error: 'Missing required field: countyId' }, { status: 400 });

    const authorized = await isPlatformAdminOrHasRole(base44, user, countyId, ['admin', 'secretary']);
    if (!authorized) return Response.json({ error: 'Forbidden: requires county admin or secretary role' }, { status: 403 });

    // Delete mode
    if (doDelete) {
      if (!squadId) return Response.json({ error: 'Missing squadId for delete' }, { status: 400 });
      const existing = (await base44.asServiceRole.entities.CountySquad.filter({ id: squadId }))[0];
      if (!existing) return Response.json({ error: 'Squad not found' }, { status: 404 });
      if (existing.county_id !== countyId) return Response.json({ error: 'Squad does not belong to this county' }, { status: 403 });
      await base44.asServiceRole.entities.CountySquad.delete(squadId);
      return Response.json({ success: true, deleted: true });
    }

    const updates = { ...(data || {}) };

    // Squad players must be county members (direct or via affiliated clubs)
    if (updates.players !== undefined) {
      const players = Array.isArray(updates.players) ? updates.players : [];
      if (players.length > 0) {
        const memberEmails = await getAllCountyMemberEmails(base44, countyId);
        const invalid = players.filter(p => !memberEmails.has(p));
        if (invalid.length > 0) {
          return Response.json({ error: `Players are not county members: ${invalid.join(', ')}` }, { status: 400 });
        }
      }
    }

    if (squadId) {
      const existing = (await base44.asServiceRole.entities.CountySquad.filter({ id: squadId }))[0];
      if (!existing) return Response.json({ error: 'Squad not found' }, { status: 404 });
      if (existing.county_id !== countyId) return Response.json({ error: 'Squad does not belong to this county' }, { status: 403 });
      delete updates.county_id;
      await base44.asServiceRole.entities.CountySquad.update(squadId, updates);
      return Response.json({ success: true });
    } else {
      if (!updates.name) return Response.json({ error: 'Missing squad name' }, { status: 400 });
      updates.county_id = countyId;
      const created = await base44.asServiceRole.entities.CountySquad.create(updates);
      return Response.json({ success: true, id: created.id, record: created });
    }
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to update squad' }, { status: e.status || 500 });
  }
});