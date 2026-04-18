import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, ChevronDown, ChevronUp, Pencil, Check, X, GripVertical } from 'lucide-react';

const ROLE_COLOURS = {
  'Platform Admin': 'bg-red-100 text-red-700',
  'Club Admin': 'bg-purple-100 text-purple-700',
  'Steward': 'bg-amber-100 text-amber-700',
  'Selector': 'bg-blue-100 text-blue-700',
  'Member': 'bg-emerald-100 text-emerald-700',
  'All Members': 'bg-gray-100 text-gray-600',
  'Live Scorer': 'bg-pink-100 text-pink-700',
};

const ROLE_SUMMARY = [
  { role: 'Platform Admin', colour: ROLE_COLOURS['Platform Admin'], description: 'Full access to the entire platform. Manages all clubs, global settings, and platform-level content.' },
  { role: 'Club Admin', colour: ROLE_COLOURS['Club Admin'], description: 'Full access within their club. Manages members, bookings, selections, leagues, competitions, settings, and all club content.' },
  { role: 'Steward', colour: ROLE_COLOURS['Steward'], description: 'Can approve, reject, edit, move, and delete rink bookings. Useful for front-of-house club staff who manage the rink diary.' },
  { role: 'Selector', colour: ROLE_COLOURS['Selector'], description: 'Can create, edit, publish, and delete team selections. Can also trigger SMS notifications and print team sheets.' },
  { role: 'Live Scorer', colour: ROLE_COLOURS['Live Scorer'], description: 'Can enter live match scores via the Live Scoring page during a match.' },
  { role: 'Member', colour: ROLE_COLOURS['Member'], description: 'Standard club member. Can book rinks, view selections, mark availability, join roll-ups, and manage their own profile.' },
];

