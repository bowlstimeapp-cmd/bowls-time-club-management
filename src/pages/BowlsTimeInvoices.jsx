import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { Receipt, ShieldCheck, Eye } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const statusMeta = {
  issued: { label: 'Issued', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border-slate-200' },
};

const fmtDate = (d) => (d ? format(parseISO(d), 'd MMM yyyy') : '—');
const fmtCurrency = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

export default function BowlsTimeInvoices() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const isClubAdmin = (myMembership?.role === 'admin' && myMembership?.status === 'approved') || user?.role === 'admin';

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['invoices', clubId],
    queryFn: () => base44.entities.Invoice.filter({ club_id: clubId }, '-date_issued'),
    enabled: !!clubId && isClubAdmin,
  });

  if (!user || membershipLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-5 w-96 mb-6" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!isClubAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Only Club Admins can view Bowls Time Invoices.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-6 h-6 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900">Bowls Time Invoices</h1>
        </div>
        <p className="text-gray-500 mb-6">Your club's Bowls Time subscription invoices and payment history.</p>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-20">
              <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No invoices yet</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice ID</TableHead>
                  <TableHead>Invoice Amount</TableHead>
                  <TableHead>Invoice Period</TableHead>
                  <TableHead>Date Issued</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>View Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const s = statusMeta[inv.status] || { label: inv.status || 'Issued', className: 'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium text-slate-900">{inv.invoice_number}</TableCell>
                      <TableCell>{fmtCurrency(inv.amount)}</TableCell>
                      <TableCell>{`${fmtDate(inv.period_start)} - ${fmtDate(inv.period_end)}`}</TableCell>
                      <TableCell>{fmtDate(inv.date_issued)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={s.className}>{s.label}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link to={`/InvoiceView?invoiceId=${inv.id}`}>
                          <Button size="sm" variant="outline"><Eye className="w-3.5 h-3.5 mr-1" />View</Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}