import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Pencil, Check, X } from 'lucide-react';

const STORAGE_KEY = 'bowlstime_privacy_notice';

const DEFAULT_PRIVACY_NOTICE = `BOWLSTIME PLATFORM — PRIVACY NOTICE (DRAFT)
Last updated: April 2026

1. WHO WE ARE
BowlsTime ("we", "us", "our") operates the BowlsTime platform, which provides club management software for lawn bowls clubs in the United Kingdom.

2. WHAT DATA WE COLLECT
We collect the following personal data when you use our platform:
- Full name, email address, and password (for account registration)
- Contact details including phone number and date of birth (optional, provided by you or your club)
- Emergency contact name and phone number (optional)
- Gender (optional)
- Membership details including membership type, start date, and locker number
- Rink booking history and team selection participation records
- League and competition entry records
- Payment information (processed via Stripe — we do not store card details)
- Communications sent via the Club Messaging feature

3. HOW WE USE YOUR DATA
Your data is used to:
- Provide you with access to the platform and your club's features
- Manage rink bookings, team selections, and league fixtures
- Send transactional email notifications (booking confirmations, team selections, etc.)
- Send SMS notifications if your club has enabled this feature and you have opted in
- Process membership fee payments where applicable
- Maintain an audit log of administrative actions for club governance purposes

4. LEGAL BASIS FOR PROCESSING
We process your personal data on the following legal bases:
- Contractual necessity: to provide you with the services you have requested
- Legitimate interests: to operate and improve the platform and ensure club management functions correctly
- Consent: for optional data fields and opt-in notifications

5. DATA SHARING
We share your data with:
- Your lawn bowls club (administrators can view member profiles and activity)
- Stripe (for payment processing) — see stripe.com/privacy
- Twilio (for SMS notifications where enabled) — see twilio.com/legal/privacy
- Base44 (our underlying platform infrastructure provider)
We do not sell your personal data to third parties.

6. DATA RETENTION
We retain your personal data for as long as you hold an active membership at a club on our platform. If you request deletion of your account, we will remove your personal data within 30 days, subject to any legal obligations to retain records.

7. YOUR RIGHTS
Under UK GDPR, you have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Request erasure of your data ("right to be forgotten")
- Object to or restrict processing
- Data portability
To exercise any of these rights, please contact your club administrator in the first instance.

8. SECURITY
We take appropriate technical and organisational measures to protect your personal data against unauthorised access, loss, or disclosure. All data is transmitted over HTTPS and stored securely.

9. COOKIES
Our platform uses essential cookies required for authentication and session management. We do not use tracking or advertising cookies.

10. CONTACT
If you have questions about this privacy notice or how we handle your data, please contact us at: privacy@bowlstime.co.uk

This is a draft document and is subject to review before publication.`;

function loadNotice() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_PRIVACY_NOTICE;
  } catch {
    return DEFAULT_PRIVACY_NOTICE;
  }
}

export default function PrivacyNoticeDoc() {
  const [text, setText] = useState(loadNotice);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);

  const handleSave = () => {
    setText(draft);
    localStorage.setItem(STORAGE_KEY, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(text);
    setEditing(false);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            Privacy Notice
          </CardTitle>
          {!editing ? (
            <Button size="sm" variant="outline" onClick={() => { setDraft(text); setEditing(true); }}>
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSave}>
                <Check className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="w-3.5 h-3.5 mr-1" /> Cancel
              </Button>
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">Draft GDPR-compliant privacy notice for the BowlsTime platform.</p>
      </CardHeader>
      <CardContent>
        {editing ? (
          <textarea
            className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y min-h-[600px]"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
        ) : (
          <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 border rounded-lg p-4">
            {text}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}