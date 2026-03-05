import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

// Called from success page to confirm payment status by polling Stripe session
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paymentId } = await req.json();
  if (!paymentId) {
    return Response.json({ error: 'Missing paymentId' }, { status: 400 });
  }

  const payments = await base44.asServiceRole.entities.MembershipPayment.filter({ id: paymentId });
  const payment = payments[0];
  if (!payment) {
    return Response.json({ error: 'Payment not found' }, { status: 404 });
  }

  // Get club's stripe key
  const clubs = await base44.asServiceRole.entities.Club.filter({ id: payment.club_id });
  const club = clubs[0];
  const stripeKey = club?.stripe_secret_key || Deno.env.get('STRIPE_SECRET_KEY');
  const stripe = new Stripe(stripeKey);

  if (payment.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
    if (session.payment_status === 'paid' && payment.status !== 'paid') {
      await base44.asServiceRole.entities.MembershipPayment.update(paymentId, {
        status: 'paid',
        stripe_payment_intent_id: session.payment_intent,
        paid_at: new Date().toISOString(),
      });
      return Response.json({ status: 'paid' });
    }
  }

  return Response.json({ status: payment.status });
});