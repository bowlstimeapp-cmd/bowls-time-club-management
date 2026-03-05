import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, CreditCard, CheckCircle, Clock, XCircle, RotateCcw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const statusConfig = {
  paid:    { color: 'bg-emerald-100 text-emerald-700', icon: CheckCircle, iconClass: 'text-emerald-500' },
  pending: { color: 'bg-amber-100 text-amber-700',    icon: Clock,        iconClass: 'text-amber-400' },
  failed:  { color: 'bg-red-100 text-red-700',         icon: XCircle,      iconClass: 'text-red-400' },
  refunded:{ color: 'bg-gray-100 text-gray-600',       icon: RotateCcw,    iconClass: 'text-gray-400' },
};

export default function PaymentDetail() {
  const [searchParams] = useSearchParams();
  const paymentId = searchParams.get('paymentId');
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return ms[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const { data: payment, isLoading } = useQuery({
    queryKey: ['payment', paymentId],
    queryFn: async () => {
      const payments = await base44.entities.MembershipPayment.filter({ id: paymentId });
      return payments[0];
    },
    enabled: !!paymentId && !!user,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Payment not found.</p>
      </div>
    );
  }

  // Security: non-admins can only see their own payments
  if (user && !isAdmin && payment.user_email !== user.email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Access denied.</p>
      </div>
    );
  }

  const cfg = statusConfig[payment.status] || statusConfig.pending;
  const StatusIcon = cfg.icon;
  const backUrl = isAdmin
    ? createPageUrl('MembershipPayments') + `?clubId=${clubId}`
    : createPageUrl('Profile') + `?clubId=${clubId}`;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
          <Link to={backUrl} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6">
            <ArrowLeft className="w-4 h-4" /> {isAdmin ? 'Back to Payments' : 'Back to Profile'}
          </Link>

          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center">
                  <CreditCard className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <CardTitle className="text-xl">Payment Details</CardTitle>
                  <p className="text-sm text-slate-500 mt-0.5">{payment.description || payment.membership_type || 'Membership Fee'}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">

              {/* Status banner */}
              <div className={`flex items-center gap-3 p-4 rounded-xl ${cfg.color}`}>
                <StatusIcon className={`w-5 h-5 flex-shrink-0 ${cfg.iconClass}`} />
                <div>
                  <p className="font-semibold capitalize">{payment.status}</p>
                  {payment.paid_at && (
                    <p className="text-xs opacity-75">Paid on {format(parseISO(payment.paid_at), 'd MMMM yyyy, HH:mm')}</p>
                  )}
                </div>
              </div>

              {/* Details grid */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Amount</p>
                  <p className="font-bold text-slate-900 text-lg">£{((payment.amount_pence || 0) / 100).toFixed(2)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">Date</p>
                  <p className="font-semibold text-slate-800">
                    {format(parseISO(payment.paid_at || payment.created_date), 'd MMM yyyy')}
                  </p>
                </div>
                {payment.membership_type && (
                  <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                    <p className="text-slate-400 text-xs mb-1">Membership Type</p>
                    <p className="font-semibold text-slate-800">{payment.membership_type}</p>
                  </div>
                )}
                {isAdmin && (
                  <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                    <p className="text-slate-400 text-xs mb-1">Member</p>
                    <p className="font-semibold text-slate-800">{payment.user_name || payment.user_email}</p>
                    <p className="text-xs text-slate-500">{payment.user_email}</p>
                  </div>
                )}
                {payment.stripe_payment_intent_id && (
                  <div className="bg-slate-50 rounded-xl p-4 col-span-2">
                    <p className="text-slate-400 text-xs mb-1">Stripe Reference</p>
                    <p className="font-mono text-xs text-slate-600 break-all">{payment.stripe_payment_intent_id}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}