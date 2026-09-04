import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { isPlatformAdminOrHasRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, countyId, clubId, affiliationId } = await req.json();
    if (!action || !countyId) return Response.json({ error: 'Missing action or countyId' }, { status: 400 });

    const authorized = await isPlatformAdminOrHasRole(base44, user, countyId, ['admin', 'secretary']);
    if (!authorized) return Response.json({ error: 'Forbidden: requires admin or secretary role' }, { status: 403 });

    if (action === 'add') {
      if (!clubId) return Response.json({ error: 'Missing clubId' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.ClubCountyAffiliation.filter({ county_id: countyId, club_id: clubId });
      if (existing.length > 0) {
        await base44.asServiceRole.entities.ClubCountyAffiliation.update(existing[0].id, { status: 'approved', requested_by: user.email });
      } else {
        await base44.asServiceRole.entities.ClubCountyAffiliation.create({ county_id: countyId, club_id: clubId, status: 'approved', requested_by: user.email });
      }
      return Response.json({ success: true });
    }

    if (action === 'remove') {
      let id = affiliationId;
      if (!id && clubId) {
        const aff = await base44.asServiceRole.entities.ClubCountyAffiliation.filter({ county_id: countyId, club_id: clubId });
        id = aff[0]?.id;
      }
      if (id) await base44.asServiceRole.entities.ClubCountyAffiliation.delete(id);
      return Response.json({ success: true });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: error.status || 500 });
  }
});