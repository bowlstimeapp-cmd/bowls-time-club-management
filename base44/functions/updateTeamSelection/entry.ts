import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { hasElevatedSelectorAccess, normEmail } from '../../shared/selectionElevation.ts';

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

function memberDisplayName(m) {
  if (!m) return '';
  return m.first_name && m.surname ? `${m.first_name} ${m.surname}` : (m.user_name || m.user_email || '');
}

/**
 * Per-selection access lists (additional_selectors / additional_live_scorers).
 * Emails are validated against approved, non-left memberships of this club —
 * invalid ones are silently dropped. Each item is rebuilt server-side, keeping
 * granted_by / granted_at for people who already had access.
 */
async function buildAccessList(base44, clubId, emails, existingList, performerEmail) {
  const wanted = [...new Set(
    (Array.isArray(emails) ? emails : [])
      .map((e) => normEmail(typeof e === 'string' ? e : e?.email))
      .filter(Boolean)
  )];
  if (wanted.length === 0) return [];

  const memberships = await base44.asServiceRole.entities.ClubMembership.filter({
    club_id: clubId, status: 'approved',
  });
  const valid = new Map(
    memberships
      .filter((m) => m.user_email && m.member_status !== 'left')
      .map((m) => [normEmail(m.user_email), m])
  );
  const previous = new Map(
    (Array.isArray(existingList) ? existingList : []).map((e) => [normEmail(e?.email), e])
  );
  const now = new Date().toISOString();

  return wanted.filter((email) => valid.has(email)).map((email) => {
    const before = previous.get(email);
    const membership = valid.get(email);
    return {
      email: membership.user_email,
      name: memberDisplayName(membership),
      granted_by_email: before?.granted_by_email || performerEmail,
      granted_at: before?.granted_at || now,
    };
  });
}

/**
 * Audit entries for access granted / revoked, in the same SelectionAuditLog.
 * position is 'additional_selector' or 'additional_live_scorer'.
 */
async function logAccessChanges(base44, user, clubId, selection, position, before, after) {
  const prev = new Map((Array.isArray(before) ? before : []).map((e) => [normEmail(e?.email), e]));
  const next = new Map((Array.isArray(after) ? after : []).map((e) => [normEmail(e?.email), e]));
  const base = {
    club_id: clubId,
    selection_id: selection.id,
    competition: selection.competition || null,
    match_date: selection.match_date || null,
    match_name: selection.match_name || null,
    position,
    performed_by_email: user.email,
    performed_by_name: user.full_name || user.email,
  };
  const entries = [];
  next.forEach((entry, email) => {
    if (prev.has(email)) return;
    entries.push({
      ...base,
      change: 'access_granted',
      member_name: entry.name || entry.email,
      member_email: entry.email,
    });
  });
  prev.forEach((entry, email) => {
    if (next.has(email)) return;
    entries.push({
      ...base,
      change: 'access_revoked',
      member_name: entry.name || entry.email,
      member_email: null,
      previous_member_email: entry.email,
    });
  });
  if (entries.length > 0) {
    await base44.asServiceRole.entities.SelectionAuditLog.bulkCreate(entries);
  }
}

/**
 * Selection audit log — records every player added, removed or replaced via the
 * team sheet dropdowns, attributed to the signed-in selector/admin who saved.
 */
async function logSelectionChanges(base44, user, clubId, selectionId, before, after, data, oldNames = {}) {
  const prevMap = {};
  Object.entries(before || {}).forEach(([k, v]) => { if (v) prevMap[k] = v; });
  const nextMap = {};
  Object.entries(after || {}).forEach(([k, v]) => { if (v) nextMap[k] = v; });
  const newNames = data.selection_names || {};
  const entries = [];
  Object.keys(nextMap).forEach((key) => {
    const prev = prevMap[key];
    if (prev && prev === nextMap[key]) return;
    entries.push({
      club_id: clubId,
      selection_id: selectionId,
      competition: data.competition || null,
      match_date: data.match_date || null,
      match_name: data.match_name || null,
      change: prev ? 'replaced' : 'added',
      position: key,
      member_name: newNames[key] || nextMap[key],
      member_email: nextMap[key],
      previous_member_email: prev || null,
      performed_by_email: user.email,
      performed_by_name: user.full_name || user.email,
    });
  });
  Object.keys(prevMap).forEach((key) => {
    if (nextMap[key]) return;
    entries.push({
      club_id: clubId,
      selection_id: selectionId,
      competition: data.competition || null,
      match_date: data.match_date || null,
      match_name: data.match_name || null,
      change: 'removed',
      position: key,
      member_name: oldNames[key] || prevMap[key],
      member_email: null,
      previous_member_email: prevMap[key],
      performed_by_email: user.email,
      performed_by_name: user.full_name || user.email,
    });
  });
  if (entries.length > 0) {
    await base44.asServiceRole.entities.SelectionAuditLog.bulkCreate(entries);
  }
}

