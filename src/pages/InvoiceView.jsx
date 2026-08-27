import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, Loader2, Printer } from 'lucide-react';
import { toast } from 'sonner';

const fmtCurrency = (amount) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount || 0);
const fmtDate = (d) => d ? new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d + 'T00:00:00')) : '—';
const DEFAULT_BRANDING = { business_name: 'Bowls Time', business_address: '' };

export default function InvoiceView() {
  const [searchParams] = useSearchParams();
  const invoiceId = searchParams.get('invoiceId');
  const [user, setUser] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);
  const isPlatformAdmin = user?.role === 'admin';

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: async () => { const list = await base44.entities.Invoice.filter({ id: invoiceId }); return list[0]; },
    enabled: !!invoiceId,
  });

  const { data: branding } = useQuery({
    queryKey: ['invoiceBranding'],
    queryFn: async () => { const list = await base44.entities.InvoiceBranding.list(); return list[0] || null; },
  });

  const [bName, setBName] = useState(DEFAULT_BRANDING.business_name);
  const [bAddress, setBAddress] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('Bowls Time Subscription');
  const [rate, setRate] = useState(2);
  const [memberCount, setMemberCount] = useState(0);
  const [paymentTerms, setPaymentTerms] = useState('20 days');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    const b = branding || DEFAULT_BRANDING;
    setBName(b.business_name || DEFAULT_BRANDING.business_name);
    setBAddress(b.business_address || '');
  }, [branding]);

  useEffect(() => {
    if (invoice) {
      setClientName(invoice.client_name || '');
      setDescription(invoice.description || 'Bowls Time Subscription');
      setRate(invoice.rate ?? 2);
      setMemberCount(invoice.member_count ?? 0);
      setPaymentTerms(invoice.payment_terms || '20 days');
      setDueDate(invoice.due_date || '');
    }
  }, [invoice]);

  const net = (Number(memberCount) * Number(rate)) / 12;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const brandingData = { business_name: bName, business_address: bAddress };
      if (branding?.id) {
        await base44.entities.InvoiceBranding.update(branding.id, brandingData);
      } else {
        await base44.entities.InvoiceBranding.create(brandingData);
      }
      const res = await base44.functions.invoke('updateInvoice', { invoice_id: invoice.id, client_name: clientName, description, rate: Number(rate), member_count: Number(memberCount), payment_terms: paymentTerms, due_date: dueDate });
      if (res.data?.error) throw new Error(res.data.error);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoiceBranding'] });
      queryClient.invalidateQueries({ queryKey: ['allInvoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice saved');
    },
    onError: (err) => toast.error('Failed: ' + (err.message || 'Unknown error')),
  });

  if (!user || isLoading || !invoice) {
    return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div></div>;
  }

  const edit = isPlatformAdmin;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-4 no-print">
          <Button variant="ghost" onClick={() => window.history.back()}><ArrowLeft className="w-4 h-4 mr-2" />Back</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => window.print()}><Printer className="w-4 h-4 mr-2" />Print</Button>
            {edit && <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate()}>{saveMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}Save Changes</Button>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 sm:p-12">
          <div className="flex justify-between items-start mb-8">
            <div className="flex-1">
              {edit ? <Input value={bName} onChange={(e) => setBName(e.target.value)} className="text-2xl font-bold border-0 px-0 h-auto focus-visible:ring-0" /> : <h2 className="text-2xl font-bold">{bName}</h2>}
              {edit ? <Textarea value={bAddress} onChange={(e) => setBAddress(e.target.value)} className="mt-1 text-sm text-slate-600 border-0 px-0 min-h-[80px] focus-visible:ring-0 resize-none" /> : <p className="mt-1 text-sm text-slate-600 whitespace-pre-line">{bAddress}</p>}
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-bold tracking-wide text-slate-900">INVOICE</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Bill To</p>
              {edit ? <Input value={clientName} onChange={(e) => setClientName(e.target.value)} className="font-semibold" /> : <p className="font-semibold">{clientName || '—'}</p>}
              <p className="text-sm text-slate-600 mt-1">Service Period: {fmtDate(invoice.period_start)} – {fmtDate(invoice.period_end)}</p>
            </div>
            <div className="text-right">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <p className="text-slate-400">Invoice number:</p><p className="font-semibold">{invoice.invoice_number}</p>
                <p className="text-slate-400">Invoice date:</p><p className="font-semibold">{fmtDate(invoice.date_issued)}</p>
                <p className="text-slate-400">Due date:</p>{edit ? <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-7 w-36 ml-auto" /> : <p className="font-semibold">{fmtDate(dueDate)}</p>}
                <p className="text-slate-400">Payment terms:</p>{edit ? <Input value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} className="h-7 w-36 ml-auto" /> : <p className="font-semibold">{paymentTerms}</p>}
              </div>
            </div>
          </div>

          <table className="w-full mb-8">
            <thead>
              <tr className="border-b-2 border-slate-200 text-left text-xs font-semibold text-slate-400 uppercase">
                <th className="py-2">Description</th><th className="py-2 text-center">Qty</th><th className="py-2 text-center">Unit</th><th className="py-2 text-right">Rate</th><th className="py-2 text-right">Net</th><th className="py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3">{edit ? <Input value={description} onChange={(e) => setDescription(e.target.value)} className="h-8" /> : <span>{description}</span>}</td>
                <td className="py-3 text-center">1</td>
                <td className="py-3 text-center">{edit ? <Input type="number" value={memberCount} onChange={(e) => setMemberCount(e.target.value)} className="h-8 w-16 mx-auto text-center" /> : <span>{memberCount}</span>}</td>
                <td className="py-3 text-right">{edit ? <Input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className="h-8 w-20 ml-auto text-right" /> : <span>{fmtCurrency(rate)}</span>}</td>
                <td className="py-3 text-right">{fmtCurrency(net)}</td>
                <td className="py-3 text-right font-semibold">{fmtCurrency(net)}</td>
              </tr>
            </tbody>
          </table>

          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-1 text-sm"><span className="text-slate-500">Subtotal</span><span>{fmtCurrency(net)}</span></div>
              <div className="flex justify-between py-1 text-sm border-t border-slate-200 mt-1 pt-1"><span className="font-semibold">Total Due</span><span className="font-bold text-lg">{fmtCurrency(net)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}