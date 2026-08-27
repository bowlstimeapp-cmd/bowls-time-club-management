import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Receipt, ShieldAlert, Loader2, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
'@/components/ui/alert-dialog';

const statusMeta = {
  issued: { label: 'Issued', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  overdue: { label: 'Overdue', className: 'bg-red-100 text-red-700 border-red-200' },
  cancelled: { label: 'Cancelled', className: 'bg-slate-100 text-slate-600 border-slate-200' }
};

const fmtDate = (d) => d ? format(parseISO(d), 'd MMM yyyy') : '—';
const fmtCurrency = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);

export default function PlatformInvoices() {
  const [user, setUser] = useState(null);
  const [clubFilter, setClubFilter] = useState('all');
  const queryClient = useQueryClient();

  useEffect(() => {base44.auth.me().then(setUser).catch(() => {});}, []);

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ['allInvoices'],
    queryFn: () => base44.entities.Invoice.list('-date_issued', 500)
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['allClubsForInvoices'],
    queryFn: () => base44.entities.Club.list()
  });

  const clubMap = useMemo(() => new Map(clubs.map((c) => [c.id, c.name])), [clubs]);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const deleteMutation = useMutation({
    mutationFn: async (invoice_id) => {
      const res = await base44.functions.invoke('deleteInvoice', { invoice_id });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      toast.success('Invoice deleted');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error('Failed: ' + (err.message || 'Unknown error'))
  });

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Platform admin access required.</p>
          <Link to={createPageUrl('PlatformAdmin')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Platform Admin</Button>
          </Link>
        </div>
      </div>);

  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>);

  }

  const filteredInvoices = clubFilter === 'all' ? invoices : invoices.filter((inv) => inv.club_id === clubFilter);
  const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-6 h-6 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-900">All Invoices</h1>
        </div>
        <p className="text-gray-500 mb-6">Aggregated view of invoices across all clubs.</p>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-600">Filter by Club:</span>
            <Select value={clubFilter} onValueChange={setClubFilter}>
              <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clubs</SelectItem>
                {clubs.map((c) =>
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-4">
            <div className="bg-white rounded-lg border px-4 py-2">
              <p className="text-xs text-gray-500">Invoices</p>
              <p className="text-lg font-bold text-slate-900">{filteredInvoices.length}</p>
            </div>
            <div className="bg-white rounded-lg border px-4 py-2">
              <p className="text-xs text-gray-500">Total amount</p>
              <p className="text-lg font-bold text-slate-900">{fmtCurrency(totalAmount)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {isLoading ?
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div> :
          filteredInvoices.length === 0 ?
          <div className="text-center py-20">
              <Receipt className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No invoices found</p>
            </div> :

          <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice ID</TableHead>
                    <TableHead>Club</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Issued</TableHead>
                    <TableHead>Test</TableHead>
                    <TableHead className="w-[60px]">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                  const s = statusMeta[inv.status] || { label: inv.status || '—', className: 'bg-slate-100 text-slate-600 border-slate-200' };
                  return (
                    <TableRow key={inv.id}>
                        <TableCell className="font-medium text-slate-900 whitespace-nowrap">{inv.invoice_number}</TableCell>
                        <TableCell className="whitespace-nowrap">{clubMap.get(inv.club_id) || inv.club_id || '—'}</TableCell>
                        <TableCell>{fmtCurrency(inv.amount)}</TableCell>
                        <TableCell className="whitespace-nowrap">{`${fmtDate(inv.period_start)} – ${fmtDate(inv.period_end)}`}</TableCell>
                        <TableCell className="whitespace-nowrap">{fmtDate(inv.date_issued)}</TableCell>
                        <TableCell>{inv.is_test ? <Badge className="bg-amber-100 text-amber-700 border-amber-200">Test</Badge> : <span className="text-gray-400 text-xs">No</span>}</TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(inv)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>);

                })}
                </TableBody>
              </Table>
            </div>
          }
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(open) => {if (!open) setDeleteTarget(null);}}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete invoice <span className="font-semibold text-slate-900">{deleteTarget?.invoice_number}</span>. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMutation.isPending}
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                className="bg-red-600 hover:bg-red-700 text-white">
                
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Delete invoice
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>);

}
