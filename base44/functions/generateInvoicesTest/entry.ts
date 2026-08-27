import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { generateInvoicesCore } from '../../shared/invoiceGeneration.ts';

function isPlatformAdmin(user) { return user?.role === 'admin'; }

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!isPlatformAdmin(user)) return Response.json({ error: 'Forbidden: platform admin only' }, { status: 403 });

    const result = await generateInvoicesCore(base44, true);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}