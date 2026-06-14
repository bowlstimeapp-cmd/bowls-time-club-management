import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, keys } = await req.json();

    // Remove existing subscriptions for this user
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: user.id });
    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    await base44.asServiceRole.entities.PushSubscription.create({ user_id: user.id, endpoint, keys });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});