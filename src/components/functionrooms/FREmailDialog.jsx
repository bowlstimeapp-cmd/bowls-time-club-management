import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const TEMPLATES = [
  {
    key: 'initial',
    label: 'Initial Response',
    subject: (b) => `Your Enquiry – ${b.room_name}`,
    body: (b) => `Dear ${b.contact_name},\n\nThank you for your enquiry about hiring ${b.room_name} on ${b.date} from ${b.start_time} to ${b.end_time}.\n\nWe have received your request and will be in touch shortly to discuss your requirements further.\n\nKind regards,\nThe Events Team`,
  },
  {
    key: 'followup',
    label: 'Follow-up',
    subject: (b) => `Following Up – ${b.room_name} Enquiry`,
    body: (b) => `Dear ${b.contact_name},\n\nI'm following up on your recent enquiry about hiring ${b.room_name} on ${b.date}.\n\nWe'd love to help make your event a success. Please don't hesitate to get in touch if you have any questions or would like to discuss your requirements.\n\nKind regards,\nThe Events Team`,
  },
  {
    key: 'provisional',
    label: 'Provisional Hold',
    subject: (b) => `Provisional Hold Confirmed – ${b.room_name}`,
    body: (b) => `Dear ${b.contact_name},\n\nWe are pleased to confirm that we have placed a provisional hold on ${b.room_name} for ${b.date} from ${b.start_time} to ${b.end_time}.\n\nThis hold will be kept for 7 days, during which we will work together to finalise the arrangements. Please contact us as soon as possible to confirm the booking.\n\nKind regards,\nThe Events Team`,
  },
  {
    key: 'confirmed',
    label: 'Booking Confirmed',
    subject: (b) => `Booking Confirmed – ${b.room_name} on ${b.date}`,
    body: (b) => `Dear ${b.contact_name},\n\nWe are delighted to confirm your booking of ${b.room_name} on ${b.date} from ${b.start_time} to ${b.end_time}${b.duration_hours ? ` (${b.duration_hours} hours)` : ''}.\n\n${b.attendees ? `We look forward to welcoming you and your ${b.attendees} guests.\n\n` : ''}Should you have any questions before your event, please don't hesitate to contact us.\n\nKind regards,\nThe Events Team`,
  },
  {
    key: 'unable',
    label: 'Unable to Accommodate',
    subject: (b) => `Re: Your Enquiry – ${b.room_name}`,
    body: (b) => `Dear ${b.contact_name},\n\nThank you for your enquiry about hiring ${b.room_name} on ${b.date}.\n\nUnfortunately we are unable to accommodate your request on this occasion. We apologise for any inconvenience this may cause.\n\nWe would be happy to discuss alternative dates or arrangements if that would be helpful.\n\nKind regards,\nThe Events Team`,
  },
];

export default function FREmailDialog({ booking, open, onClose }) {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [selected, setSelected] = useState(null);

  const applyTemplate = (tpl) => {
    setSelected(tpl.key);
    setSubject(tpl.subject(booking));
    setBody(tpl.body(booking));
  };

  const handleSend = async () => {
    if (!subject || !body) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: booking.contact_email,
      subject,
      body: body.replace(/\n/g, '<br>'),
    });
    setSending(false);
    toast.success(`Email sent to ${booking.contact_email}`);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-emerald-600" />
            Send Email to {booking?.contact_name}
          </DialogTitle>
        </DialogHeader>

        {/* Template Buttons */}
        <div>
          <Label className="text-xs text-gray-500 uppercase tracking-wide mb-2 block">Choose a template</Label>
          <div className="flex flex-wrap gap-2">
            {TEMPLATES.map(tpl => (
              <button
                key={tpl.key}
                onClick={() => applyTemplate(tpl)}
                className={`text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  selected === tpl.key
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-300'
                }`}
              >
                {tpl.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <Label>To</Label>
            <Input value={booking?.contact_email || ''} readOnly className="bg-gray-50 text-gray-600" />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Email subject..." />
          </div>
          <div>
            <Label>Message</Label>
            <Textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Select a template above or write your message..."
              rows={10}
              className="font-mono text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            onClick={handleSend}
            disabled={!subject || !body || sending}
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Send Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}