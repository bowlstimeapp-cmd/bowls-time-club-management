import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return Response.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const paymentId = session.metadata?.payment_id;

    if (paymentId) {
      await base44.asServiceRole.entities.MembershipPayment.update(paymentId, {
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent,
        paid_at: new Date().toISOString(),
      });
      console.log(`Payment ${paymentId} marked as paid`);
    }
  }

  if (event.type === 'checkout.session.expired') {
    const session = event.data.object;
    const paymentId = session.metadata?.payment_id;
    if (paymentId) {
      await base44.asServiceRole.entities.MembershipPayment.update(paymentId, { status: 'failed' });
    }
  }

  return Response.json({ received: true });
});