/**
 * Reserve audit logging — records reserve additions, removals and home/away
 * changes in the same SelectionAuditLog used for team sheet changes.
 * Reserve positions are keyed as reserve_${slot}.
 */
async function logReserveChanges(base44, user, clubId, selectionId, before, after, data) {
  const prevMap = new Map(
    (Array.isArray(before) ? before : []).filter(r => r && r.email).map(r => [r.email, r])
  );
  const nextList = (Array.isArray(after) ? after : []).filter(r => r && r.email);
  const nextMap = new Map(nextList.map(r => [r.email, r]));
  const names = data.selection_names || {};
  const entries = [];

  nextList.forEach((r) => {
    const prev = prevMap.get(r.email);
    if (prev && prev.type === r.type) return;
    const key = `reserve_${r.slot}`;
    entries.push({
      club_id: clubId,
      selection_id: selectionId,
      competition: data.competition || null,
      match_date: data.match_date || null,
      match_name: data.match_name || null,
      change: prev ? 'replaced' : 'added',
      position: key,
      member_name: names[key] || r.email,
      member_email: r.email,
      previous_member_email: prev ? r.email : null,
      performed_by_email: user.email,
      performed_by_name: user.full_name || user.email,
    });
  });

  [...prevMap.keys()].forEach((email) => {
    if (nextMap.has(email)) return;
    const prev = prevMap.get(email);
    entries.push({
      club_id: clubId,
      selection_id: selectionId,
      competition: data.competition || null,
      match_date: data.match_date || null,
      match_name: data.match_name || null,
      change: 'removed',
      position: `reserve_${prev.slot}`,
      member_name: names[`reserve_${prev.slot}`] || email,
      member_email: null,
      previous_member_email: email,
      performed_by_email: user.email,
      performed_by_name: user.full_name || user.email,
    });
  });

  if (entries.length > 0) {
    await base44.asServiceRole.entities.SelectionAuditLog.bulkCreate(entries);
  }
}

// ---------------------------------------------------------------------------

