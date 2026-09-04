import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getCountyMembership(base44, userEmail, countyId) {
  const results = await base44.asServiceRole.entities.CountyMembership.filter({
    county_id: countyId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

async function isAuthorized(base44, user, countyId, roles) {
  if (isPlatformAdmin(user)) return true;
  const m = await getCountyMembership(base44, user.email, countyId);
  return m ? roles.includes(m.role) : false;
}

async function verifyBelongsToCounty(base44, entityName, recordId, countyId) {
  const records = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
  if (!records[0]) return null;
  if (records[0].county_id && records[0].county_id !== countyId) return null;
  return records[0];
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity, action, countyId, id, data } = await req.json();

    if (!entity || !action || !countyId) {
      return Response.json({ error: 'Missing required fields: entity, action, countyId' }, { status: 400 });
    }

    // All operations require county admin or secretary (or platform admin)
    const allowed = await isAuthorized(base44, user, countyId, ['admin', 'secretary']);
    if (!allowed) {
      return Response.json({ error: 'Forbidden: must be a county admin or secretary' }, { status: 403 });
    }

    // ── COUNTY TOURNAMENT ──────────────────────────────────────────────────────
    if (entity === 'CountyTournament') {
      if (action === 'create') {
        if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });
        const created = await base44.asServiceRole.entities.CountyTournament.create({ ...data, county_id: countyId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToCounty(base44, 'CountyTournament', id, countyId);
        if (!record) return Response.json({ error: 'Tournament not found or does not belong to this county' }, { status: 404 });
        await base44.asServiceRole.entities.CountyTournament.delete(id);
        return Response.json({ success: true });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToCounty(base44, 'CountyTournament', id, countyId);
        if (!record) return Response.json({ error: 'Tournament not found or does not belong to this county' }, { status: 404 });
        await base44.asServiceRole.entities.CountyTournament.update(id, data);
        return Response.json({ success: true });
      }
    }

    return Response.json({ error: `Unknown entity/action: ${entity}/${action}` }, { status: 400 });
  } catch (error) {
    console.error('updateCountyData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});