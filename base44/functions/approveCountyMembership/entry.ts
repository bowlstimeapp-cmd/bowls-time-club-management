import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../countyAuth/entry.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { membershipId } = await req.json().catch(() => ({}));
    if (!membershipId) return Response.json({ error: 'Missing required field: membershipId' }, { status: 400 });
    const memberships = await base44.asServiceRole.entities.CountyMembership.filter({ id: membershipId });
    const membership = memberships[0];
    if (!membership) return Response.json({ error: 'Membership not found' }, { status: 404 });
    await requireCountyRole(base44, user, membership.county_id, ['admin', 'secretary']);
    await base44.asServiceRole.entities.CountyMembership.update(membershipId, { status: 'approved', joined_date: new Date().toISOString().slice(0,10) });
    return Response.json({ success: true, membershipId });
  } catch (error) {
    return Response.json({ error: error.status || 500, message: error.message || 'Failed to approve county membership' }, { status: error.status || 500 });
  }
}