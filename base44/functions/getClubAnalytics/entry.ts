import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

function periodKey(dateStr, granularity) {
  if (!dateStr) return null;
  const s = String(dateStr);
  return granularity === 'month' ? s.slice(0, 7) : s.slice(0, 10);
}

function generateBuckets(start, end, granularity) {
  const buckets = [];
  const pad = (n) => String(n).padStart(2, '0');
  if (granularity === 'month') {
    const d = new Date(start.getFullYear(), start.getMonth(), 1);
    const e = new Date(end.getFullYear(), end.getMonth(), 1);
    while (d <= e) {
      buckets.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
      d.setMonth(d.getMonth() + 1);
    }
  } else {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const e = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (d <= e) {
      buckets.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
      d.setDate(d.getDate() + 1);
    }
  }
  return buckets;
}

// Paginate through all matching records (max 5000 per request, loop via skip)
async function fetchAll(base44, entityName, query) {
  const limit = 5000;
  let skip = 0;
  const all = [];
  try {
    while (true) {
      const page = await base44.asServiceRole.entities[entityName].filter(query, '-created_date', limit, skip);
      if (!Array.isArray(page) || page.length === 0) break;
      all.push(...page);
      if (page.length < limit) break;
      skip += limit;
    }
  } catch (e) {
    // Resilient: return whatever was collected if a single entity fails
  }
  return all;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformAdmin(user)) return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });

    const body = await req.json();
    const club_id = body.club_id;
    const granularity = body.granularity === 'month' ? 'month' : 'day';
    if (!club_id) return Response.json({ error: 'club_id is required' }, { status: 400 });

    const clubs = await base44.asServiceRole.entities.Club.filter({ id: club_id });
    const club = clubs[0];
    if (!club) return Response.json({ error: 'Club not found' }, { status: 404 });

    const today = new Date();
    let startDate = club.created_date ? new Date(club.created_date) : new Date();
    if (isNaN(startDate.getTime())) startDate = new Date();

    const buckets = generateBuckets(startDate, today, granularity);
    const seriesMap = new Map();
    for (const key of buckets) {
      seriesMap.set(key, {
        period: key, new_members: 0, bookings: 0, emails_sent: 0, logins: 0,
        messages: 0, admin_actions: 0, competition_entries: 0, league_teams: 0,
        _logins: new Set(),
      });
    }

    let earliest = null;
    const trackEarliest = (d) => { if (d && (!earliest || d < earliest)) earliest = d; };
    const thisMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

    // --- ClubMembership (new members by membership_start_date) ---
    const members = await fetchAll(base44, 'ClubMembership', { club_id });
    let totalActive = 0;
    const statusBreakdown = { approved: 0, pending: 0, rejected: 0 };
    for (const m of members) {
      if (m.member_status === 'active') totalActive++;
      if (m.status && statusBreakdown[m.status] !== undefined) statusBreakdown[m.status]++;
      const d = m.membership_start_date || m.created_date;
      const bk = periodKey(d, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).new_members++;
      trackEarliest(d); trackEarliest(m.created_date);
    }

    // --- Booking (by date) ---
    const bookings = await fetchAll(base44, 'Booking', { club_id });
    for (const b of bookings) {
      const bk = periodKey(b.date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).bookings++;
      trackEarliest(b.date); trackEarliest(b.created_date);
    }

    // --- EmailLog (by created_date) ---
    const emails = await fetchAll(base44, 'EmailLog', { club_id });
    for (const e of emails) {
      const bk = periodKey(e.created_date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).emails_sent++;
      trackEarliest(e.created_date);
    }

    // --- ClubLoginEvent (distinct user_email per bucket by event_date) ---
    const loginEvents = await fetchAll(base44, 'ClubLoginEvent', { club_id });
    const allLoginEmails = new Set();
    for (const l of loginEvents) {
      allLoginEmails.add(l.user_email);
      const bk = periodKey(l.event_date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk)._logins.add(l.user_email);
      trackEarliest(l.event_date); trackEarliest(l.created_date);
    }

    // --- ClubMessage (by created_date) ---
    const messages = await fetchAll(base44, 'ClubMessage', { club_id });
    for (const msg of messages) {
      const bk = periodKey(msg.created_date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).messages++;
      trackEarliest(msg.created_date);
    }

    // --- AuditLog (admin actions, by created_date) ---
    const auditLogs = await fetchAll(base44, 'AuditLog', { club_id });
    for (const a of auditLogs) {
      const bk = periodKey(a.created_date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).admin_actions++;
      trackEarliest(a.created_date);
    }

    // --- CompetitionEntry (by entry_date / created_date) ---
    const compEntries = await fetchAll(base44, 'CompetitionEntry', { club_id });
    let compEntriesThisMonth = 0;
    for (const c of compEntries) {
      const d = c.entry_date || c.created_date;
      const bk = periodKey(d, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).competition_entries++;
      if (periodKey(d, 'month') === thisMonthKey) compEntriesThisMonth++;
      trackEarliest(d);
    }

    // --- LeagueTeam (by created_date) ---
    const leagueTeams = await fetchAll(base44, 'LeagueTeam', { club_id });
    let leagueTeamsThisMonth = 0;
    for (const t of leagueTeams) {
      const bk = periodKey(t.created_date, granularity);
      if (bk && seriesMap.has(bk)) seriesMap.get(bk).league_teams++;
      if (periodKey(t.created_date, 'month') === thisMonthKey) leagueTeamsThisMonth++;
      trackEarliest(t.created_date);
    }

    // --- SmsUsage (already monthly; month_key YYYY-MM) ---
    const smsUsage = await fetchAll(base44, 'SmsUsage', { club_id });
    let smsThisMonth = 0, smsAllTime = 0;
    for (const s of smsUsage) {
      smsAllTime += s.sent_count || 0;
      if (s.month_key === thisMonthKey) smsThisMonth += s.sent_count || 0;
    }

    // Build the flat bucketed series
    const series = buckets.map((key) => {
      const b = seriesMap.get(key);
      return {
        period: b.period,
        new_members: b.new_members,
        bookings: b.bookings,
        emails_sent: b.emails_sent,
        logins: b._logins ? b._logins.size : 0,
        messages: b.messages,
        admin_actions: b.admin_actions,
        competition_entries: b.competition_entries,
        league_teams: b.league_teams,
      };
    });

    const earliestDate = earliest ? String(earliest).slice(0, 10) : (club.created_date ? String(club.created_date).slice(0, 10) : null);

    const summary = {
      total_active_members: totalActive,
      total_members_ever: members.length,
      total_bookings: bookings.length,
      total_emails_sent: emails.length,
      total_distinct_logins: allLoginEmails.size,
      membership_status_breakdown: statusBreakdown,
      messages_total: messages.length,
      sms_sent_this_month: smsThisMonth,
      sms_sent_all_time: smsAllTime,
      league_teams_this_month: leagueTeamsThisMonth,
      league_teams_all_time: leagueTeams.length,
      competition_entries_this_month: compEntriesThisMonth,
      competition_entries_all_time: compEntries.length,
      admin_actions_total: auditLogs.length,
      earliest_date: earliestDate,
    };

    return Response.json({
      granularity,
      club_created_date: club.created_date || null,
      earliest_date: earliestDate,
      series,
      summary,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});