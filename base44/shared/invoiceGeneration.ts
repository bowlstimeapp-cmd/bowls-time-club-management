// Shared monthly invoice generation logic — used by both the scheduled
// generateMonthlyInvoices function and the manual generateInvoicesTest function.
//
// "Total active members" matches the Club Analytics dashboard definition:
// ClubMembership records with member_status === 'active' for the club.
//
// Invoice amount = (active_members * 2) / 12, rounded to 2 decimal places.

async function fetchAll(base44, entityName, query) {
  const limit = 5000;
  let skip = 0;
  const all = [];
  while (true) {
    const page = await base44.asServiceRole.entities[entityName].filter(query, '-created_date', limit, skip);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    if (page.length < limit) break;
    skip += limit;
  }
  return all;
}

function pad(n) { return String(n).padStart(2, '0'); }

function londonDateStr(d) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function isLastDayOfMonthLondon(now) {
  const todayStr = londonDateStr(now);
  const [yyyy, mm, dd] = todayStr.split('-').map(Number);
  const today = new Date(yyyy, mm - 1, dd);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getMonth() !== today.getMonth();
}

export async function generateInvoicesCore(base44, isTest) {
  const now = new Date();
  const todayStr = londonDateStr(now);
  const [yyyy, mm] = todayStr.split('-');
  const period_start = `${yyyy}-${mm}-01`;
  const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
  const period_end = `${yyyy}-${mm}-${pad(lastDay)}`;
  const date_issued = todayStr;
  const yyyymm = `${yyyy}${mm}`;

  const clubs = await fetchAll(base44, 'Club', { is_active: true, is_paid_club: true });

  let clubsProcessed = 0;
  let invoicesCreated = 0;
  let invoicesSkipped = 0;
  const details = [];

  for (const club of clubs) {
    clubsProcessed++;
    // Count active members — same definition as the Club Analytics dashboard
    const members = await fetchAll(base44, 'ClubMembership', { club_id: club.id, member_status: 'active' });
    const memberCount = members.length;

    if (memberCount === 0) {
      details.push({ club_id: club.id, club_name: club.name, status: 'skipped', reason: 'no_members', member_count: 0 });
      invoicesSkipped++;
      continue;
    }

    const amount = Math.round((memberCount * 2 / 12) * 100) / 100;

    // Idempotency: skip if an invoice already exists for this club + period + is_test
    const existing = await base44.asServiceRole.entities.Invoice.filter({ club_id: club.id, period_start, is_test: !!isTest });
    if (Array.isArray(existing) && existing.length > 0) {
      details.push({ club_id: club.id, club_name: club.name, status: 'skipped', reason: 'already_exists', member_count: memberCount });
      invoicesSkipped++;
      continue;
    }

    const prefix = isTest ? 'TEST-' : 'INV-';
    const slug = club.slug || club.id;
    const invoice_number = `${prefix}${slug}-${yyyymm}`;

    await base44.asServiceRole.entities.Invoice.create({
      club_id: club.id,
      invoice_number,
      amount,
      period_start,
      period_end,
      date_issued,
      status: 'issued',
      is_test: !!isTest,
    });

    details.push({ club_id: club.id, club_name: club.name, status: 'created', member_count: memberCount, amount, invoice_number });
    invoicesCreated++;
  }

  return { clubsProcessed, invoicesCreated, invoicesSkipped, details, period_start, period_end };
}