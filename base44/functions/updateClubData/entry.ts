import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { entity, action, clubId, id, ids, data } = await req.json();

    if (!entity || !action || !clubId) {
      return Response.json({ error: 'Missing required fields: entity, action, clubId' }, { status: 400 });
    }

    // Verify the caller is an approved admin of this club OR platform admin
    const isPlatformAdmin = user.role === 'admin';
    let isClubAdmin = isPlatformAdmin;
    if (!isPlatformAdmin) {
      const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
        club_id: clubId,
        user_email: user.email,
        role: 'admin',
        status: 'approved',
      });
      isClubAdmin = memberships.length > 0;
    }

    if (!isClubAdmin) {
      return Response.json({ error: 'Forbidden: must be a club admin for this club' }, { status: 403 });
    }

    // Helper: verify a record exists and belongs to this club
    const verifyBelongsToClub = async (entityName, recordId) => {
      const records = await base44.asServiceRole.entities[entityName].filter({ id: recordId });
      if (!records[0]) return null;
      if (records[0].club_id && records[0].club_id !== clubId) return null;
      return records[0];
    };

    // ── BOOKING ──────────────────────────────────────────────────────────────
    if (entity === 'Booking') {
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub('Booking', id);
        if (!record) return Response.json({ error: 'Booking not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Booking.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub('Booking', id);
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
        const record = await verifyBelongsToClub('Competition', id);
        if (!record) return Response.json({ error: 'Competition not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.Competition.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub('Competition', id);
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
        const record = await verifyBelongsToClub('League', id);
        if (!record) return Response.json({ error: 'League not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.League.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub('League', id);
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
        const record = await verifyBelongsToClub('LeagueTeam', id);
        if (!record) return Response.json({ error: 'Team not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.LeagueTeam.update(id, data);
        return Response.json({ success: true });
      }
      if (action === 'delete') {
        if (!id) return Response.json({ error: 'Missing id' }, { status: 400 });
        const record = await verifyBelongsToClub('LeagueTeam', id);
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
        const record = await verifyBelongsToClub('LeagueFixture', id);
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
        const record = await verifyBelongsToClub('ClubTournament', id);
        if (!record) return Response.json({ error: 'Tournament not found or does not belong to this club' }, { status: 404 });
        await base44.asServiceRole.entities.ClubTournament.delete(id);
        return Response.json({ success: true });
      }
      if (action === 'update') {
        if (!id || !data) return Response.json({ error: 'Missing id or data' }, { status: 400 });
        const record = await verifyBelongsToClub('ClubTournament', id);
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