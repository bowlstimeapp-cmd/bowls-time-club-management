import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { generateInvoicesCore, isLastDayOfMonthLondon } from '../../shared/invoiceGeneration.ts';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) { user = null; }
    // Manual invocations require platform admin. Scheduled invocations
    // (no user context) are allowed to proceed — the logic is idempotent.
    if (user && !isPlatformAdmin(user)) {
      return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });
    }

    let body = {};
    try { body = await req.json(); } catch (e) { body = {}; }
    const isTest = body.isTest === true;

    // Real (non-test) scheduled run: only proceed on the last day of the month.
    if (!isTest && !isLastDayOfMonthLondon(new Date())) {
      return Response.json({ message: 'Not the last day of the month — skipping', clubsProcessed: 0, invoicesCreated: 0, invoicesSkipped: 0, details: [] });
    }

    const result = await generateInvoicesCore(base44, isTest);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}