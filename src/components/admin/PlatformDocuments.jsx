import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Lightbulb, ShieldCheck, ChevronDown, ChevronUp } from 'lucide-react';

const ROADMAP_ITEMS = [
  {
    category: 'High Priority',
    color: 'bg-red-100 text-red-700',
    items: [
      { title: 'Club Messaging Mobile Optimisation', description: 'The new instant messaging feature needs a fully responsive/mobile-first layout with a collapsible channel sidebar on small screens.' },
      { title: 'Push Notifications', description: 'Enable browser push notifications so members receive alerts for new messages, booking approvals, and team selections without being in the app.' },
      { title: 'Member Self-Registration', description: 'Allow potential members to discover and apply to join a club without needing an admin invite link. Includes an approval workflow.' },
      { title: 'Club Theme Application', description: 'The club_theme setting is stored but not yet fully applied site-wide. Extend the ClubThemeProvider so all buttons, badges and accent colours reflect the chosen theme.' },
    ],
  },
  {
    category: 'Medium Priority',
    color: 'bg-amber-100 text-amber-700',
    items: [
      { title: 'Availability Calendar', description: 'Give members a visual monthly calendar to mark blocks of unavailability rather than just date ranges, with a view for selectors to see at-a-glance who is free.' },
      { title: 'Match Result Entry for Members', description: 'Allow any approved member (not just admins) to enter match results from the Selection page, with an optional admin approval step.' },
      { title: 'League Fixture Score Notifications', description: 'Automatically email or notify captains when a league fixture result is entered or updated.' },
      { title: 'Stripe Billing Dashboard for Clubs', description: 'A dedicated tab in Club Settings showing payment history and membership fee transactions without the admin having to go to Stripe directly.' },
      { title: 'Bulk Member Import Improvements', description: 'Support importing membership numbers, dates of birth, gender and emergency contacts in the CSV bulk upload, with a preview/validation step.' },
      { title: 'Club Announcements / Pinned Messages', description: 'Allow admins to pin an important announcement at the top of the messaging page or the club homepage, separate from regular chat.' },
    ],
  },
  {
    category: 'Lower Priority / Future',
    color: 'bg-gray-100 text-gray-600',
    items: [
      { title: 'Inter-Club Messaging', description: 'Extend messaging so selectors can message away-team captains for Friendly / match coordination across clubs on the platform.' },
      { title: 'Live Scoring Public View', description: 'A shareable, unauthenticated read-only URL for live match scores that could be shown on a TV or sent to supporters.' },
      { title: 'Recurring Booking Rules', description: 'Let members create a recurring weekly booking (e.g. every Tuesday 2–4pm) subject to admin approval, rather than booking each session manually.' },
      { title: 'Integration with Bowls England / Bowls Scotland Fixtures', description: 'Automatically import county/national fixtures via published data feeds so clubs don\'t need to enter them manually.' },
      { title: 'Member Portal White-Label', description: 'Allow club admins to use a custom subdomain (e.g. springfield.bowlstime.co.uk) for a more professional appearance.' },
      { title: 'Waiting Lists for Fully Booked Sessions', description: 'When a rink is fully booked, allow members to join a waiting list and be automatically notified if a spot becomes available.' },
      { title: 'Automated Backup & Data Export', description: 'One-click export of all club data (members, bookings, results) as a CSV/ZIP for GDPR compliance and disaster recovery.' },
      { title: 'Accolades / Badge System Enhancement', description: 'Extend accolades with automatic award triggers (e.g. "50 bookings" badge) rather than only manual assignment by admins.' },
    ],
  },
];

