import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Lightbulb, ChevronDown, ChevronUp, Pencil, Check, X } from 'lucide-react';

const DEFAULT_ROADMAP_ITEMS = [
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
      { title: 'Recurring Booking Rules', description: "Let members create a recurring weekly booking (e.g. every Tuesday 2–4pm) subject to admin approval, rather than booking each session manually." },
      { title: 'Integration with Bowls England / Bowls Scotland Fixtures', description: "Automatically import county/national fixtures via published data feeds so clubs don't need to enter them manually." },
      { title: 'Member Portal White-Label', description: 'Allow club admins to use a custom subdomain (e.g. springfield.bowlstime.co.uk) for a more professional appearance.' },
      { title: 'Waiting Lists for Fully Booked Sessions', description: 'When a rink is fully booked, allow members to join a waiting list and be automatically notified if a spot becomes available.' },
      { title: 'Automated Backup & Data Export', description: 'One-click export of all club data (members, bookings, results) as a CSV/ZIP for GDPR compliance and disaster recovery.' },
      { title: 'Accolades / Badge System Enhancement', description: 'Extend accolades with automatic award triggers (e.g. "50 bookings" badge) rather than only manual assignment by admins.' },
    ],
  },
];

const STORAGE_KEY = 'bowlstime_roadmap';

function loadRoadmap() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_ROADMAP_ITEMS;
  } catch {
    return DEFAULT_ROADMAP_ITEMS;
  }
}

function RoadmapSection({ section, editingSection, onEditSection, onSaveSection, onCancelSection }) {
  const [open, setOpen] = useState(true);
  const isEditing = editingSection === section.category;
  const [draft, setDraft] = useState(section);

  const handleItemChange = (i, field, value) => setDraft(d => ({
    ...d,
    items: d.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item),
  }));

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="w-full flex items-center justify-between px-4 py-3 bg-gray-50">
        <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setOpen(o => !o)}>
          <Badge className={section.color}>{section.category}</Badge>
          <span className="text-sm text-gray-500">{section.items.length} items</span>
        </button>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button size="sm" variant="ghost" onClick={() => { setDraft(section); onEditSection(section.category); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="text-emerald-600" onClick={() => onSaveSection(draft)}>
                <Check className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={() => { setDraft(section); onCancelSection(); }}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </>
          )}
          <button onClick={() => setOpen(o => !o)}>
            {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="divide-y divide-gray-100">
          {(isEditing ? draft : section).items.map((item, i) => (
            <div key={i} className="px-4 py-3">
              {isEditing ? (
                <div className="space-y-1.5">
                  <input
                    className="w-full border rounded px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    value={draft.items[i].title}
                    onChange={e => handleItemChange(i, 'title', e.target.value)}
                  />
                  <textarea
                    className="w-full border rounded px-2 py-1 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y min-h-[60px]"
                    value={draft.items[i].description}
                    onChange={e => handleItemChange(i, 'description', e.target.value)}
                  />
                </div>
              ) : (
                <>
                  <p className="font-medium text-gray-900 text-sm">{item.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{item.description}</p>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RoadmapDoc() {
  const [sections, setSections] = useState(loadRoadmap);
  const [editingSection, setEditingSection] = useState(null);

  const handleSaveSection = (updatedSection) => {
    const updated = sections.map(s => s.category === updatedSection.category ? updatedSection : s);
    setSections(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEditingSection(null);
  };

  return (
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
        {sections.map(section => (
          <RoadmapSection
            key={section.category}
            section={section}
            editingSection={editingSection}
            onEditSection={setEditingSection}
            onSaveSection={handleSaveSection}
            onCancelSection={() => setEditingSection(null)}
          />
        ))}
      </CardContent>
    </Card>
  );
}