/**
 * Secure backend function for TeamSelection create / update / delete.
 * 
 * Authorization model:
 *   create / update — club admin OR club selector (ClubMembership.role)
 *   delete          — club admin only
 *   publish         — club admin or selector
 * 
 * NOTE: RLS on TeamSelection uses user_condition role checks which only look at
 * the global Users.role. This function bypasses that via asServiceRole after
 * verifying the correct ClubMembership.role.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, clubId, selectionId, data } = await req.json();

    if (!action || !clubId) {
      return Response.json({ error: 'Missing required fields: action, clubId' }, { status: 400 });
    }

    const platform = isPlatformAdmin(user);
    const membership = platform ? null : await getClubMembership(base44, user.email, clubId);
    const memberRole = membership?.role;

    const isAdminLevel = platform || memberRole === 'admin';
    const isSelectorLevel = isAdminLevel || memberRole === 'selector';

    if (action === 'create') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!data) return Response.json({ error: 'Missing data for create' }, { status: 400 });
      // Access lists are rebuilt server-side — granted_by / granted_at from the
      // client are never trusted, and only real members of this club survive.
      const payload = {
        ...data,
        club_id: clubId,
        additional_selectors: await buildAccessList(base44, clubId, data.additional_selectors, [], user.email),
        additional_live_scorers: await buildAccessList(base44, clubId, data.additional_live_scorers, [], user.email),
      };
      const created = await base44.asServiceRole.entities.TeamSelection.create(payload);
      await logSelectionChanges(base44, user, clubId, created.id, {}, data.selections, data);
      await logReserveChanges(base44, user, clubId, created.id, [], data.reserves || [], data);
      await logAccessChanges(base44, user, clubId, created, 'additional_selector', [], payload.additional_selectors);
      await logAccessChanges(base44, user, clubId, created, 'additional_live_scorer', [], payload.additional_live_scorers);
      return Response.json({ success: true, id: created.id, record: created });
    }

    if (action === 'update') {
      if (!selectionId || !data) return Response.json({ error: 'Missing selectionId or data' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      // A member granted selector access to THIS selection may edit it, but only
      // until the end of match day and only for as long as the grant exists.
      const elevatedOnly = !isSelectorLevel && hasElevatedSelectorAccess(existing[0], user.email);
      if (!isSelectorLevel && !elevatedOnly) {
        return Response.json({ error: 'Forbidden: requires selector or admin role for this match' }, { status: 403 });
      }
      // An elevated selector can never grant or remove anyone's access.
      let patch = data;
      if (elevatedOnly) {
        const { additional_selectors, additional_live_scorers, ...rest } = data;
        patch = rest;
      }
      await base44.asServiceRole.entities.TeamSelection.update(selectionId, patch);
      await logSelectionChanges(base44, user, clubId, selectionId, existing[0].selections, patch.selections, patch, existing[0].selection_names);
      await logReserveChanges(base44, user, clubId, selectionId, existing[0].reserves || [], patch.reserves || [], patch);
      return Response.json({ success: true });
    }

    // Full replacement of this selection's extra access lists. Role only —
    // an elevated selector can never call this.
    if (action === 'set_elevated_access') {
      if (!isSelectorLevel) {
        return Response.json({ error: 'Forbidden: requires selector or admin role' }, { status: 403 });
      }
      if (!selectionId) return Response.json({ error: 'Missing selectionId' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      const selection = existing[0];
      if (!selection || selection.club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      const nextSelectors = await buildAccessList(
        base44, clubId, data?.additional_selectors, selection.additional_selectors, user.email
      );
      const nextScorers = await buildAccessList(
        base44, clubId, data?.additional_live_scorers, selection.additional_live_scorers, user.email
      );
      await base44.asServiceRole.entities.TeamSelection.update(selectionId, {
        additional_selectors: nextSelectors,
        additional_live_scorers: nextScorers,
      });
      await logAccessChanges(base44, user, clubId, selection, 'additional_selector', selection.additional_selectors, nextSelectors);
      await logAccessChanges(base44, user, clubId, selection, 'additional_live_scorer', selection.additional_live_scorers, nextScorers);
      return Response.json({
        success: true,
        additional_selectors: nextSelectors,
        additional_live_scorers: nextScorers,
      });
    }

    if (action === 'move_bookings') {
      const { oldRinks, newRinks, bookingDate, startTime, endTime } = data || {};
      if (!selectionId || !Array.isArray(oldRinks) || !Array.isArray(newRinks)) {
        return Response.json({ error: 'Missing selectionId, oldRinks or newRinks' }, { status: 400 });
      }
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      if (!isSelectorLevel && !hasElevatedSelectorAccess(existing[0], user.email)) {
        return Response.json({ error: 'Forbidden: requires selector or admin role for this match' }, { status: 403 });
      }
      const date = bookingDate || existing[0].match_date;
      const start = startTime || existing[0].match_start_time;
      const end = endTime || existing[0].match_end_time || start;
      if (!date || !start) {
        return Response.json({ success: true, moved: 0, cancelled: 0, blocked: [] });
      }

      const oldSet = new Set(oldRinks.map(Number));
      const dayBookings = await base44.asServiceRole.entities.Booking.filter({ club_id: clubId, date });

      // Bookings created for this match by the app (Selection Editor "Book Rinks"
      // or the Fixtures module), still active, on a previously selected rink,
      // starting within the match window.
      const linked = dayBookings.filter(b =>
        (b.admin_notes === '__selection__' || b.admin_notes === '__fixture__') &&
        b.status !== 'cancelled' && b.status !== 'rejected' &&
        oldSet.has(b.rink_number) &&
        b.start_time >= start && b.start_time < end
      );
      if (linked.length === 0) {
        return Response.json({ success: true, moved: 0, cancelled: 0, blocked: [] });
      }

      // Positional mapping: sorted old rinks -> sorted new rinks. Old rinks with
      // no corresponding new rink (rink count reduced) get their bookings cancelled.
      const oldSorted = [...oldSet].sort((a, b) => a - b);
      const newSorted = [...new Set(newRinks.map(Number))].filter(n => !isNaN(n)).sort((a, b) => a - b);
      const rinkMap = new Map();
      oldSorted.forEach((r, i) => rinkMap.set(r, i < newSorted.length ? newSorted[i] : null));

      const active = dayBookings.filter(b => b.status !== 'cancelled' && b.status !== 'rejected');
      const movedIds = new Set();
      let moved = 0, cancelled = 0;
      const blocked = [];
      for (const b of linked) {
        const target = rinkMap.get(Number(b.rink_number));
        if (target === undefined || target === b.rink_number) continue;
        if (target === null) {
          await base44.asServiceRole.entities.Booking.update(b.id, { status: 'cancelled' });
          movedIds.add(b.id);
          cancelled++;
          continue;
        }
        // Target rink must be free for this booking's time slot
        const clash = active.find(x =>
          x.id !== b.id && !movedIds.has(x.id) &&
          x.rink_number === target &&
          x.start_time < (b.end_time || end) && (x.end_time || end) > b.start_time
        );
        if (clash) { blocked.push({ from: b.rink_number, to: target }); continue; }
        await base44.asServiceRole.entities.Booking.update(b.id, { rink_number: target });
        movedIds.add(b.id);
        moved++;
      }
      return Response.json({ success: true, moved, cancelled, blocked });
    }

    if (action === 'delete') {
      if (!isAdminLevel) {
        return Response.json({ error: 'Forbidden: only club admins can delete selections' }, { status: 403 });
      }
      if (!selectionId) return Response.json({ error: 'Missing selectionId' }, { status: 400 });
      const existing = await base44.asServiceRole.entities.TeamSelection.filter({ id: selectionId });
      if (!existing[0] || existing[0].club_id !== clubId) {
        return Response.json({ error: 'Selection not found or does not belong to this club' }, { status: 404 });
      }
      await base44.asServiceRole.entities.TeamSelection.delete(selectionId);
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });

  } catch (error) {
    console.error('updateTeamSelection error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});