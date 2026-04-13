import React, { useState, useEffect, useMemo } from 'react';
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
  Send, FileText
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const STATUS_CONFIG = {
  not_contacted: { label: 'Not Contacted', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: Clock },
  contacted: { label: 'Contacted', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: PhoneCall },
  follow_up: { label: 'Follow Up', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: RefreshCw },
  interested: { label: 'Interested', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: Star },
  not_interested: { label: 'Not Interested', color: 'bg-red-100 text-red-700 border-red-200', icon: XCircle },
  signed_up: { label: 'Signed Up', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: CheckCircle },
};

const EMPTY_FORM = {
  club_name: '', address: '', county: '', email: '', phone: '',
  website: '', contact_name: '', source: 'play-bowls.com',
  contact_status: 'not_contacted', notes: '', last_contacted_date: ''
};

const DEFAULT_TEMPLATE = {
  subject: 'Introducing BowlsTime – Club Management Made Easy',
  body: `Dear {{contact_name}},

I hope this email finds you well. My name is [Your Name] and I'm reaching out to introduce BowlsTime, a platform designed specifically for lawn bowls clubs like {{club_name}}.

BowlsTime helps clubs manage:
- Rink bookings and availability
- Team selections and match notifications
- League and competition management
- Member communications

I'd love to arrange a quick call or demo to show you how BowlsTime could benefit {{club_name}}. 

Would you be available for a 20-minute chat? Feel free to reply to this email or call me on [Your Phone Number].

Kind regards,
[Your Name]
BowlsTime`
};

