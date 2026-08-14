import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// setClubAffiliation — platform-admin-only.
// Symmetrically adds or removes a rink-booking affiliation between two clubs.
// Affiliation means each club can see the other's rink bookings and bookings
// clash-detect against each other (shared physical rinks).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });
    }

    const { clubIdA, clubIdB, action } = await req.json();
    if (!clubIdA || !clubIdB || !action) {
      return Response.json({ error: 'Missing required fields: clubIdA, clubIdB, action' }, { status: 400 });
    }
    if (clubIdA === clubIdB) {
      return Response.json({ error: 'Cannot affiliate a club with itself' }, { status: 400 });
    }
    if (action !== 'add' && action !== 'remove') {
      return Response.json({ error: 'action must be "add" or "remove"' }, { status: 400 });
    }

    // Fetch both clubs
    const [clubsA, clubsB] = await Promise.all([
      base44.asServiceRole.entities.Club.filter({ id: clubIdA }),
      base44.asServiceRole.entities.Club.filter({ id: clubIdB }),
    ]);
    const clubA = clubsA[0];
    const clubB = clubsB[0];
    if (!clubA) return Response.json({ error: 'Club A not found' }, { status: 404 });
    if (!clubB) return Response.json({ error: 'Club B not found' }, { status: 404 });

    const aAff = Array.isArray(clubA.affiliated_club_ids) ? clubA.affiliated_club_ids : [];
    const bAff = Array.isArray(clubB.affiliated_club_ids) ? clubB.affiliated_club_ids : [];

    let newAAff, newBAff;
    if (action === 'add') {
      // Add symmetrically, only if not already present
      newAAff = aAff.includes(clubIdB) ? aAff : [...aAff, clubIdB];
      newBAff = bAff.includes(clubIdA) ? bAff : [...bAff, clubIdA];
    } else {
      // Remove symmetrically
      newAAff = aAff.filter(id => id !== clubIdB);
      newBAff = bAff.filter(id => id !== clubIdA);
    }

    // Update both clubs via asServiceRole
    await base44.asServiceRole.entities.Club.update(clubIdA, { affiliated_club_ids: newAAff });
    await base44.asServiceRole.entities.Club.update(clubIdB, { affiliated_club_ids: newBAff });

    return Response.json({
      success: true,
      clubA: { id: clubIdA, name: clubA.name, affiliated_club_ids: newAAff },
      clubB: { id: clubIdB, name: clubB.name, affiliated_club_ids: newBAff },
    });
  } catch (error) {
    console.error('setClubAffiliation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});