const PRIVACY_NOTICE = `PRIVACY NOTICE
Bowls Time
Last updated: April 2026

1. WHO WE ARE
Bowls Time ("we", "us", "our") is the operator of the BowlsTime platform, accessible via bowlstime.co.uk and associated applications. We provide a club management and member communication platform specifically designed for lawn bowls clubs.

We are the data controller for data we collect directly (e.g. your account registration details). Bowls clubs that use our platform are independent data controllers for the data they collect about their members through the platform.

Contact: privacy@bowlstime.co.uk

2. WHAT DATA WE COLLECT
We collect and process the following categories of personal data:

Account Data: Your name, email address, and any profile information you provide when registering (including optional fields such as title, phone number, date of birth, gender, locker number, and emergency contact details).

Usage Data: Pages visited, features used, and actions taken within the application (used for service improvement and debugging).

Communications: Messages sent within the Club Messaging feature, feedback submissions, and any direct correspondence with us.

Payment Data: If you pay a club membership fee online, payment processing is handled by Stripe. We do not store full card details. We retain transaction references and amounts.

3. HOW YOUR DATA IS USED
We use your personal data to:
• Provide and maintain the BowlsTime platform and your account
• Enable clubs to manage members, bookings, team selections, and leagues
• Send you notifications about bookings, team selections, and messages (where enabled)
• Respond to feedback and support requests
• Improve the platform through anonymised analytics
• Comply with legal obligations

4. LEGAL BASIS FOR PROCESSING
We rely on the following lawful bases under UK GDPR:
• Contract: Processing necessary to deliver the service you have signed up for.
• Legitimate Interests: Analytics, security monitoring, and service improvement.
• Consent: Email marketing or non-essential communications (where applicable).
• Legal Obligation: Compliance with applicable laws.

5. YOUR CLUB AS DATA CONTROLLER
Bowls clubs that use BowlsTime are independent data controllers. When a club admin manages your membership record — including approving or rejecting membership, recording your details, or assigning you to a team — the club is acting as a data controller in its own right. You should refer to your club's own privacy notice for information about how they process your data. Any requests to access, correct, or delete membership data held by a specific club should be directed to that club's administrator.

6. DATA HOSTING & THIRD-PARTY PROCESSORS
All application data is hosted and managed by Base44 (base44.com), our development and infrastructure platform. Base44 provides the underlying database, authentication, file storage, and backend function execution. Data is stored in accordance with Base44's own data processing terms and privacy commitments. We have a data processing agreement in place with Base44.

Other third-party processors we use:
• Stripe – Payment processing (see stripe.com/gb/privacy)
• Twilio – Optional SMS notifications (see twilio.com/en-us/legal/privacy)
• Email delivery provider – Transactional email delivery

7. DATA RETENTION
Account data is retained for as long as your account is active. If you request account deletion, we will remove your personal data within 30 days, subject to any legal retention obligations. Club membership records held by individual clubs are subject to that club's retention policies.

8. DATA TRANSFERS
Your data may be processed outside the UK/EEA by our service providers. Where this occurs, appropriate safeguards (such as Standard Contractual Clauses) are in place.

9. YOUR RIGHTS
Under UK GDPR you have the right to:
• Access the personal data we hold about you
• Correct inaccurate data
• Request deletion of your data ("right to be forgotten")
• Object to or restrict certain processing
• Data portability
• Withdraw consent at any time (where processing is based on consent)

To exercise these rights, contact us at privacy@bowlstime.co.uk. You also have the right to lodge a complaint with the Information Commissioner's Office (ico.org.uk).

10. COOKIES
The BowlsTime web application uses essential cookies and local storage for authentication and session management. We do not use advertising or tracking cookies.

11. CHANGES TO THIS NOTICE
We may update this privacy notice from time to time. We will notify users of material changes via the application.`;

function RoadmapSection({ category, color, items }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-2">
          <Badge className={color}>{category}</Badge>
          <span className="text-sm text-gray-500">{items.length} items</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <div key={i} className="px-4 py-3">
              <p className="font-medium text-gray-900 text-sm">{item.title}</p>
              <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PlatformDocuments() {
  const [activeDoc, setActiveDoc] = useState('roadmap');

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveDoc('roadmap')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDoc === 'roadmap' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <Lightbulb className="w-4 h-4" />
          Feature Roadmap
        </button>
        <button
          onClick={() => setActiveDoc('privacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeDoc === 'privacy' ? 'bg-emerald-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          <ShieldCheck className="w-4 h-4" />
          Privacy Notice
        </button>
      </div>

      {activeDoc === 'roadmap' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              Feature Roadmap & Recommendations
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              An assessment of recommended features and improvements for the BowlsTime platform, prioritised by impact and feasibility.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {ROADMAP_ITEMS.map((section) => (
              <RoadmapSection key={section.category} {...section} />
            ))}
          </CardContent>
        </Card>
      )}

      {activeDoc === 'privacy' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Privacy Notice — Bowls Time
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Draft privacy notice for review. Update contact details, dates and legal entity information before publishing.
            </p>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 border rounded-lg p-6">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {PRIVACY_NOTICE}
              </pre>
            </div>
            <p className="text-xs text-amber-600 mt-3 bg-amber-50 border border-amber-100 rounded p-2">
              ⚠ This is a draft for review. Before publishing, ensure you review it with a legal professional, confirm your ICO registration, and populate accurate contact and company details.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}