import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import AdminRecipientsPanel from '@/components/admin/emailAdmins/AdminRecipientsPanel';
import BroadcastComposer from '@/components/admin/emailAdmins/BroadcastComposer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const TEMPLATE_KEY = 'admin_broadcast';
const SEND_CHUNK_SIZE = 50;

// Load every record matching a query, following pagination cursors
async function loadAll(entity, query) {
  const all = [];
  let cursor = null;
  for (let i = 0; i < 50; i++) {
    const page = await entity.filter(query, { limit: 500, ...(cursor ? { cursor } : {}) });
    if (Array.isArray(page)) return page;
    all.push(...(page.items || []));
    if (!page.has_more || !page.next_cursor) break;
    cursor = page.next_cursor;
  }
  return all;
}

const adminName = (m) =>
  (m.user_name || '').trim() ||
  [m.first_name, m.surname].filter(Boolean).join(' ').trim() ||
  m.user_email;

export default function EmailClubAdminsTab() {
  const [clubGroups, setClubGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]); // lowercased emails, in the order they were ticked
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [clubs, memberships, user] = await Promise.all([
          loadAll(base44.entities.Club, {}),
          loadAll(base44.entities.ClubMembership, { role: 'admin', status: 'approved' }),
          base44.auth.me(),
        ]);
        if (cancelled) return;
        setMe(user);

        const adminsByClub = new Map();
        memberships.forEach(m => {
          if (!m.club_id || !m.user_email || m.member_status === 'left') return;
          const list = adminsByClub.get(m.club_id) || [];
          if (list.some(a => a.email.toLowerCase() === m.user_email.toLowerCase())) return;
          list.push({
            email: m.user_email,
            name: adminName(m),
            first_name: (m.first_name || '').trim(),
          });
          adminsByClub.set(m.club_id, list);
        });

        const groups = clubs
          .map(club => ({ club, admins: adminsByClub.get(club.id) || [] }))
          .filter(g => g.admins.length > 0)
          .sort((a, b) => (a.club.name || '').localeCompare(b.club.name || ''));

        setClubGroups(groups);
      } catch (e) {
        toast.error('Failed to load club admins: ' + (e?.message || e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // One unique person per email (case-insensitive), with every club they administer
  const peopleByEmail = useMemo(() => {
    const map = new Map();
    clubGroups.forEach(g => {
      g.admins.forEach(a => {
        const key = a.email.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          if (!existing.club_names.includes(g.club.name)) existing.club_names.push(g.club.name);
        } else {
          map.set(key, {
            email: a.email,
            name: a.name,
            first_name: a.first_name || '',
            club_names: [g.club.name],
          });
        }
      });
    });
    return map;
  }, [clubGroups]);

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys]);
  const selectedRecipients = useMemo(
    () => selectedKeys.map(k => peopleByEmail.get(k)).filter(Boolean),
    [selectedKeys, peopleByEmail]
  );
  const selectedClubCount = useMemo(
    () => clubGroups.filter(g => g.admins.some(a => selectedKeySet.has(a.email.toLowerCase()))).length,
    [clubGroups, selectedKeySet]
  );

  const toggleEmail = (email, on) => {
    const key = email.toLowerCase();
    setSelectedKeys(prev => {
      const exists = prev.includes(key);
      if (on && !exists) return [...prev, key];
      if (!on && exists) return prev.filter(k => k !== key);
      return prev;
    });
  };

  const toggleClub = (group, on) => {
    const keys = group.admins.map(a => a.email.toLowerCase());
    setSelectedKeys(prev => {
      if (on) {
        const next = [...prev];
        keys.forEach(k => { if (!next.includes(k)) next.push(k); });
        return next;
      }
      return prev.filter(k => !keys.includes(k));
    });
  };

  const setRecipients = (emails) => {
    const out = [];
    emails.forEach(email => {
      const key = String(email || '').toLowerCase();
      if (key && !out.includes(key)) out.push(key);
    });
    setSelectedKeys(out);
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendAdminBroadcastEmail', {
        subject,
        body,
        recipients: selectedRecipients.slice(0, 1),
        testOnly: true,
      });
      if (res?.data?.error) throw new Error(res.data.error);
      toast.success(`Test email sent to ${me?.email || 'you'}`);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e?.message || String(e);
      toast.error('Failed to send test: ' + msg);
    }
    setSending(false);
  };

  const handleSaveTemplate = async () => {
    setSending(true);
    try {
      const existing = await base44.entities.EmailTemplate.filter({ template_key: TEMPLATE_KEY });
      if (existing[0]) {
        await base44.entities.EmailTemplate.update(existing[0].id, {
          subject,
          body,
          updated_by: me?.email || '',
        });
      } else {
        await base44.entities.EmailTemplate.create({
          template_key: TEMPLATE_KEY,
          subject,
          body,
          updated_by: me?.email || '',
        });
      }
      toast.success('Template saved');
    } catch (e) {
      toast.error('Failed to save template: ' + (e?.message || e));
    }
    setSending(false);
  };

  const handleLoadTemplate = async () => {
    setSending(true);
    try {
      const existing = await base44.entities.EmailTemplate.filter({ template_key: TEMPLATE_KEY });
      if (!existing[0]) {
        toast.info('No saved admin broadcast template yet');
      } else {
        setSubject(existing[0].subject || '');
        setBody(existing[0].body || '');
        toast.success('Template loaded');
      }
    } catch (e) {
      toast.error('Failed to load template: ' + (e?.message || e));
    }
    setSending(false);
  };

  const logBroadcast = async (results, invalidAddresses) => {
    const rows = results.map(r => {
      const person = peopleByEmail.get(r.email.toLowerCase());
      return {
        email: r.email,
        name: person?.name || '',
        club_names: person?.club_names || [],
        status: r.status,
        error: r.error || '',
        resend_email_id: r.resend_email_id || '',
      };
    });
    try {
      await base44.entities.AdminBroadcast.create({
        subject,
        body,
        recipients: rows,
        total_recipients: rows.length,
        sent_count: rows.filter(r => r.status === 'sent').length,
        failed_count: rows.filter(r => r.status === 'failed').length,
        invalid_addresses: invalidAddresses,
        sent_by: me?.email || '',
      });
    } catch (e) {
      console.error('Failed to log broadcast', e);
    }
  };

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);

    const total = selectedRecipients.length;
    const results = [];
    const invalidAddresses = [];
    setProgress({ current: 0, total });

    try {
      for (let i = 0; i < total; i += SEND_CHUNK_SIZE) {
        const chunk = selectedRecipients.slice(i, i + SEND_CHUNK_SIZE);
        const res = await base44.functions.invoke('sendAdminBroadcastEmail', {
          subject,
          body,
          recipients: chunk,
          testOnly: false,
        });
        const data = res?.data || {};
        if (data.error) throw new Error(data.error);
        results.push(...(data.results || []));
        invalidAddresses.push(...(data.invalidAddresses || []));
        setProgress({ current: Math.min(i + chunk.length, total), total });
      }

      const sentCount = results.filter(r => r.status === 'sent').length;
      const failedCount = results.filter(r => r.status === 'failed').length;

      await logBroadcast(results, invalidAddresses);

      if (failedCount === 0) {
        toast.success(`Sent ${sentCount} individual email${sentCount === 1 ? '' : 's'}`);
      } else {
        toast.warning(`Sent ${sentCount}, failed ${failedCount}. Check the history for details.`);
      }
    } catch (e) {
      const msg = e?.response?.data?.error || e?.data?.error || e?.message || String(e);
      toast.error('Failed to send emails: ' + msg);
      if (results.length > 0) await logBroadcast(results, invalidAddresses);
    }

    setProgress(null);
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <AdminRecipientsPanel
        clubGroups={clubGroups}
        selectedKeys={selectedKeySet}
        selectedCount={selectedRecipients.length}
        selectedClubCount={selectedClubCount}
        loading={loading}
        onToggleEmail={toggleEmail}
        onToggleClub={toggleClub}
        onSetRecipients={setRecipients}
      />

      <BroadcastComposer
        recipients={selectedRecipients}
        onRemoveRecipient={(email) => toggleEmail(email, false)}
        subject={subject}
        onSubjectChange={setSubject}
        body={body}
        onBodyChange={setBody}
        sending={sending}
        progress={progress}
        onSendTest={handleSendTest}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onSend={() => setConfirmOpen(true)}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send {selectedRecipients.length} individual emails?</DialogTitle>
            <DialogDescription>
              Subject: <span className="font-medium text-gray-700">{subject}</span>
              <br />
              Each person will receive their own copy and will not see other recipients.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSend}>
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}