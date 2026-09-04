import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json().catch(() => ({}));
    const countyId = body.countyId;
    if (!countyId) return Response.json({ error: 'Missing required field: countyId' }, { status: 400 });

    const counties = await base44.asServiceRole.entities.County.filter({ id: countyId, is_active: true });
    if (!counties[0]) return Response.json({ error: 'County not found or inactive' }, { status: 404 });

    const existing = await base44.asServiceRole.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email });
    if (existing.some(m => m.status === 'approved')) return Response.json({ error: 'You are already an approved member of this county.' }, { status: 400 });
    if (existing.some(m => m.status === 'pending')) return Response.json({ error: 'You already have a pending join request for this county.' }, { status: 400 });

    const created = await base44.asServiceRole.entities.CountyMembership.create({
      county_id: countyId,
      user_email: user.email,
      user_name: user.full_name || [user.first_name, user.surname].filter(Boolean).join(' ') || user.email,
      role: 'member',
      status: 'pending',
    });
    return Response.json({ success: true, membership: created });
  } catch (error) {
    return Response.json({ error: error.message || 'Failed to submit county join request' }, { status: 500 });
  }
}