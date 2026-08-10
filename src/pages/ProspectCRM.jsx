import React, { useState, useEffect, useMemo, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldAlert, Search, Plus, Pencil, Trash2, ArrowLeft, Users,
  Phone, Mail, Globe, MapPin, CheckCircle, XCircle, Clock,
  Star, PhoneCall, RefreshCw, Loader2, Download, Upload, Filter,
  Send, FileText, MailCheck, Eye, History
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmailPreview from '@/components/prospect/EmailPreview';

const STATUS_CONFIG = {
  not_contacted: { label: 'Not Contacted', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PhoneCall },
  email_sent: { label: 'Email Sent', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', icon: MailCheck },
  follow_up: { label: 'Follow Up', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: RefreshCw },
  interested: { label: 'Interested', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Star },
  not_interested: { label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  signed_up: { label: 'Signed Up', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle },
};

const EMAIL_STATUS_STYLES = {
  queued: 'bg-gray-100 text-gray-600 border-gray-200',
  sent: 'bg-gray-100 text-gray-600 border-gray-200',
  delivered: 'bg-blue-100 text-blue-700 border-blue-200',
  opened: 'bg-green-100 text-green-700 border-green-200',
  clicked: 'bg-purple-100 text-purple-700 border-purple-200',
  bounced: 'bg-red-100 text-red-700 border-red-200',
  complained: 'bg-red-100 text-red-700 border-red-200',
  delivery_delayed: 'bg-amber-100 text-amber-700 border-amber-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const EMPTY_FORM = {
  club_name: '', address: '', town: '', county: '', postcode: '', email: '', phone: '',
  website: '', play_bowls_url: '', directory_source_url: '',
  contact_name: '', confidence: '',
  primary_email: '', where_to_find_us_email: '', website_email: '', directory_email: '', final_recommended_email: '',
  validation_status: '', validation_notes: '', data_source: '', last_updated: '', last_validated: '',
  source: 'play-bowls.com', contact_status: 'not_contacted', notes: '', last_contacted_date: ''
};

const VALID_STATUS_KEYS = ['not_contacted', 'contacted', 'email_sent', 'follow_up', 'interested', 'not_interested', 'signed_up'];

const isValidEmail = (e) => /^[^\s]+@[^\s]+\.[^\s]+$/.test(e) && !e.startsWith('.');

const parseCsvLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (char === ',' && !inQuotes) {
      result.push(current); current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
};

const DEFAULT_TEMPLATE = {
  subject: 'Introducing BowlsTime – Modern Club Management for {{club_name}}',
  body: `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:-apple-system,Helvetica,Arial,sans-serif;line-height:1.6;color:#1f2937;margin:0;padding:0;background-color:#f1f5f2">
<div style="max-width:640px;margin:0 auto;padding:24px 16px">

<div style="text-align:left;margin-bottom:20px">
<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png" alt="BowlsTime" width="150" style="display:block;border:0;height:auto" />
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#059669 0%,#10b981 50%,#0d9488 100%);border-radius:12px 12px 0 0">
<tbody><tr>
<td style="padding:40px 36px;text-align:center">
<h1 style="color:#ffffff;margin:0 0 10px;font-size:26px;line-height:1.3">Club Management Made Easy for {{club_name}}</h1>
<p style="color:#ffffff;margin:0;font-size:16px">The modern, all-in-one platform built specifically for bowls clubs.</p>
</td>
</tr></tbody>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px">
<tbody><tr>
<td style="padding:36px">

<p style="font-size:16px;margin:0 0 18px">Good Afternoon {{contact_name}},</p>

<p style="font-size:15px;margin:0 0 18px;color:#334155">
I wanted to introduce BowlsTime to {{club_name}} in case you have not come across it before — a modern, bowls-specific system for club admin, communication, fixtures and member information.
</p>

<p style="font-size:15px;margin:0 0 24px;color:#334155">
BowlsTime gives your club a clear, low-risk way to modernise how you manage rink bookings, team selections, leagues and member communication — all in one place, designed specifically for bowls.
</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 24px">
<tbody><tr>
<td style="text-align:center">
<a href="https://www.bowls-time.com" style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#10b981 50%,#0d9488 100%);color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;padding:12px 28px;border-radius:8px">Find Out More →</a>
</td>
</tr></tbody>
</table>

<h2 style="font-size:18px;color:#111827;margin:0 0 4px">Simple, per-member pricing</h2>
<p style="font-size:14px;color:#64748b;margin:0 0 18px">Everything included — no modules, no upgrade tiers.</p>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px">
<tbody><tr>
<td width="100%" valign="top" style="background:linear-gradient(160deg,#10b981 0%,#059669 100%);border-radius:14px;padding:26px 20px;text-align:center">
<span style="display:inline-block;background:rgba(255,255,255,0.2);color:#ffffff;font-size:12px;font-weight:bold;padding:4px 12px;border-radius:999px;margin-bottom:10px">BowlsTime</span>
<div style="font-size:30px;font-weight:800;color:#ffffff;line-height:1">£2<span style="font-size:13px;font-weight:500;opacity:0.85">/member/year</span></div>
<p style="font-size:12px;color:#ffffff;opacity:0.92;margin:10px 0 0">All features included. No optional modules, no surprise fees.</p>
</td>
</tr></tbody>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f9fafb;border-radius:12px;margin:0 0 32px">
<tbody><tr>
<td style="padding:26px 28px;text-align:center">
<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 8px;line-height:1.5">“BowlsTime has transformed how our club manages everything — from rink bookings to team selections, it is all in one place.”</p>
<span style="font-size:13px;color:#64748b">Club Secretary, existing BowlsTime club</span>
</td>
</tr></tbody>
</table>

<h2 style="font-size:18px;color:#111827;margin:0 0 18px">Why clubs choose BowlsTime</h2>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 32px">
<tbody>
<tr>
<td width="28" valign="top" style="padding:0 12px 18px 0"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:22px">✓</span></td>
<td valign="top" style="padding:0 0 18px"><b style="font-size:14px;color:#111827">A real mobile app</b><br><span style="font-size:13px;color:#64748b">Dedicated iOS and Android apps for your members, with instant push notifications for fixtures and team changes.</span></td>
</tr>
<tr>
<td width="28" valign="top" style="padding:0 12px 18px 0"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:22px">✓</span></td>
<td valign="top" style="padding:0 0 18px"><b style="font-size:14px;color:#111827">Built and supported in-house</b><br><span style="font-size:13px;color:#64748b">Designed, built and supported by our UK team — no outsourced support desk.</span></td>
</tr>
<tr>
<td width="28" valign="top" style="padding:0 12px 18px 0"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:22px">✓</span></td>
<td valign="top" style="padding:0 0 18px"><b style="font-size:14px;color:#111827">Everything included</b><br><span style="font-size:13px;color:#64748b">One simple price. Rink booking, team selection, leagues, competitions, member directory — all included.</span></td>
</tr>
<tr>
<td width="28" valign="top" style="padding:0 12px 18px 0"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:22px">✓</span></td>
<td valign="top" style="padding:0 0 18px"><b style="font-size:14px;color:#111827">Easy migration support</b><br><span style="font-size:13px;color:#64748b">Import your members and fixtures with a simple CSV upload — no starting from scratch.</span></td>
</tr>
<tr>
<td width="28" valign="top" style="padding:0 12px 18px 0"><span style="display:inline-block;width:22px;height:22px;border-radius:50%;background-color:#10b981;color:#ffffff;font-size:13px;font-weight:bold;text-align:center;line-height:22px">✓</span></td>
<td valign="top" style="padding:0 0 18px"><b style="font-size:14px;color:#111827">Modern member communication</b><br><span style="font-size:13px;color:#64748b">Email and push notifications, with targeted messages for teams and groups.</span></td>
</tr>
</tbody>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:linear-gradient(135deg,#10b981 0%,#059669 100%);border-radius:10px;margin:0 0 32px">
<tbody><tr>
<td style="padding:20px;text-align:center">
<p style="color:#ffffff;margin:0;font-size:16px;font-weight:bold">Ready to see BowlsTime in action?</p>
<p style="color:#ffffff;margin:4px 0 0;font-size:13px">Book a free demo and we will get you set up.</p>
</td>
</tr></tbody>
</table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
<tbody><tr>
<td style="text-align:center;padding:0 0 8px">
<a href="https://www.bowls-time.com" style="display:inline-block;background:linear-gradient(135deg,#059669 0%,#10b981 50%,#0d9488 100%);color:#ffffff;text-decoration:none;font-size:16px;font-weight:bold;padding:15px 34px;border-radius:8px">Book Your Free Demo →</a>
</td>
</tr></tbody>
</table>
<p style="text-align:center;font-size:12px;color:#64748b;margin:8px 0 0">Or just reply to this email and I will get something in the diary.</p>

</td>
</tr></tbody>
</table>

<table cellpadding="0" cellspacing="0" border="0" style="font-size:14px;line-height:1.4;color:#0b2b22;padding-top:2px;margin-top:28px;width:100%">
<tbody><tr>
<td style="padding:0 14px 0 0;vertical-align:middle">
<img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6995ed6ffddbd0f64bc9d1e8/61b3b45da_BTZoomed.png" alt="BowlsTime" width="120" style="display:block;border:0;outline:none;height:auto" />
</td>
<td style="border-left:2px solid #10b981;padding:0 0 0 14px;vertical-align:middle">
<div style="font-size:16px;font-weight:700">BowlsTime</div>
<div>Club Management Platform</div>
<div><span style="font-weight:700">W:</span> <a href="https://www.bowls-time.com" style="color:#0b2b22">www.bowls-time.com</a></div>
<div style="margin-top:8px;font-size:12px;color:#3e5d53">Book rinks. Track leagues. Grow the game.</div>
</td>
</tr></tbody>
</table>

</div>
</body>
</html>`
};

const SAMPLE_PROSPECT = { club_name: 'Springfield Bowls Club', contact_name: 'Club Secretary', county: 'Hampshire', town: 'Springfield' };

export default function ProspectCRM() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [emailStatusFilter, setEmailStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ subject: '', body: '' });
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailCc, setEmailCc] = useState('');
  const [visibleCount, setVisibleCount] = useState(50);
  const [templatePreviewMode, setTemplatePreviewMode] = useState(false);
  const [sendPreviewMode, setSendPreviewMode] = useState(false);
  const [refreshingStatusId, setRefreshingStatusId] = useState(null);
  const [refreshingAllStatuses, setRefreshingAllStatuses] = useState(false);
  const [allStatusProgress, setAllStatusProgress] = useState({ processed: 0, total: 0 });
  const [backfilling, setBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState(null);
  const [enriching, setEnriching] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState({ processed: 0, total: 0 });
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ sent: 0, skipped: 0, failed: 0, total: 0, batch: 0, totalBatches: 0, waiting: false, waitSeconds: 0, failures: [] });
  const bulkCancelRef = useRef(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  useEffect(() => {
    (async () => {
      setTemplateLoading(true);
      try {
        const existing = await base44.entities.EmailTemplate.filter({ template_key: 'prospect_outreach' });
        if (existing[0]) {
          setEmailTemplate({ subject: existing[0].subject || DEFAULT_TEMPLATE.subject, body: existing[0].body || DEFAULT_TEMPLATE.body });
        }
      } catch { /* fall back to default */ }
      setTemplateLoading(false);
    })();
  }, []);

  useEffect(() => { setVisibleCount(50); }, [search, statusFilter, emailStatusFilter]);

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ['prospects'],
    queryFn: () => base44.entities.ProspectClub.list('-created_date'),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ProspectClub.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prospects'] }); setDialogOpen(false); toast.success('Prospect added'); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ProspectClub.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prospects'] }); setDialogOpen(false); toast.success('Prospect updated'); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.ProspectClub.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['prospects'] }); toast.success('Prospect removed'); },
  });

  const quickStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.ProspectClub.update(id, {
      contact_status: status,
      last_contacted_date: ['contacted', 'email_sent', 'follow_up', 'interested', 'not_interested'].includes(status)
        ? new Date().toISOString().split('T')[0] : undefined
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  const handleRefreshStatus = async (prospectId) => {
    setRefreshingStatusId(prospectId);
    try {
      const result = await base44.functions.invoke('refreshProspectEmailStatus', { prospectId });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`Status: ${result.email_status || 'updated'}`);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Unknown error';
      toast.error('Failed to refresh status: ' + msg);
    }
    setRefreshingStatusId(null);
  };

  const handleRefreshAllStatuses = async () => {
    const withIds = prospects.filter(p => p.resend_email_id);
    if (withIds.length === 0) {
      toast.info('No prospects with sent emails to refresh');
      return;
    }
    setRefreshingAllStatuses(true);
    setAllStatusProgress({ processed: 0, total: withIds.length });
    let success = 0;
    let errors = 0;
    for (let i = 0; i < withIds.length; i++) {
      try {
        await base44.functions.invoke('refreshProspectEmailStatus', { prospectId: withIds[i].id });
        success++;
      } catch (e) {
        errors++;
      }
      setAllStatusProgress({ processed: i + 1, total: withIds.length });
    }
    queryClient.invalidateQueries({ queryKey: ['prospects'] });
    setRefreshingAllStatuses(false);
    if (errors > 0) {
      toast.success(`Refreshed ${success} statuses (${errors} failed)`);
    } else {
      toast.success(`Refreshed all ${success} email statuses`);
    }
  };

  const handleBackfillEmailStatus = async () => {
    setBackfilling(true);
    try {
      const result = await base44.functions.invoke('backfillProspectEmailStatus', {});
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      setBackfillResult(result);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || 'Unknown error';
      toast.error('Backfill failed: ' + msg);
    }
    setBackfilling(false);
  };

  // Stats — must be before any conditional return
  const stats = useMemo(() => {
    const total = prospects.length;
    const byStatus = {};
    for (const s of Object.keys(STATUS_CONFIG)) {
      byStatus[s] = prospects.filter(p => p.contact_status === s).length;
    }
    return { total, ...byStatus };
  }, [prospects]);

  const emailStatusStats = useMemo(() => {
    const counts = {};
    let none = 0;
    for (const p of prospects) {
      if (!p.email_status) none++;
      else counts[p.email_status] = (counts[p.email_status] || 0) + 1;
    }
    return { none, ...counts };
  }, [prospects]);

  const filtered = useMemo(() => prospects.filter(p => {
    const matchSearch = !search ||
      p.club_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.county?.toLowerCase().includes(search.toLowerCase()) ||
      p.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.contact_status === statusFilter;
    const matchEmailStatus = emailStatusFilter === 'all' ||
      (emailStatusFilter === 'none' ? !p.email_status : p.email_status === emailStatusFilter);
    return matchSearch && matchStatus && matchEmailStatus;
  }), [prospects, search, statusFilter, emailStatusFilter]);

  const visibleProspects = filtered.slice(0, visibleCount);

  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <Link to={createPageUrl('ClubSelector')}><Button>Go Home</Button></Link>
        </div>
      </div>
    );
  }

  const openCreate = () => { setEditingProspect(null); setFormData(EMPTY_FORM); setDialogOpen(true); };
  const openEdit = (p) => { setEditingProspect(p); setFormData({ ...EMPTY_FORM, ...p }); setDialogOpen(true); };

  const fillTemplate = (template, prospect) => {
    const replace = (str) => str
      .replace(/{{club_name}}/g, prospect.club_name || '')
      .replace(/{{contact_name}}/g, prospect.contact_name || 'Club Secretary')
      .replace(/{{county}}/g, prospect.county || '')
      .replace(/{{town}}/g, prospect.town || '');
    return { subject: replace(template.subject), body: replace(template.body) };
  };

  const openEmail = (p) => {
    setEmailTarget(p);
    const allEmails = [
      ...(p.all_emails || []),
      p.email, p.primary_email, p.where_to_find_us_email,
      p.website_email, p.directory_email, p.final_recommended_email
    ].filter(Boolean).map(e => e.trim()).filter(isValidEmail)
     .filter((v, i, a) => a.map(x => x.toLowerCase()).indexOf(v.toLowerCase()) === i);
    setEmailRecipient(allEmails.join('; '));
    setEmailCc('');
    setEmailPreview(fillTemplate(emailTemplate, p));
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailRecipient.trim()) { toast.error('Please enter a recipient email address'); return; }
    if (!emailTarget?.id) { toast.error('No prospect selected'); return; }
    setSendingEmail(true);
    try {
      await base44.functions.invoke('sendProspectEmail', {
        prospectId: emailTarget.id,
        to: emailRecipient.trim(),
        cc: emailCc.trim(),
        subject: emailPreview.subject,
        body: emailPreview.body,
      });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`Email sent${emailCc.trim() ? ' (with CC)' : ''}`);
      setEmailDialogOpen(false);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.error || e?.message || String(e) || 'Unknown error';
      toast.error('Failed to send email: ' + msg);
    }
    setSendingEmail(false);
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  const startBulkSend = async () => {
    setBulkConfirmOpen(false);
    const notContacted = prospects.filter(p => p.contact_status === 'not_contacted');
    const sentEmails = new Set();
    const targets = notContacted.map(p => {
      const allEmails = [
        ...(p.all_emails || []),
        p.email, p.primary_email, p.where_to_find_us_email,
        p.website_email, p.directory_email, p.final_recommended_email
      ].filter(Boolean).map(e => e.trim())
       .filter(isValidEmail)
       .filter((v, i, a) => a.map(x => x.toLowerCase()).indexOf(v.toLowerCase()) === i);
      const uniqueEmails = allEmails.filter(e => !sentEmails.has(e.toLowerCase()));
      uniqueEmails.forEach(e => sentEmails.add(e.toLowerCase()));
      return { prospect: p, email: uniqueEmails.join('; ') };
    }).filter(t => t.email);

    const skipped = notContacted.length - targets.length;
    const BATCH_SIZE = 20;
    const totalBatches = Math.ceil(targets.length / BATCH_SIZE);

    setBulkSending(true);
    bulkCancelRef.current = false;
    setBulkProgress({ sent: 0, skipped, failed: 0, total: targets.length, batch: 0, totalBatches, waiting: false, waitSeconds: 0, failures: [] });

    let sent = 0;
    let failed = 0;
    const failures = [];

    for (let i = 0; i < targets.length; i += BATCH_SIZE) {
      if (bulkCancelRef.current) break;
      const batch = targets.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      setBulkProgress(prev => ({ ...prev, batch: batchNum, waiting: false }));

      for (const target of batch) {
        if (bulkCancelRef.current) break;
        const filled = fillTemplate(emailTemplate, target.prospect);
        try {
          await base44.functions.invoke('sendProspectEmail', {
            prospectId: target.prospect.id,
            to: target.email,
            cc: '',
            subject: filled.subject,
            body: filled.body,
          });
          sent++;
        } catch (e) {
          failed++;
          const reason = e?.message || e?.error || String(e) || 'Unknown error';
          failures.push({ club: target.prospect.club_name, email: target.email, reason });
        }
        setBulkProgress(prev => ({ ...prev, sent, failed, failures }));
      }

      queryClient.invalidateQueries({ queryKey: ['prospects'] });

      if (i + BATCH_SIZE < targets.length && !bulkCancelRef.current) {
        setBulkProgress(prev => ({ ...prev, waiting: true, waitSeconds: 30 }));
        for (let s = 30; s > 0; s--) {
          if (bulkCancelRef.current) break;
          setBulkProgress(prev => ({ ...prev, waitSeconds: s }));
          await sleep(1000);
        }
        setBulkProgress(prev => ({ ...prev, waiting: false, waitSeconds: 0 }));
      }
    }

    setBulkSending(false);
    queryClient.invalidateQueries({ queryKey: ['prospects'] });
    if (sent > 0) {
      toast.success(`Bulk send complete: ${sent} sent, ${failed} failed, ${skipped} skipped (no email or duplicate)`);
    } else {
      toast.info(`Bulk send stopped: ${sent} sent, ${failed} failed, ${skipped} skipped`);
    }
  };

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    try {
      const user = await base44.auth.me();
      const existing = await base44.entities.EmailTemplate.filter({ template_key: 'prospect_outreach' });
      if (existing[0]) {
        await base44.entities.EmailTemplate.update(existing[0].id, {
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          updated_by: user?.email || '',
        });
      } else {
        await base44.entities.EmailTemplate.create({
          template_key: 'prospect_outreach',
          subject: emailTemplate.subject,
          body: emailTemplate.body,
          updated_by: user?.email || '',
        });
      }
      toast.success('Template saved');
      setTemplateDialogOpen(false);
    } catch (e) {
      toast.error('Failed to save template: ' + e.message);
    }
    setTemplateSaving(false);
  };

  const handleSave = () => {
    if (!formData.club_name.trim()) { toast.error('Club name is required'); return; }
    if (editingProspect) {
      updateMutation.mutate({ id: editingProspect.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleScrape = async () => {
    setScraping(true);
    try {
      const response = await base44.functions.invoke('scrapePlayBowlsClubs', {});
      const clubs = response.data?.clubs || [];
      if (clubs.length === 0) {
        toast.info('No new clubs found. The site may require interaction to load clubs. Try importing via CSV instead.');
      } else {
        await base44.entities.ProspectClub.bulkCreate(clubs);
        queryClient.invalidateQueries({ queryKey: ['prospects'] });
        toast.success(`Imported ${clubs.length} clubs`);
      }
    } catch (e) {
      toast.error('Could not fetch clubs automatically. Please add them manually or import via CSV.');
    }
    setScraping(false);
  };

  const handleEnrichContacts = async () => {
    setEnriching(true);
    const needsEnrichment = prospects.filter(p => !p.enriched);
    setEnrichProgress({ processed: 0, total: needsEnrichment.length });
    if (needsEnrichment.length === 0) {
      toast.info('All clubs have already been enriched');
      setEnriching(false);
      return;
    }
    for (let i = 0; i < needsEnrichment.length; i += 5) {
      const batch = needsEnrichment.slice(i, i + 5).map(p => p.id);
      try {
        await base44.functions.invoke('enrichProspectContacts', { clubIds: batch });
        setEnrichProgress({ processed: Math.min(i + 5, needsEnrichment.length), total: needsEnrichment.length });
        queryClient.invalidateQueries({ queryKey: ['prospects'] });
      } catch (e) {
        toast.error('Enrichment error: ' + (e?.message || 'Unknown error'));
        break;
      }
    }
    setEnriching(false);
    toast.success('Contact enrichment complete');
  };

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
      const records = lines.slice(1).map(line => {
        const vals = parseCsvLine(line);
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim(); });
        const csvStatusRaw = (obj.status || obj.contact_status || '').toLowerCase().trim().replace(/\s+/g, '_');
        const csvStatus = VALID_STATUS_KEYS.includes(csvStatusRaw) ? csvStatusRaw : 'not_contacted';
        return {
          club_name: obj.club_name || obj.name || obj.club || '',
          address: obj.address || '',
          town: obj.town || '',
          county: obj.county || obj.region || '',
          postcode: obj.postcode || '',
          email: obj.email || obj.contact_email || '',
          phone: obj.phone || obj.telephone || '',
          website: obj.website || obj.url || '',
          play_bowls_url: obj.play_bowls_url || '',
          directory_source_url: obj.directory_source_url || '',
          contact_name: obj.contact_name || obj.contact || '',
          confidence: obj.confidence || obj.confidence_score || '',
          primary_email: obj.primary_email || '',
          where_to_find_us_email: obj.where_to_find_us_email || '',
          website_email: obj.website_email || '',
          directory_email: obj.directory_email || '',
          final_recommended_email: obj.final_recommended_email || '',
          validation_status: obj.validation_status || '',
          validation_notes: obj.validation_notes || '',
          data_source: obj.data_source || '',
          last_updated: obj.last_updated || '',
          last_validated: obj.last_validated || '',
          source: obj.source || 'CSV Import',
          contact_status: csvStatus,
          notes: obj.notes || '',
        };
      }).filter(r => r.club_name);
      if (records.length === 0) { toast.error('No valid records found in CSV'); setImporting(false); return; }
      await base44.entities.ProspectClub.bulkCreate(records);
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`Imported ${records.length} clubs from CSV`);
    } catch (err) {
      toast.error('Failed to import CSV: ' + err.message);
    }
    setImporting(false);
    e.target.value = '';
  };

  const exportCsv = () => {
    const headers = [
      'Club Name', 'County', 'Town', 'Address', 'Postcode',
      'Website', 'Play Bowls URL', 'Directory Source URL',
      'Contact Name', 'Confidence Score',
      'Contact Email', 'Primary Email', 'Where to Find Us Email', 'Website Email', 'Directory Email', 'Final Recommended Email',
      'Phone', 'Validation Status', 'Validation Notes', 'Data Source', 'Last Updated', 'Last Validated',
      'Status', 'Last Contacted', 'Source', 'Notes'
    ];
    const rows = prospects.map(p => [
      p.club_name, p.county, p.town, p.address, p.postcode,
      p.website, p.play_bowls_url, p.directory_source_url,
      p.contact_name, p.confidence,
      p.email, p.primary_email, p.where_to_find_us_email, p.website_email, p.directory_email, p.final_recommended_email,
      p.phone, p.validation_status, p.validation_notes, p.data_source, p.last_updated, p.last_validated,
      p.contact_status, p.last_contacted_date, p.source, p.notes
    ].map(v => `"${(v || '').toString().replace(/"/g, '""')}"`));
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'prospects.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Link to={createPageUrl('PlatformAdmin')} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back to Platform Admin
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Prospect CRM</h1>
              <p className="text-gray-600">Track outreach to potential clubs</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={handleEnrichContacts} disabled={enriching}>
                {enriching ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                {enriching ? `Enriching ${enrichProgress.processed}/${enrichProgress.total}` : 'Enrich Contacts'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleScrape} disabled={scraping}>
                {scraping ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Globe className="w-4 h-4 mr-2" />}
                Fetch from play-bowls.com
              </Button>
              <label className="cursor-pointer">
                <input type="file" accept=".csv" onChange={handleCsvImport} className="hidden" />
                <Button variant="outline" size="sm" asChild disabled={importing}>
                  <span>{importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}Import CSV</span>
                </Button>
              </label>
              <Button variant="outline" size="sm" onClick={handleRefreshAllStatuses} disabled={refreshingAllStatuses}>
                {refreshingAllStatuses ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                {refreshingAllStatuses ? `Refreshing ${allStatusProgress.processed}/${allStatusProgress.total}` : 'Refresh Statuses'}
              </Button>
              <Button variant="outline" size="sm" onClick={handleBackfillEmailStatus} disabled={backfilling}>
                {backfilling ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
                {backfilling ? 'Backfilling...' : 'Backfill Statuses'}
              </Button>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-2" />Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={() => setBulkConfirmOpen(true)} disabled={bulkSending || (stats['not_contacted'] || 0) === 0}>
                {bulkSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {bulkSending ? `Sending ${bulkProgress.sent}/${bulkProgress.total}` : 'Send to Not Contacted'}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setTemplateDialogOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />Email Template
              </Button>
              <Button onClick={openCreate} className="bg-emerald-600 hover:bg-emerald-700">
                <Plus className="w-4 h-4 mr-2" />Add Club
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-6">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const Icon = cfg.icon;
            return (
              <button key={key} onClick={() => setStatusFilter(statusFilter === key ? 'all' : key)}
                className={`rounded-xl border p-3 text-left transition-all hover:shadow-md ${statusFilter === key ? 'ring-2 ring-offset-1 ring-emerald-500' : ''} ${cfg.color}`}>
                <Icon className="w-4 h-4 mb-1" />
                <p className="text-xl font-bold">{stats[key] || 0}</p>
                <p className="text-xs font-medium leading-tight">{cfg.label}</p>
              </button>
            );
          })}
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input placeholder="Search clubs, counties, contacts..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses ({prospects.length})</SelectItem>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <SelectItem key={key} value={key}>{cfg.label} ({stats[key] || 0})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={emailStatusFilter} onValueChange={setEmailStatusFilter}>
            <SelectTrigger className="w-56">
              <Mail className="w-4 h-4 mr-2 text-gray-400" />
              <SelectValue placeholder="Filter by email status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Email Statuses ({prospects.length})</SelectItem>
              <SelectItem value="none">No Email Sent ({emailStatusStats.none})</SelectItem>
              {Object.keys(EMAIL_STATUS_STYLES).filter(s => emailStatusStats[s]).map(s => (
                <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, ' ')} ({emailStatusStats[s]})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clubs ({filtered.length}) {visibleCount < filtered.length && <span className="text-sm font-normal text-gray-400">— showing first {visibleCount}</span>}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-500">
                  <Users className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">No prospects yet</p>
                  <p className="text-sm mt-1">Add clubs manually, import a CSV, or fetch from play-bowls.com</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Club</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden sm:table-cell">County</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Confidence</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Email Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Last Contacted</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden xl:table-cell">Notes</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {visibleProspects.map(p => {
                        const cfg = STATUS_CONFIG[p.contact_status] || STATUS_CONFIG.not_contacted;
                        return (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{p.club_name}</p>
                              {(() => {
                                const displayEmail = p.all_emails?.length ? p.all_emails[0] : (p.email || p.final_recommended_email || p.primary_email);
                                const emailCount = p.all_emails?.length ? p.all_emails.length : 0;
                                return displayEmail ? (
                                  <a href={`mailto:${displayEmail}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5">
                                    <Mail className="w-3 h-3" />{displayEmail}
                                    {emailCount > 1 && <span className="text-gray-400">(+{emailCount - 1} more)</span>}
                                  </a>
                                ) : null;
                              })()}
                              {p.phone && <a href={`tel:${p.phone}`} className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.phone}</a>}
                            </td>
                            <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                              {p.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{p.county}</span>}
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              {p.confidence ? (
                                <Badge variant="outline" className={
                                  p.confidence.toLowerCase() === 'high' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  p.confidence.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                  p.confidence.toLowerCase() === 'low' ? 'bg-gray-50 text-gray-600 border-gray-200' : ''
                                }>{p.confidence}</Badge>
                              ) : <span className="text-gray-300">—</span>}
                            </td>
                            <td className="py-3 px-4 text-gray-600 hidden md:table-cell">{p.contact_name}</td>
                            <td className="py-3 px-4">
                              <Select value={p.contact_status || 'not_contacted'}
                                onValueChange={(val) => quickStatusMutation.mutate({ id: p.id, status: val })}>
                                <SelectTrigger className={`w-36 h-7 text-xs border ${cfg.color}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(STATUS_CONFIG).map(([key, c]) => (
                                    <SelectItem key={key} value={key}>{c.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-3 px-4">
                              {p.email_status ? (
                                <>
                                  <Badge variant="outline" className={`text-[10px] py-0 h-5 ${EMAIL_STATUS_STYLES[p.email_status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                                    {p.email_status}
                                  </Badge>
                                  {p.email_status_checked_at && (
                                    <p className="text-[10px] text-gray-400 mt-0.5">{new Date(p.email_status_checked_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">
                              {p.last_contacted_date ? new Date(p.last_contacted_date).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs hidden xl:table-cell max-w-xs">
                              <p className="line-clamp-2">{p.notes || '—'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                   title={(p.all_emails?.length || p.email || p.final_recommended_email || p.primary_email) ? 'Send email' : 'No email address'}
                                   onClick={() => openEmail(p)} disabled={!p.all_emails?.length && !p.email && !p.final_recommended_email && !p.primary_email}>
                                   <Send className="w-3.5 h-3.5" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(p)}>
                                   <Pencil className="w-3.5 h-3.5" />
                                 </Button>
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600 hover:bg-red-50"
                                   onClick={() => { if (confirm('Delete this prospect?')) deleteMutation.mutate(p.id); }}>
                                   <Trash2 className="w-3.5 h-3.5" />
                                 </Button>
                               </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {visibleCount < filtered.length && (
                <div className="text-center py-4 border-t">
                  <Button variant="outline" onClick={() => setVisibleCount(c => c + 50)}>
                    Load More ({filtered.length - visibleCount} remaining)
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Email Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={(open) => { setTemplateDialogOpen(open); if (!open) setTemplatePreviewMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Email Template
              {templateLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Use <code className="bg-gray-100 px-1 rounded">{'{{club_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{contact_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{county}}'}</code> as placeholders — they'll be replaced when sending.
          </p>
          <p className="text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3 -mt-1">
            <strong>HTML supported:</strong> You can use HTML tags like <code className="bg-blue-100 px-1 rounded">{'<a href="https://...">Link text</a>'}</code> for clickable links. Links are tracked via Resend for click analytics. Line breaks are preserved automatically for plain text.
          </p>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject</Label>
              <Input value={emailTemplate.subject} onChange={e => setEmailTemplate({ ...emailTemplate, subject: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Body</Label>
                <div className="flex items-center gap-1">
                  <Button variant={templatePreviewMode ? 'ghost' : 'secondary'} size="sm" onClick={() => setTemplatePreviewMode(false)}>
                    <FileText className="w-3.5 h-3.5 mr-1" />Edit
                  </Button>
                  <Button variant={templatePreviewMode ? 'secondary' : 'ghost'} size="sm" onClick={() => setTemplatePreviewMode(true)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />Preview
                  </Button>
                </div>
              </div>
              {templatePreviewMode ? (
                <EmailPreview html={emailTemplate.body} onChange={(newHtml) => setEmailTemplate({ ...emailTemplate, body: newHtml })} />
              ) : (
                <Textarea value={emailTemplate.body} onChange={e => setEmailTemplate({ ...emailTemplate, body: e.target.value })} rows={14} className="font-mono text-sm" />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTemplate(DEFAULT_TEMPLATE)}>Reset to Default</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveTemplate} disabled={templateSaving}>
              {templateSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={(open) => { setEmailDialogOpen(open); if (!open) setSendPreviewMode(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Email to {emailTarget?.club_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>To</Label>
              <Input type="email" value={emailRecipient} onChange={e => setEmailRecipient(e.target.value)} placeholder="recipient@example.com" />
            </div>
            <div>
              <Label>CC</Label>
              <Input type="text" value={emailCc} onChange={e => setEmailCc(e.target.value)} placeholder="cc1@example.com; cc2@example.com" />
              <p className="text-xs text-gray-400 mt-1">Separate multiple addresses with ; or ,</p>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={emailPreview.subject} onChange={e => setEmailPreview({ ...emailPreview, subject: e.target.value })} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Body</Label>
                <div className="flex items-center gap-1">
                  <Button variant={sendPreviewMode ? 'ghost' : 'secondary'} size="sm" onClick={() => setSendPreviewMode(false)}>
                    <FileText className="w-3.5 h-3.5 mr-1" />Edit
                  </Button>
                  <Button variant={sendPreviewMode ? 'secondary' : 'ghost'} size="sm" onClick={() => setSendPreviewMode(true)}>
                    <Eye className="w-3.5 h-3.5 mr-1" />Preview
                  </Button>
                </div>
              </div>
              {sendPreviewMode ? (
                <EmailPreview html={emailPreview.body} onChange={(newHtml) => setEmailPreview({ ...emailPreview, body: newHtml })} />
              ) : (
                <>
                  <Textarea value={emailPreview.body} onChange={e => setEmailPreview({ ...emailPreview, body: e.target.value })} rows={14} className="text-sm" />
                  <p className="text-xs text-blue-600 mt-1">HTML tags (e.g. <code className="bg-blue-50 px-1 rounded">&lt;a href="..."&gt;link&lt;/a&gt;</code>) are supported — links are tracked via Resend.</p>
                </>
              )}
            </div>
            <p className="text-xs text-gray-400">Sending this email will automatically mark the club's status as "Email Sent" and update the last contacted date.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>Cancel</Button>
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleSendEmail} disabled={sendingEmail}>
              {sendingEmail ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProspect ? 'Edit Prospect' : 'Add Prospect Club'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Club Details */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Club Details</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Club Name *</Label>
                  <Input value={formData.club_name} onChange={e => setFormData({ ...formData, club_name: e.target.value })} placeholder="e.g., Springfield Bowls Club" />
                </div>
                <div>
                  <Label>County / Region</Label>
                  <Input value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value })} placeholder="Hampshire" />
                </div>
                <div>
                  <Label>Town</Label>
                  <Input value={formData.town} onChange={e => setFormData({ ...formData, town: e.target.value })} placeholder="Springfield" />
                </div>
                <div className="col-span-2">
                  <Label>Address</Label>
                  <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Green Lane..." />
                </div>
                <div>
                  <Label>Postcode</Label>
                  <Input value={formData.postcode} onChange={e => setFormData({ ...formData, postcode: e.target.value })} placeholder="SO22 5AA" />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="07700 900000" />
                </div>
              </div>
            </div>
            {/* Website & Directories */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Website & Directories</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Website</Label>
                  <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
                </div>
                <div className="col-span-2">
                  <Label>Play Bowls URL</Label>
                  <Input value={formData.play_bowls_url} onChange={e => setFormData({ ...formData, play_bowls_url: e.target.value })} placeholder="https://play-bowls.com/..." />
                </div>
                <div className="col-span-2">
                  <Label>Directory Source URL</Label>
                  <Input value={formData.directory_source_url} onChange={e => setFormData({ ...formData, directory_source_url: e.target.value })} placeholder="https://..." />
                </div>
              </div>
            </div>
            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Name</Label>
                  <Input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} placeholder="John Smith" />
                </div>
                <div>
                  <Label>Confidence Score</Label>
                  <Input value={formData.confidence} onChange={e => setFormData({ ...formData, confidence: e.target.value })} placeholder="High / Medium / Low" />
                </div>
              </div>
            </div>
            {/* Email Addresses */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Email Addresses</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Email</Label>
                  <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="club@example.com" />
                </div>
                <div>
                  <Label>Primary Email</Label>
                  <Input type="email" value={formData.primary_email} onChange={e => setFormData({ ...formData, primary_email: e.target.value })} placeholder="primary@example.com" />
                </div>
                <div>
                  <Label>Where to Find Us Email</Label>
                  <Input type="email" value={formData.where_to_find_us_email} onChange={e => setFormData({ ...formData, where_to_find_us_email: e.target.value })} placeholder="" />
                </div>
                <div>
                  <Label>Website Email</Label>
                  <Input type="email" value={formData.website_email} onChange={e => setFormData({ ...formData, website_email: e.target.value })} placeholder="" />
                </div>
                <div>
                  <Label>Directory Email</Label>
                  <Input type="email" value={formData.directory_email} onChange={e => setFormData({ ...formData, directory_email: e.target.value })} placeholder="" />
                </div>
                <div>
                  <Label>Final Recommended Email</Label>
                  <Input type="email" value={formData.final_recommended_email} onChange={e => setFormData({ ...formData, final_recommended_email: e.target.value })} placeholder="" />
                </div>
              </div>
            </div>
            {/* Validation */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Validation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Validation Status</Label>
                  <Input value={formData.validation_status} onChange={e => setFormData({ ...formData, validation_status: e.target.value })} placeholder="Valid / Invalid / Unknown" />
                </div>
                <div>
                  <Label>Data Source</Label>
                  <Input value={formData.data_source} onChange={e => setFormData({ ...formData, data_source: e.target.value })} placeholder="play-bowls.com, manual, etc." />
                </div>
                <div>
                  <Label>Last Updated</Label>
                  <Input type="date" value={formData.last_updated} onChange={e => setFormData({ ...formData, last_updated: e.target.value })} />
                </div>
                <div>
                  <Label>Last Validated</Label>
                  <Input type="date" value={formData.last_validated} onChange={e => setFormData({ ...formData, last_validated: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Validation Notes</Label>
                  <Textarea value={formData.validation_notes} onChange={e => setFormData({ ...formData, validation_notes: e.target.value })} placeholder="Notes from email validation..." rows={2} />
                </div>
              </div>
            </div>
            {/* CRM Status */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-3">CRM Status</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select value={formData.contact_status} onValueChange={v => setFormData({ ...formData, contact_status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                        <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Last Contacted</Label>
                  <Input type="date" value={formData.last_contacted_date} onChange={e => setFormData({ ...formData, last_contacted_date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <Label>Source</Label>
                  <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="play-bowls.com" />
                </div>
                <div className="col-span-2">
                  <Label>Notes</Label>
                  <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any relevant notes..." rows={3} />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}>
              {(createMutation.isPending || updateMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingProspect ? 'Save Changes' : 'Add Prospect'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Backfill Result Dialog */}
      {backfillResult && (
        <Dialog open={!!backfillResult} onOpenChange={() => setBackfillResult(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Email Status Backfill Complete</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-4">
                  <p className="text-3xl font-bold text-gray-900">{backfillResult.totalResendEntries}</p>
                  <p className="text-xs text-gray-500 mt-1">Resend entries found</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-3xl font-bold text-emerald-600">{backfillResult.prospectsUpdated}</p>
                  <p className="text-xs text-gray-500 mt-1">Prospects updated</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-3xl font-bold text-blue-600">{backfillResult.matched}</p>
                  <p className="text-xs text-gray-500 mt-1">Entries matched</p>
                </div>
                <div className="rounded-lg border p-4">
                  <p className="text-3xl font-bold text-gray-400">{backfillResult.unmatched}</p>
                  <p className="text-xs text-gray-500 mt-1">Entries unmatched</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 text-center">Fetched across {backfillResult.pagesFetched} page(s) from Resend's send history</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setBackfillResult(null)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Bulk Send Confirmation Dialog */}
      <Dialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Template Email to All "Not Contacted" Prospects</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              This will send the saved email template to all prospects with "Not Contacted" status, using the same workflow as the individual send button.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-gray-900">{stats['not_contacted'] || 0}</p>
                <p className="text-xs text-gray-500 mt-1">Not Contacted prospects</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-2xl font-bold text-emerald-600">{Math.ceil((stats['not_contacted'] || 0) / 20)}</p>
                <p className="text-xs text-gray-500 mt-1">Batches (20 per batch)</p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <Clock className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800">
                Emails are sent in batches of 20 with a 30-second pause between each batch. Keep this tab open while sending is in progress. Prospects without an email address — or whose emails have already been queued for another prospect — will be skipped automatically to prevent duplicates.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkConfirmOpen(false)}>Cancel</Button>
            <Button onClick={startBulkSend} className="bg-emerald-600 hover:bg-emerald-700">
              <Send className="w-4 h-4 mr-2" />Start Bulk Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Send Progress Dialog */}
      <Dialog open={bulkSending} onOpenChange={() => {}}>
        <DialogContent className="max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Bulk Send in Progress</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-emerald-600">{bulkProgress.sent}</p>
                <p className="text-xs text-gray-500 mt-1">Sent</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-red-500">{bulkProgress.failed}</p>
                <p className="text-xs text-gray-500 mt-1">Failed</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-gray-400">{bulkProgress.skipped}</p>
                <p className="text-xs text-gray-500 mt-1">Skipped</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-emerald-600 h-2.5 rounded-full transition-all" style={{ width: `${bulkProgress.total > 0 ? Math.round(((bulkProgress.sent + bulkProgress.failed) / bulkProgress.total) * 100) : 0}%` }} />
            </div>
            <p className="text-center text-sm text-gray-600">
              {bulkProgress.sent + bulkProgress.failed} of {bulkProgress.total} processed
              {bulkProgress.totalBatches > 0 && ` · Batch ${bulkProgress.batch} of ${bulkProgress.totalBatches}`}
            </p>
            {bulkProgress.waiting ? (
              <div className="flex items-center justify-center gap-2 rounded-lg bg-blue-50 border border-blue-200 p-3">
                <Clock className="w-5 h-5 text-blue-600 animate-pulse" />
                <span className="text-sm text-blue-800">Waiting {bulkProgress.waitSeconds}s before next batch...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending batch {bulkProgress.batch}...
              </div>
            )}
            {bulkProgress.failures.length > 0 && (
              <div className="rounded-lg border border-red-200 max-h-40 overflow-y-auto">
                <div className="px-3 py-2 bg-red-50 border-b border-red-200 sticky top-0">
                  <p className="text-xs font-semibold text-red-700">Failed emails ({bulkProgress.failures.length})</p>
                </div>
                <div className="divide-y divide-red-100">
                  {bulkProgress.failures.map((f, idx) => (
                    <div key={idx} className="px-3 py-2 text-xs">
                      <p className="font-medium text-gray-900">{f.club}</p>
                      <p className="text-gray-500">To: {f.email}</p>
                      <p className="text-red-600 mt-0.5">Reason: {f.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="destructive" onClick={() => { bulkCancelRef.current = true; }}>
              Stop Sending
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}