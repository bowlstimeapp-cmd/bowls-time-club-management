import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { countyId, fixtureId } = await req.json();
    if (!countyId || !fixtureId) return Response.json({ error: 'Missing required fields: countyId, fixtureId' }, { status: 400 });

    await requireCountyRole(base44, user, countyId, ['admin', 'secretary']);

    const fixture = (await base44.asServiceRole.entities.CountyLeagueFixture.filter({ id: fixtureId, county_id: countyId }))[0];
    if (!fixture) return Response.json({ error: 'Fixture not found' }, { status: 404 });

    await base44.asServiceRole.entities.CountyLeagueFixture.delete(fixtureId);
    return Response.json({ success: true });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed to delete fixture' }, { status: e.status || 500 });
  }
});