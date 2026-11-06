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
const EMAIL_REGEX = /^[^\s]+@[^\s@]+\.[^\s]+$/;

// Parse a semicolon/comma separated string into unique, valid emails (keeps original casing)
function parseEmails(text) {
  const seen = new Set();
  const out = [];
  String(text || '').split(/[;,]/).forEach(raw => {
    const email = raw.trim();
    const key = email.toLowerCase();
    if (!EMAIL_REGEX.test(email) || seen.has(key)) return;
    seen.add(key);
    out.push(email);
  });
  return out;
}

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
  const [bccText, setBccText] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
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
          list.push({ email: m.user_email, name: adminName(m) });
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

  const selectedEmails = useMemo(() => parseEmails(bccText), [bccText]);
  const selectedKeys = useMemo(() => new Set(selectedEmails.map(e => e.toLowerCase())), [selectedEmails]);
  const selectedClubCount = useMemo(
    () => clubGroups.filter(g => g.admins.some(a => selectedKeys.has(a.email.toLowerCase()))).length,
    [clubGroups, selectedKeys]
  );

  const toggleEmail = (email, on) => {
    const list = parseEmails(bccText);
    const exists = list.some(e => e.toLowerCase() === email.toLowerCase());
    let next = list;
    if (on && !exists) next = [...list, email];
    if (!on && exists) next = list.filter(e => e.toLowerCase() !== email.toLowerCase());
    setBccText(next.join('; '));
  };

  const toggleClub = (group, on) => {
    let list = parseEmails(bccText);
    group.admins.forEach(a => {
      const exists = list.some(e => e.toLowerCase() === a.email.toLowerCase());
      if (on && !exists) list = [...list, a.email];
      if (!on && exists) list = list.filter(e => e.toLowerCase() !== a.email.toLowerCase());
    });
    setBccText(list.join('; '));
  };

  const handleSendTest = async () => {
    setSending(true);
    try {
      await base44.functions.invoke('sendAdminBroadcastEmail', { subject, body, testOnly: true });
      toast.success(`Test email sent to ${me?.email || 'you'}`);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || String(e);
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

  const handleSend = async () => {
    setConfirmOpen(false);
    setSending(true);
    try {
      const res = await base44.functions.invoke('sendAdminBroadcastEmail', {
        subject,
        body,
        bcc: selectedEmails,
        testOnly: false,
      });
      const sent = res?.data?.sent ?? selectedEmails.length;
      toast.success(`Email sent to ${sent} club admin${sent === 1 ? '' : 's'}`);
    } catch (e) {
      const msg = e?.response?.data?.error || e?.message || String(e);
      toast.error('Failed to send email: ' + msg);
    }
    setSending(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
      <AdminRecipientsPanel
        clubGroups={clubGroups}
        selectedKeys={selectedKeys}
        selectedCount={selectedEmails.length}
        selectedClubCount={selectedClubCount}
        loading={loading}
        onToggleEmail={toggleEmail}
        onToggleClub={toggleClub}
        onSetRecipients={(emails) => setBccText(emails.join('; '))}
      />

      <BroadcastComposer
        bccText={bccText}
        onBccChange={setBccText}
        subject={subject}
        onSubjectChange={setSubject}
        body={body}
        onBodyChange={setBody}
        recipientCount={selectedEmails.length}
        sending={sending}
        onSendTest={handleSendTest}
        onSaveTemplate={handleSaveTemplate}
        onLoadTemplate={handleLoadTemplate}
        onSend={() => setConfirmOpen(true)}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send this email to {selectedEmails.length} club admins?</DialogTitle>
            <DialogDescription>
              Subject: <span className="font-medium text-gray-700">{subject}</span>
              <br />
              {selectedEmails.length} recipient{selectedEmails.length === 1 ? '' : 's'} will receive this email in BCC.
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