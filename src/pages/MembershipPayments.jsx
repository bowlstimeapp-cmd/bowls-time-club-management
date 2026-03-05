import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ShieldAlert, CreditCard, Search, ArrowLeft, TrendingUp } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';

const statusColors = {
  paid:    'bg-emerald-100 text-emerald-700 border border-emerald-200',
  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  failed:  'bg-red-100 text-red-700 border border-red-200',
  refunded:'bg-gray-100 text-gray-600 border border-gray-200',
};

export default function MembershipPayments() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const ms = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return ms[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['membershipPayments', clubId],
    queryFn: () => base44.entities.MembershipPayment.filter({ club_id: clubId }, '-created_date', 200),
    enabled: !!clubId && isAdmin,
  });

  if (user && membership && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-500">Only club admins can view all payments.</p>
        </div>
      </div>
    );
  }

  const filtered = payments.filter(p =>
    p.user_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.user_email?.toLowerCase().includes(search.toLowerCase()) ||
    p.membership_type?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount_pence || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to={createPageUrl('ClubAdmin') + `?clubId=${clubId}`} className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Club Admin
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600 mb-1">Club Administration</p>
              <h1 className="text-3xl font-bold text-slate-900">Membership Payments</h1>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-right">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase">Total Received</span>
              </div>
              <p className="text-2xl font-bold text-slate-900">£{(totalPaid / 100).toFixed(2)}</p>
            </div>
          </div>
        </motion.div>

        <div className="mb-5 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search by name, email or type..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-white border-slate-200 rounded-xl h-9 text-sm"
            />
          </div>
          <p className="text-sm text-slate-400 flex-shrink-0">{filtered.length} payment{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <CreditCard className="w-10 h-10 mx-auto mb-3 text-slate-200" />
            <p className="text-slate-400 font-medium">No payments found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(payment => (
              <motion.div key={payment.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                <div
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(createPageUrl('PaymentDetail') + `?paymentId=${payment.id}&clubId=${clubId}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <CreditCard className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">{payment.user_name || payment.user_email}</p>
                      <p className="text-xs text-slate-400">{payment.user_email}</p>
                      {payment.membership_type && (
                        <p className="text-xs text-slate-500 mt-0.5">{payment.membership_type}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0 pl-13 sm:pl-0">
                    <div className="text-right">
                      <p className="font-bold text-slate-900">£{((payment.amount_pence || 0) / 100).toFixed(2)}</p>
                      <p className="text-xs text-slate-400">
                        {payment.paid_at ? format(parseISO(payment.paid_at), 'd MMM yyyy') : format(parseISO(payment.created_date), 'd MMM yyyy')}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[payment.status] || statusColors.pending}`}>
                      {payment.status?.charAt(0).toUpperCase() + payment.status?.slice(1)}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}