export default function ProspectCRM() {
  const [user, setUser] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProspect, setEditingProspect] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [emailTarget, setEmailTarget] = useState(null);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [emailTemplate, setEmailTemplate] = useState(() => {
    try {
      const saved = localStorage.getItem('prospectEmailTemplate');
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATE;
    } catch { return DEFAULT_TEMPLATE; }
  });
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailPreview, setEmailPreview] = useState({ subject: '', body: '' });
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

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
      last_contacted_date: ['contacted', 'follow_up', 'interested', 'not_interested'].includes(status)
        ? new Date().toISOString().split('T')[0] : undefined
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['prospects'] }),
  });

  // Stats — must be before any conditional return
  const stats = useMemo(() => {
    const total = prospects.length;
    const byStatus = {};
    for (const s of Object.keys(STATUS_CONFIG)) {
      byStatus[s] = prospects.filter(p => p.contact_status === s).length;
    }
    return { total, ...byStatus };
  }, [prospects]);

  const filtered = useMemo(() => prospects.filter(p => {
    const matchSearch = !search ||
      p.club_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.county?.toLowerCase().includes(search.toLowerCase()) ||
      p.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'all' || p.contact_status === statusFilter;
    return matchSearch && matchStatus;
  }), [prospects, search, statusFilter]);

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
      .replace(/{{county}}/g, prospect.county || '');
    return { subject: replace(template.subject), body: replace(template.body) };
  };

  const openEmail = (p) => {
    setEmailTarget(p);
    setEmailPreview(fillTemplate(emailTemplate, p));
    setEmailDialogOpen(true);
  };

  const handleSendEmail = async () => {
    if (!emailTarget?.email) { toast.error('This club has no email address'); return; }
    setSendingEmail(true);
    try {
      await base44.integrations.Core.SendEmail({
        to: emailTarget.email,
        subject: emailPreview.subject,
        body: emailPreview.body.replace(/\n/g, '<br/>'),
        from_name: 'BowlsTime',
      });
      await base44.entities.ProspectClub.update(emailTarget.id, {
        contact_status: emailTarget.contact_status === 'not_contacted' ? 'contacted' : emailTarget.contact_status,
        last_contacted_date: new Date().toISOString().split('T')[0],
      });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      toast.success(`Email sent to ${emailTarget.email}`);
      setEmailDialogOpen(false);
    } catch (e) {
      toast.error('Failed to send email: ' + e.message);
    }
    setSendingEmail(false);
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

  const handleCsvImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, ''));
      const records = lines.slice(1).map(line => {
        const vals = line.split(',');
        const obj = {};
        headers.forEach((h, i) => { obj[h] = (vals[i] || '').trim().replace(/^"|"$/g, ''); });
        return {
          club_name: obj.club_name || obj.name || obj.club || '',
          address: obj.address || '',
          county: obj.county || obj.region || '',
          email: obj.email || '',
          phone: obj.phone || obj.telephone || '',
          website: obj.website || obj.url || '',
          contact_name: obj.contact_name || obj.contact || '',
          source: obj.source || 'CSV Import',
          contact_status: 'not_contacted',
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
    const headers = ['Club Name', 'County', 'Address', 'Email', 'Phone', 'Website', 'Contact Name', 'Status', 'Last Contacted', 'Notes'];
    const rows = prospects.map(p => [
      p.club_name, p.county, p.address, p.email, p.phone, p.website,
      p.contact_name, p.contact_status, p.last_contacted_date, p.notes
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`));
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
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="w-4 h-4 mr-2" />Export CSV
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
        </div>

        {/* Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Clubs ({filtered.length})</CardTitle>
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
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden md:table-cell">Contact</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden lg:table-cell">Last Contacted</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-500 hidden xl:table-cell">Notes</th>
                        <th className="py-3 px-4" />
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map(p => {
                        const cfg = STATUS_CONFIG[p.contact_status] || STATUS_CONFIG.not_contacted;
                        return (
                          <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="font-medium text-gray-900">{p.club_name}</p>
                              {p.email && <a href={`mailto:${p.email}`} className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" />{p.email}</a>}
                              {p.phone && <a href={`tel:${p.phone}`} className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" />{p.phone}</a>}
                            </td>
                            <td className="py-3 px-4 text-gray-600 hidden sm:table-cell">
                              {p.county && <span className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" />{p.county}</span>}
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
                            <td className="py-3 px-4 text-gray-500 text-xs hidden lg:table-cell">
                              {p.last_contacted_date ? new Date(p.last_contacted_date).toLocaleDateString('en-GB') : '—'}
                            </td>
                            <td className="py-3 px-4 text-gray-500 text-xs hidden xl:table-cell max-w-xs">
                              <p className="line-clamp-2">{p.notes || '—'}</p>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1">
                                 <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                                   title={p.email ? `Send email to ${p.email}` : 'No email address'}
                                   onClick={() => openEmail(p)} disabled={!p.email}>
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
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Email Template Dialog */}
      <Dialog open={templateDialogOpen} onOpenChange={setTemplateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Email Template</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-2">
            Use <code className="bg-gray-100 px-1 rounded">{'{{club_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{contact_name}}'}</code>, <code className="bg-gray-100 px-1 rounded">{'{{county}}'}</code> as placeholders — they'll be replaced when sending.
          </p>
          <div className="space-y-4 py-2">
            <div>
              <Label>Subject</Label>
              <Input value={emailTemplate.subject} onChange={e => setEmailTemplate({ ...emailTemplate, subject: e.target.value })} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea value={emailTemplate.body} onChange={e => setEmailTemplate({ ...emailTemplate, body: e.target.value })} rows={14} className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailTemplate(DEFAULT_TEMPLATE)}>Reset to Default</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={() => {
              localStorage.setItem('prospectEmailTemplate', JSON.stringify(emailTemplate));
              toast.success('Template saved');
              setTemplateDialogOpen(false);
            }}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Send Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Email to {emailTarget?.club_name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
              <Mail className="w-4 h-4 shrink-0" />
              <span>To: <strong>{emailTarget?.email}</strong></span>
            </div>
            <div>
              <Label>Subject</Label>
              <Input value={emailPreview.subject} onChange={e => setEmailPreview({ ...emailPreview, subject: e.target.value })} />
            </div>
            <div>
              <Label>Body</Label>
              <Textarea value={emailPreview.body} onChange={e => setEmailPreview({ ...emailPreview, body: e.target.value })} rows={14} className="text-sm" />
            </div>
            <p className="text-xs text-gray-400">Sending this email will automatically mark the club's status as "Contacted" and update the last contacted date.</p>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProspect ? 'Edit Prospect' : 'Add Prospect Club'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2">
              <Label>Club Name *</Label>
              <Input value={formData.club_name} onChange={e => setFormData({ ...formData, club_name: e.target.value })} placeholder="e.g., Springfield Bowls Club" />
            </div>
            <div>
              <Label>County / Region</Label>
              <Input value={formData.county} onChange={e => setFormData({ ...formData, county: e.target.value })} placeholder="Hampshire" />
            </div>
            <div>
              <Label>Contact Name</Label>
              <Input value={formData.contact_name} onChange={e => setFormData({ ...formData, contact_name: e.target.value })} placeholder="John Smith" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="123 Green Lane..." />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="club@example.com" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} placeholder="07700 900000" />
            </div>
            <div className="col-span-2">
              <Label>Website</Label>
              <Input value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} placeholder="https://..." />
            </div>
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
              <Label>Notes</Label>
              <Textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} placeholder="Any relevant notes..." rows={3} />
            </div>
            <div className="col-span-2">
              <Label>Source</Label>
              <Input value={formData.source} onChange={e => setFormData({ ...formData, source: e.target.value })} placeholder="play-bowls.com" />
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
    </div>
  );
}