const DEFAULT_FEATURE_SECTIONS = [
  {
    section: 'Rink Booking', icon: '🎯',
    features: [
      { feature: 'Book a Rink', description: 'Reserve a rink for a session on a chosen date.', roles: ['Member', 'Club Admin', 'Steward'] },
      { feature: 'View Rink Grid', description: 'See the interactive rink availability grid for the current or any future date.', roles: ['All Members'] },
      { feature: 'My Bookings', description: 'View upcoming and past bookings you have personally made, with the ability to cancel future bookings.', roles: ['Member', 'Club Admin', 'Steward'] },
      { feature: 'Open Roll-up — Join', description: 'When the club enables open roll-ups, members can join an existing roll-up booking made by another member.', roles: ['Member', 'Club Admin'] },
      { feature: 'Private Roll-up', description: 'Create a roll-up that is not visible or joinable by other members.', roles: ['Member', 'Club Admin'] },
      { feature: 'Approve / Reject Bookings', description: 'Review pending booking requests and either approve or reject them, with optional admin notes.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Edit a Booking', description: 'Change the rink number, date, time, competition type, or format of an existing booking.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Move / Swap Bookings', description: 'Move a booking to a different rink or swap two existing bookings between rinks.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Delete a Booking', description: 'Permanently remove a booking from the system with audit log and email notification.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Bulk Booking Import', description: 'Upload a CSV file to create multiple bookings at once.', roles: ['Club Admin'] },
      { feature: 'TV / Rink Display', description: "A full-screen display-board view designed for a clubhouse TV, cycling through each day's rink bookings automatically.", roles: ['Club Admin', 'Steward'] },
      { feature: 'Bookings Audit Log', description: 'A timestamped log of every booking change with the responsible user recorded.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Team Selection', icon: '📋',
    features: [
      { feature: 'View Published Selections', description: 'See upcoming published team selections for all competitions.', roles: ['All Members'] },
      { feature: 'Mark Availability', description: 'Indicate whether you are available or unavailable for a specific match selection.', roles: ['Member', 'Club Admin', 'Selector'] },
      { feature: 'Create / Edit a Selection', description: 'Create a new team selection for any competition type, assigning members to rink positions.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Publish / Draft a Selection', description: 'Toggle a selection between Draft and Published. Members receive email notifications when published.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Print Team Sheet', description: 'Generate a formatted, printable team sheet using configurable templates.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Live Scoring', description: 'Enter and update live match scores rink-by-rink during a match.', roles: ['Selector', 'Club Admin', 'Live Scorer'] },
      { feature: 'Set User Unavailability', description: 'Mark a date range during which you are unavailable, so selectors can see this when choosing teams.', roles: ['All Members'] },
    ],
  },
  {
    section: 'Leagues', icon: '🏆',
    features: [
      { feature: 'View League Table', description: 'See the current standings for any active internal league.', roles: ['All Members'] },
      { feature: 'View Fixtures', description: 'Browse upcoming and past league fixtures, including dates, rink assignments, and scores.', roles: ['All Members'] },
      { feature: 'Create a League', description: 'Set up a new internal league with format, date range, session times, scoring rules, and rink assignments.', roles: ['Club Admin'] },
      { feature: 'Generate Fixtures', description: 'Automatically generate a round-robin fixture schedule for all teams in the league.', roles: ['Club Admin'] },
      { feature: 'Create Rink Bookings from Fixtures', description: 'Automatically create rink bookings for every generated league fixture.', roles: ['Club Admin'] },
      { feature: 'Enter / Edit Match Scores', description: 'Record or update the home and away scores for individual league fixtures.', roles: ['Club Admin'] },
      { feature: 'Print League Table', description: 'Generate a formatted printable league table using configurable templates and club branding.', roles: ['Club Admin'] },
      { feature: 'Generate Scorecards', description: 'Produce a PDF or XLSX scorecard file for all league fixtures.', roles: ['Club Admin'] },
      { feature: 'Manage Teams', description: 'Create, edit and delete league teams. Assign captains, rosters, and manage player unavailability.', roles: ['Club Admin'] },
      { feature: 'My League Teams', description: 'View your own team memberships, fixtures, and manage the playing rota if captain.', roles: ['Member', 'Club Admin'] },
    ],
  },
  {
    section: 'Competitions', icon: '🎖️',
    features: [
      { feature: 'Competition Draw (Knockout / Round Robin)', description: 'Create and manage internal club competition draws in knockout bracket or round-robin group formats.', roles: ['Club Admin'] },
      { feature: 'View Tournament Bracket', description: 'See the current bracket or round-robin standings for published tournaments.', roles: ['All Members'] },
      { feature: 'Competition Registration', description: 'Create competitions that members can self-register for, including team-based entries with fees and deadlines.', roles: ['Club Admin'] },
      { feature: 'Enter a Competition', description: 'Submit your own entry into an open club competition.', roles: ['Member', 'Club Admin'] },
      { feature: 'Withdraw an Entry', description: 'Cancel your competition entry before the deadline.', roles: ['Member', 'Club Admin'] },
      { feature: 'Open Competitions CRM', description: 'Track external teams or contacts for open competitions — contact details, follow-up status, and entry confirmation.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Members & Directory', icon: '👥',
    features: [
      { feature: 'Member Directory', description: 'Browse all active club members with contact details, membership groups, and roles. Searchable and filterable.', roles: ['All Members'] },
      { feature: 'My Profile', description: 'View and edit your own personal details, contact information, notification preferences, and club membership information.', roles: ['All Members'] },
      { feature: 'Approve / Reject Membership Requests', description: 'Review pending join requests from new members.', roles: ['Club Admin'] },
      { feature: 'Edit Member Details', description: "Update any member's profile including name, role, membership type, locker number, and contact details.", roles: ['Club Admin'] },
      { feature: 'Remove a Member', description: 'Mark a member as having left the club, removing their access while retaining their historical record.', roles: ['Club Admin'] },
      { feature: 'Bulk Member Import (CSV)', description: 'Upload a CSV file to add multiple members at once.', roles: ['Club Admin'] },
      { feature: 'Membership Fee Collection', description: 'Charge members an annual membership fee online via Stripe.', roles: ['Club Admin', 'Member'] },
      { feature: 'Kiosk Mode', description: 'Enable a touch-screen kiosk terminal where members log in by entering their unique 5-digit member ID.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Accolades & Badges', icon: '🏅',
    features: [
      { feature: 'View Own Accolades', description: 'Members can view all accolades and badges awarded to them on their Profile page.', roles: ['All Members'] },
      { feature: 'Create / Edit Accolades', description: 'Define custom accolades with a name, emoji icon, description, and winner rules.', roles: ['Club Admin'] },
      { feature: 'Manually Assign an Accolade', description: 'Award an accolade to a specific member manually.', roles: ['Club Admin'] },
      { feature: 'Auto-Trigger Accolades', description: 'Configure accolades to be automatically awarded when a member reaches a threshold.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Club Messaging', icon: '💬',
    features: [
      { feature: 'Send Messages', description: 'Post messages in club channels (General, Social, Selection, Announcements) visible to all approved members in real time.', roles: ['All Members'] },
      { feature: 'Channel Navigation', description: 'Switch between different topic channels within the club chat.', roles: ['All Members'] },
    ],
  },
  {
    section: 'Club Homepage', icon: '🏠',
    features: [
      { feature: 'View Club Homepage', description: "See the club's customisable landing page with news, upcoming matches, today's rinks, gallery, and more.", roles: ['All Members'] },
      { feature: 'Manage Homepage Sections', description: 'Show, hide, and reorder homepage sections.', roles: ['Club Admin'] },
      { feature: 'Publish News / Posts', description: 'Create and publish club announcements or news articles.', roles: ['Club Admin'] },
      { feature: 'Manage Gallery', description: 'Upload and manage photos displayed in the club gallery.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Platform Administration', icon: '🛠️',
    features: [
      { feature: 'Create / Manage Clubs', description: 'Create new clubs on the platform and toggle active status.', roles: ['Platform Admin'] },
      { feature: 'Manage Club Admins', description: 'Assign or remove admin access for users within any club.', roles: ['Platform Admin'] },
      { feature: 'Platform Statistics', description: 'View high-level statistics across all clubs: members, bookings, selections, and leagues.', roles: ['Platform Admin'] },
      { feature: 'Email Logs', description: 'View a log of all transactional emails sent through the platform.', roles: ['Platform Admin'] },
      { feature: 'User Feedback Management', description: 'Review, respond to, and update the status of feedback submissions from all platform users.', roles: ['Platform Admin'] },
      { feature: 'Feature Roadmap', description: 'View the prioritised list of recommended upcoming features and improvements.', roles: ['Platform Admin'] },
      { feature: 'Privacy Notice', description: "View and review the platform's draft GDPR-compliant privacy notice.", roles: ['Platform Admin'] },
    ],
  },
];

const STORAGE_KEY = 'bowlstime_feature_guide';

function loadSections() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_FEATURE_SECTIONS;
  } catch {
    return DEFAULT_FEATURE_SECTIONS;
  }
}

function FeatureSection({ sectionData, sectionIndex, onSaveSection }) {
  const [open, setOpen] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(sectionData);

  const handleSave = () => {
    onSaveSection(sectionIndex, draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(sectionData);
    setEditing(false);
  };

  const handleItemChange = (fi, field, value) => {
    setDraft(d => ({
      ...d,
      features: d.features.map((f, idx) => idx === fi ? { ...f, [field]: value } : f),
    }));
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const reordered = Array.from(draft.features);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setDraft(d => ({ ...d, features: reordered }));
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
        <button className="flex items-center gap-2 flex-1 text-left" onClick={() => setOpen(o => !o)}>
          <span className="text-lg">{sectionData.icon}</span>
          <span className="font-semibold text-gray-800 text-sm">{sectionData.section}</span>
          <span className="text-xs text-gray-400 ml-1">{sectionData.features.length} features</span>
        </button>
        <div className="flex items-center gap-1">
          {!editing ? (
            <Button size="sm" variant="ghost" onClick={() => { setDraft(sectionData); setOpen(true); setEditing(true); }}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" className="text-emerald-600" onClick={handleSave}>
                <Check className="w-3.5 h-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" variant="ghost" className="text-red-500" onClick={handleCancel}>
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
        editing ? (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId={`section-${sectionIndex}`}>
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="divide-y divide-gray-100">
                  {draft.features.map((f, fi) => (
                    <Draggable key={`${sectionIndex}-${fi}`} draggableId={`${sectionIndex}-${fi}`} index={fi}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`px-4 py-3 bg-white ${snapshot.isDragging ? 'shadow-lg ring-1 ring-emerald-300 rounded' : ''}`}
                        >
                          <div className="flex items-start gap-2">
                            <div {...provided.dragHandleProps} className="mt-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing shrink-0">
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <div className="flex-1 space-y-1.5">
                              <input
                                className="w-full border rounded px-2 py-1 text-sm font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                value={draft.features[fi].feature}
                                onChange={e => handleItemChange(fi, 'feature', e.target.value)}
                              />
                              <textarea
                                className="w-full border rounded px-2 py-1 text-sm text-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y min-h-[56px]"
                                value={draft.features[fi].description}
                                onChange={e => handleItemChange(fi, 'description', e.target.value)}
                              />
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {f.roles.map(role => (
                                  <span key={role} className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOURS[role] || 'bg-gray-100 text-gray-600'}`}>
                                    {role}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        ) : (
          <div className="divide-y divide-gray-100">
            {sectionData.features.map((f, fi) => (
              <div key={fi} className="px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2 mb-1">
                  <p className="font-medium text-gray-900 text-sm">{f.feature}</p>
                  <div className="flex flex-wrap gap-1">
                    {f.roles.map(role => (
                      <span key={role} className={`text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLOURS[role] || 'bg-gray-100 text-gray-600'}`}>
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <p className="text-sm text-gray-500">{f.description}</p>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

export default function FeatureGuideDoc() {
  const [sections, setSections] = useState(loadSections);

  const handleSaveSection = (index, updatedSection) => {
    const updated = sections.map((s, i) => i === index ? updatedSection : s);
    setSections(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-emerald-600" />
          Platform Feature Guide
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          A comprehensive reference of every feature in the BowlsTime platform mapped to the roles that can access them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Role Key</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROLE_SUMMARY.map(r => (
              <div key={r.role} className="flex items-start gap-2">
                <span className={`mt-0.5 shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${r.colour}`}>{r.role}</span>
                <p className="text-xs text-gray-600 leading-snug">{r.description}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {sections.map((s, i) => (
            <FeatureSection
              key={s.section}
              sectionData={s}
              sectionIndex={i}
              onSaveSection={handleSaveSection}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}