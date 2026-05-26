import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the requesting user is authenticated and a club admin
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId, competitionId, emails } = await req.json();

    if (!clubId || !competitionId || !Array.isArray(emails) || emails.length === 0) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user is a club admin
    const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      user_email: user.email,
      status: 'approved',
    });
    const membership = memberships[0];
    if (!membership || membership.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Club admin access required' }, { status: 403 });
    }

    // Fetch existing entries to avoid duplicates
    const existingEntries = await base44.asServiceRole.entities.CompetitionEntry.filter({
      competition_id: competitionId,
    });
    const existingEmails = new Set(existingEntries.map(e => e.user_email));

    const toAdd = emails.filter(email => !existingEmails.has(email));
    if (toAdd.length === 0) {
      return Response.json({ added: 0, message: 'All selected members are already entered' });
    }

    // Fetch member names
    const allMembers = await base44.asServiceRole.entities.ClubMembership.filter({
      club_id: clubId,
      status: 'approved',
    });
    const memberMap = {};
    allMembers.forEach(m => { memberMap[m.user_email] = m.user_name || m.user_email; });

    // Create entries using service role (bypasses deadline/status restrictions)
    for (const email of toAdd) {
      await base44.asServiceRole.entities.CompetitionEntry.create({
        competition_id: competitionId,
        club_id: clubId,
        user_email: email,
        member_name: memberMap[email] || email,
        team_members: [],
        entry_date: new Date().toISOString(),
      });
    }

    return Response.json({ added: toAdd.length, message: `${toAdd.length} entrant(s) added successfully` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});