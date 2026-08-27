import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const club_id = body.club_id;
    if (!club_id) return Response.json({ error: 'Missing club_id' }, { status: 400 });

    // Use the authenticated user's email (server-side, not client-supplied) to prevent spoofing
    const user_email = user.email;

    // Server-side today's date (YYYY-MM-DD) — never trust client-supplied dates
    const now = new Date();
    const event_date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    // Idempotent: if a record already exists for this user + club + day, do nothing
    const existing = await base44.asServiceRole.entities.ClubLoginEvent.filter({
      club_id, user_email, event_date,
    });
    if (existing.length > 0) {
      return Response.json({ ok: true, already_logged: true });
    }

    await base44.asServiceRole.entities.ClubLoginEvent.create({
      club_id, user_email, event_date,
    });

    return Response.json({ ok: true, created: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});