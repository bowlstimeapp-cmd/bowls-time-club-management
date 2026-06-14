import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { endpoint, p256dh, auth } = await req.json();
    if (!endpoint) return Response.json({ error: 'Missing endpoint' }, { status: 400 });

    // Remove any existing subscription for this user
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: user.email });
    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    // Save new subscription
    await base44.asServiceRole.entities.PushSubscription.create({
      user_email: user.email,
      endpoint,
      p256dh: p256dh || '',
      auth: auth || '',
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});