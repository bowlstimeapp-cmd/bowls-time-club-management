import React, { useState } from 'react';
import { Eye, Code2, Send, Save, FolderOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

const TO_ADDRESS = 'contact@bowls-time.com';

function buildPreviewDoc(body) {
  const trimmed = (body || '').trim();
  const isFullHtml = /^<!DOCTYPE html/i.test(trimmed) || /^<html/i.test(trimmed);
  if (isFullHtml) return trimmed;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:Arial,sans-serif;font-size:14px;color:#111;background:#fff;padding:20px;">${trimmed.replace(/\n/g, '<br/>')}</body></html>`;
}

export default function BroadcastComposer({
  bccText,
  onBccChange,
  subject,
  onSubjectChange,
  body,
  onBodyChange,
  recipientCount,
  sending,
  onSendTest,
  onSaveTemplate,
  onLoadTemplate,
  onSend,
}) {
  const [previewMode, setPreviewMode] = useState(false);
  const canSend = recipientCount > 0 && subject.trim().length > 0 && body.trim().length > 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
      <h3 className="font-semibold text-gray-900">Compose email</h3>

      <div>
        <Label className="text-xs text-gray-600">To</Label>
        <Input value={TO_ADDRESS} readOnly className="h-9 bg-gray-50 text-gray-500" />
      </div>

      <div>
        <Label className="text-xs text-gray-600">
          BCC <span className="text-gray-400">({recipientCount} unique)</span>
        </Label>
        <Textarea
          value={bccText}
          onChange={(e) => onBccChange(e.target.value)}
          rows={3}
          placeholder="admin@club.co.uk; another@club.co.uk"
          className="text-sm"
        />
        <p className="text-xs text-gray-400 mt-1">
          Ticking admins fills this in. You can edit it by hand — addresses typed here tick the matching admin.
        </p>
      </div>

      <div>
        <Label className="text-xs text-gray-600">Subject</Label>
        <Input value={subject} onChange={(e) => onSubjectChange(e.target.value)} placeholder="Email subject" />
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
          <iframe
            title="Email preview"
            srcDoc={buildPreviewDoc(body)}
            sandbox=""
            className="w-full h-[420px] border rounded-md bg-white"
          />
        ) : (
          <Textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            rows={16}
            className="font-mono text-sm"
            placeholder="<p>Hello,</p>"
          />
        )}
        <p className="text-xs text-gray-400 mt-1">
          Either a complete HTML document (starting with &lt;!DOCTYPE html&gt; or &lt;html&gt;) or a plain text / HTML
          fragment is accepted. Fragments are wrapped in the standard BowlsTime email shell.
        </p>
      </div>

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
          Send to {recipientCount} admin{recipientCount === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
}