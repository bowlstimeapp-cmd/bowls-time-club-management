import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { clubId, membershipType, amountPence, currency = 'gbp', description } = await req.json();

  if (!clubId || !amountPence) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Get the club to check for a custom Stripe key
  const clubs = await base44.asServiceRole.entities.Club.filter({ id: clubId });
  const club = clubs[0];
  if (!club) {
    return Response.json({ error: 'Club not found' }, { status: 404 });
  }

  // Use club's own Stripe key if set, else fall back to platform key
  const stripeKey = club.stripe_secret_key || Deno.env.get('STRIPE_SECRET_KEY');
  const stripe = new Stripe(stripeKey);

  // Create a pending payment record first
  const payment = await base44.asServiceRole.entities.MembershipPayment.create({
    club_id: clubId,
    user_email: user.email,
    user_name: user.first_name && user.surname ? `${user.first_name} ${user.surname}` : user.full_name || user.email,
    membership_type: membershipType || '',
    amount_pence: amountPence,
    currency,
    status: 'pending',
    description: description || membershipType || 'Membership Fee',
  });

  const origin = req.headers.get('origin') || 'https://app.base44.com';

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency,
        product_data: {
          name: description || membershipType || 'Membership Fee',
          description: `${club.name} - ${membershipType || 'Membership'}`,
        },
        unit_amount: amountPence,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${origin}/MembershipPaymentSuccess?paymentId=${payment.id}&clubId=${clubId}`,
    cancel_url: `${origin}/Profile?clubId=${clubId}`,
    customer_email: user.email,
    metadata: {
      base44_app_id: Deno.env.get('BASE44_APP_ID'),
      payment_id: payment.id,
      club_id: clubId,
      user_email: user.email,
    },
  });

  // Update payment record with session ID
  await base44.asServiceRole.entities.MembershipPayment.update(payment.id, {
    stripe_session_id: session.id,
  });

  return Response.json({ url: session.url, paymentId: payment.id });
});