import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformAdmin(user)) return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });

    const body = await req.json();
    const { invoice_id, client_name, description, rate, member_count, payment_terms, due_date } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id is required' }, { status: 400 });

    const update = {};
    if (client_name !== undefined) update.client_name = client_name;
    if (description !== undefined) update.description = description;
    if (rate !== undefined) update.rate = Number(rate);
    if (member_count !== undefined) update.member_count = Number(member_count);
    if (payment_terms !== undefined) update.payment_terms = payment_terms;
    if (due_date !== undefined) update.due_date = due_date;
    if (member_count !== undefined || rate !== undefined) {
      const mc = Number(member_count ?? 0);
      const r = Number(rate ?? 0);
      update.amount = Math.round((mc * r / 12) * 100) / 100;
    }

    const updated = await base44.asServiceRole.entities.Invoice.update(invoice_id, update);
    return Response.json({ success: true, invoice: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}