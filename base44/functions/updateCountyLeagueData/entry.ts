import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { requireCountyRole } from '../../shared/countyAuth.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity, action, countyId, id, data } = await req.json();
    if (!entity || !action || !countyId) return Response.json({ error: 'Missing required fields: entity, action, countyId' }, { status: 400 });

    await requireCountyRole(base44, user, countyId, ['admin', 'secretary']);

    // ── CountyLeague ──────────────────────────────────────────────────────
    if (entity === 'CountyLeague') {
      if (action === 'create') {
        if (!data?.name) return Response.json({ error: 'Missing league name' }, { status: 400 });
        const created = await base44.asServiceRole.entities.CountyLeague.create({ ...data, county_id: countyId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const league = (await base44.asServiceRole.entities.CountyLeague.filter({ id, county_id: countyId }))[0];
        if (!league) return Response.json({ error: 'League not found' }, { status: 404 });
        await base44.asServiceRole.entities.CountyLeague.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const league = (await base44.asServiceRole.entities.CountyLeague.filter({ id, county_id: countyId }))[0];
        if (!league) return Response.json({ error: 'League not found' }, { status: 404 });
        await base44.asServiceRole.entities.CountyLeagueFixture.deleteMany({ league_id: id });
        await base44.asServiceRole.entities.CountyLeague.delete(id);
        return Response.json({ success: true });
      }
    }

    // ── CountyCompetition ────────────────────────────────────────────────
    if (entity === 'CountyCompetition') {
      if (action === 'create') {
        if (!data?.name) return Response.json({ error: 'Missing competition name' }, { status: 400 });
        const created = await base44.asServiceRole.entities.CountyCompetition.create({ ...data, county_id: countyId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const comp = (await base44.asServiceRole.entities.CountyCompetition.filter({ id, county_id: countyId }))[0];
        if (!comp) return Response.json({ error: 'Competition not found' }, { status: 404 });
        await base44.asServiceRole.entities.CountyCompetition.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const comp = (await base44.asServiceRole.entities.CountyCompetition.filter({ id, county_id: countyId }))[0];
        if (!comp) return Response.json({ error: 'Competition not found' }, { status: 404 });
        await base44.asServiceRole.entities.CountyCompetition.delete(id);
        return Response.json({ success: true });
      }
    }

    // ── CountyLeagueFixture (simple admin edit — date/venue/teams) ───────
    if (entity === 'CountyLeagueFixture') {
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const fixture = (await base44.asServiceRole.entities.CountyLeagueFixture.filter({ id, county_id: countyId }))[0];
        if (!fixture) return Response.json({ error: 'Fixture not found' }, { status: 404 });
        await base44.asServiceRole.entities.CountyLeagueFixture.update(id, data);
        return Response.json({ success: true });
      }
    }

    return Response.json({ error: `Unknown entity/action: ${entity}/${action}` }, { status: 400 });
  } catch (e) {
    return Response.json({ error: e.message || 'Failed' }, { status: e.status || 500 });
  }
});