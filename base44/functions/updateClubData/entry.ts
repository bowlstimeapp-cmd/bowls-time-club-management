import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// ---------------------------------------------------------------------------
// Auth helpers (inlined — no local imports in Deno Deploy)
// ---------------------------------------------------------------------------

function isPlatformAdmin(user) { return user?.role === 'admin'; }

async function getClubMembership(base44, userEmail, clubId) {
  const results = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, user_email: userEmail, status: 'approved',
  });
  return results[0] || null;
}

async function hasClubRole(base44, userEmail, clubId, roles) {
  const m = await getClubMembership(base44, userEmail, clubId);
  return m ? roles.includes(m.role) : false;
}

async function isAuthorized(base44, user, clubId, roles) {
  if (isPlatformAdmin(user)) return true;
  return hasClubRole(base44, user.email, clubId, roles);
}

async function verifyBelongsToClub(base44, entityName, recordId, clubId) {
  const records = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
  if (!records[0]) return null;
  if (records[0].club_id && records[0].club_id !== clubId) return null;
  return records[0];
}

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { entity, action, clubId, id, ids, data } = await req.json();

    if (!entity || !action || !clubId) {
      return Response.json({ error: 'Missing required fields: entity, action, clubId' }, { status: 400 });
    }

    // All operations in this function require club admin (or platform admin)
    const allowed = await isAuthorized(base44, user, clubId, ['admin']);
    if (!allowed) {
      return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
    }

    // ── BOOKING ──────────────────────────────────────────────────────────────
    if (entity === 'Booking') {
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'Booking', id, clubId);
        if (!record) return Response.json({ error: 'Booking not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Booking.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'Booking', id, clubId);
        if (!record) return Response.json({ error: 'Booking not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Booking.delete(id);
        return Response.json({ success: true });
      }
      if (action === 'bulk_delete') {
        if (!ids || !Array.isArray(ids)) return Response.json({ error: 'Missing ids array' }, { status: 400 });
        await Promise.all(ids.map(bid => base44.asServiceRole.entities.Booking.delete(bid)));
        return Response.json({ success: true, deleted: ids.length });
      }
    }

    // ── COMPETITION ──────────────────────────────────────────────────────────
    if (entity === 'Competition') {
      if (action === 'create') {
        if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });
        const created = await base44.asServiceRole.entities.Competition.create({ ...data, club_id: clubId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'Competition', id, clubId);
        if (!record) return Response.json({ error: 'Competition not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Competition.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'Competition', id, clubId);
        if (!record) return Response.json({ error: 'Competition not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Competition.delete(id);
        return Response.json({ success: true });
      }
    }

    // ── LEAGUE ───────────────────────────────────────────────────────────────
    if (entity === 'League') {
      if (action === 'create') {
        if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });
        const created = await base44.asServiceRole.entities.League.create({ ...data, club_id: clubId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'League', id, clubId);
        if (!record) return Response.json({ error: 'League not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.League.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'League', id, clubId);
        if (!record) return Response.json({ error: 'League not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.League.delete(id);
        return Response.json({ success: true });
      }
    }

    // ── LEAGUE TEAM ──────────────────────────────────────────────────────────
    if (entity === 'LeagueTeam') {
      if (action === 'create') {
        if (!data) return Response.json({ error: 'Missing data' }, { status: 400 });
        const created = await base44.asServiceRole.entities.LeagueTeam.create({ ...data, club_id: clubId });
        return Response.json({ success: true, id: created.id, record: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'LeagueTeam', id, clubId);
        if (!record) return Response.json({ error: 'Team not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.LeagueTeam.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'LeagueTeam', id, clubId);
        if (!record) return Response.json({ error: 'Team not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.LeagueTeam.delete(id);
        return Response.json({ success: true });
      }
    }

    // ── LEAGUE FIXTURE ───────────────────────────────────────────────────────
    if (entity === 'LeagueFixture') {
      if (action === 'bulk_create') {
        if (!data || !Array.isArray(data)) return Response.json({ error: 'Missing data array' }, { status: 400 });
        const created = await base44.asServiceRole.entities.LeagueFixture.bulkCreate(data);
        return Response.json({ success: true, records: created });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'LeagueFixture', id, clubId);
        if (!record) return Response.json({ error: 'Fixture not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.LeagueFixture.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        await base44.asServiceRole.entities.LeagueFixture.delete(id);
        return Response.json({ success: true });
      }
      if (action === 'bulk_delete') {
        if (!ids || !Array.isArray(ids)) return Response.json({ error: 'Missing ids array' }, { status: 400 });
        await Promise.all(ids.map(fid => base44.asServiceRole.entities.LeagueFixture.delete(fid)));
        return Response.json({ success: true });
      }
    }

    // ── CLUB TOURNAMENT ──────────────────────────────────────────────────────
    if (entity === 'ClubTournament') {
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'ClubTournament', id, clubId);
        if (!record) return Response.json({ error: 'Tournament not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.ClubTournament.delete(id);
        return Response.json({ success: true });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub(base44, 'ClubTournament', id, clubId);
        if (!record) return Response.json({ error: 'Tournament not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.ClubTournament.update(id, data);
        return Response.json({ success: true });
      }
    }

    return Response.json({ error: `Unknown entity/action: ${entity}/${action}` }, { status: 400 });

  } catch (error) {
    console.error('updateClubData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});