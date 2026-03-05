import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, CheckCircle, Clock, ExternalLink } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

const statusColors = {
  paid:    'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  failed:  'bg-red-100 text-red-700',
  refunded:'bg-gray-100 text-gray-600',
};

export default function PayMembershipFeeCard({ club, clubId, userEmail }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['myPayments', clubId, userEmail],
    queryFn: () => base44.entities.MembershipPayment.filter({ club_id: clubId, user_email: userEmail }, '-created_date', 10),
    enabled: !!clubId && !!userEmail,
  });

  const latestPaid = payments.find(p => p.status === 'paid');
  const latestPayment = payments[0];

  const handlePay = async () => {
    // Check if running in iframe (preview mode)
    if (window.self !== window.top) {
      toast.error('Payments only work from the published app, not in preview mode.');
      return;
    }
    setLoading(true);
    const res = await base44.functions.invoke('createMembershipCheckout', {
      clubId,
      membershipType: latestPayment?.membership_type || '',
      amountPence: club.membership_fee_amount_pence,
      description: club.membership_fee_description || 'Membership Fee',
    });
    const { url } = res.data;
    window.location.href = url;
  };

  if (!club?.membership_fee_enabled) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-600" />
          Membership Fee
        </CardTitle>
        <CardDescription>Pay your club membership fee online</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Latest payment status */}
        {latestPayment ? (
          <div
            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors"
            onClick={() => navigate(createPageUrl('PaymentDetail') + `?paymentId=${latestPayment.id}&clubId=${clubId}`)}
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">
                £{((latestPayment.amount_pence || 0) / 100).toFixed(2)}
                {latestPayment.membership_type && <span className="text-slate-500 font-normal"> · {latestPayment.membership_type}</span>}
              </p>
              <p className="text-xs text-slate-400">
                {latestPayment.paid_at
                  ? format(parseISO(latestPayment.paid_at), 'd MMM yyyy')
                  : format(parseISO(latestPayment.created_date), 'd MMM yyyy')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[latestPayment.status] || statusColors.pending}`}>
                {latestPayment.status?.charAt(0).toUpperCase() + latestPayment.status?.slice(1)}
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No payments on record.</p>
        )}

        {/* Pay button — show if no paid payment exists */}
        {!latestPaid && (
          <Button
            onClick={handlePay}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            {loading ? 'Redirecting to payment...' : `Pay £${((club.membership_fee_amount_pence || 0) / 100).toFixed(2)} Membership Fee`}
          </Button>
        )}

        {latestPaid && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 font-medium">
            <CheckCircle className="w-4 h-4" />
            Membership fee paid
          </div>
        )}
      </CardContent>
    </Card>
  );
}