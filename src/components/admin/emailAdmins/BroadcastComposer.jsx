import React, { useState } from 'react';
import { Eye, Code2, Send, Save, FolderOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import RecipientChips from '@/components/admin/emailAdmins/RecipientChips';
import { mergeTags, SAMPLE_RECIPIENT } from '@/lib/mergeTags';

function buildPreviewDoc(body) {
  const trimmed = (body || '').trim();
  const isFullHtml = /^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed);
  if (isFullHtml) return trimmed;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#111;background:#fff;padding:20px;">${trimmed.replace(/\n/g, '<br/>')}</body></html>`;
}

const MergeTagHint = () => (
  <p className="text-xs text-gray-500">
    Merge tags:{' '}
    <code className="bg-gray-100 px-1 rounded">{'{{first_name}}'}</code>,{' '}
    <code className="bg-gray-100 px-1 rounded">{'{{admin_name}}'}</code>,{' '}
    <code className="bg-gray-100 px-1 rounded">{'{{club_name}}'}</code> — replaced with each admin's own details
    when sending. Tags work in the subject and the body.
  </p>
);

export default function BroadcastComposer({
  recipients = [],
  onRemoveRecipient,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  sending,
  progress,
  onSendTest,
  onSaveTemplate,
  onLoadTemplate,
  onSend,
}) {
  const [previewMode, setPreviewMode] = useState(false);
  const recipientCount = recipients.length;
  const canSend = recipientCount > 0 && subject.trim().length > 0 && body.trim().length > 0;

  // Preview merges the first selected recipient's details (or sample data)
  const previewRecipient = recipients[0] || SAMPLE_RECIPIENT;
  const previewDoc = buildPreviewDoc(mergeTags(body, previewRecipient, { escape: true }));
  const previewSubject = mergeTags(subject, previewRecipient);

  const sendLabel = progress
    ? `Sending ${progress.current} of ${progress.total}...`
    : `Send ${recipientCount} individual email${recipientCount === 1 ? '' : 's'}`;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Compose email</h3>

      <RecipientChips recipients={recipients} onRemove={onRemoveRecipient} disabled={sending} />

      <div>
        <Label className="text-xs text-gray-600">Subject</Label>
        <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="Email subject" />
        <div className="mt-1">
          <MergeTagHint />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-xs text-gray-600">Body (HTML)</Label>
          <div className="flex gap-1">
            <Button
              type="button"
              variant={previewMode ? 'ghost' : 'secondary'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setPreviewMode(false)}
            >
              <Code2 className="w-3.5 h-3.5 mr-1" />Edit
            </Button>
            <Button
              type="button"
              variant={previewMode ? 'secondary' : 'ghost'}
              size="sm"
              className="h-7 px-2"
              onClick={() => setPreviewMode(true)}
            >
              <Eye className="w-3.5 h-3.5 mr-1" />Preview
            </Button>
          </div>
        </div>

        {previewMode ? (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              Previewing as <span className="font-medium text-gray-700">{previewSubject || '(no subject)'}</span>
            </p>
            <iframe
              title="Email preview"
              srcDoc={previewDoc}
              sandbox=""
              className="w-full h-[420px] border rounded-md bg-white"
            />
          </div>
        ) : (
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder="<p>Hello {{first_name}},</p>"
          />
        )}
        <div className="mt-1 space-y-1">
          <MergeTagHint />
          <p className="text-xs text-gray-400">
            Either a complete HTML document (starting with &lt;!DOCTYPE html&gt; or &lt;html&gt;) or a plain text / HTML
            fragment is accepted. Fragments are wrapped in the standard BowlsTime email shell.
          </p>
        </div>
      </div>

      {progress && (
        <div className="space-y-1">
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-600 rounded-full transition-all"
              style={{ width: `${progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%` }}
            />
          </div>
          <p className="text-xs text-gray-500">Sending {progress.current} of {progress.total}...</p>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="outline" size="sm" onClick={onSendTest} disabled={sending || !subject.trim() || !body.trim()}>
          Send test to me
        </Button>
        <Button variant="outline" size="sm" onClick={onSaveTemplate} disabled={sending}>
          <Save className="w-3.5 h-3.5 mr-1.5" />
          Save as template
        </Button>
        <Button variant="outline" size="sm" onClick={onLoadTemplate} disabled={sending}>
          <FolderOpen className="w-3.5 h-3.5 mr-1.5" />
          Load template
        </Button>
        <Button size="sm" className="ml-auto bg-emerald-600 hover:bg-emerald-700" onClick={onSend} disabled={!canSend || sending}>
          {sending ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Send className="w-3.5 h-3.5 mr-1.5" />}
          {sendLabel}
        </Button>
      </div>
    </div>
  );
}