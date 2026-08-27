import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformAdmin(user)) return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });

    const body = await req.json();
    const { invoice_id, status } = body;
    if (!invoice_id) return Response.json({ error: 'invoice_id is required' }, { status: 400 });
    if (typeof status !== 'string' || !status.trim()) return Response.json({ error: 'status is required' }, { status: 400 });

    const updated = await base44.asServiceRole.entities.Invoice.update(invoice_id, { status: status.trim() });
    return Response.json({ success: true, invoice: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}