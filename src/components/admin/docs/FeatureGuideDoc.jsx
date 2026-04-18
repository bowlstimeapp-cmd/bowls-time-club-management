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
  { role: 'Platform Admin', colour: ROLE_COLOURS['Platform Admin'], description: 'Full access to the entire platform. Manages all clubs, global settings, and platform-level content. Set at the platform account level.' },
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
      { feature: 'Book a Rink', description: 'Reserve a rink for a session on a chosen date. Bookings can be marked as Club, County, National, Roll-up, Private Roll-up or Other competition types, with optional notes.', roles: ['Member', 'Club Admin', 'Steward'] },
      { feature: 'View Rink Grid', description: 'See the interactive rink availability grid for the current or any future date, showing all booked and available slots across all rinks.', roles: ['All Members'] },
      { feature: 'My Bookings', description: 'View upcoming and past bookings you have personally made, with the ability to cancel pending or approved future bookings.', roles: ['Member', 'Club Admin', 'Steward'] },
      { feature: 'Open Roll-up — Join', description: 'When the club enables open roll-ups, members can join an existing roll-up booking made by another member, up to the rink capacity.', roles: ['Member', 'Club Admin'] },
      { feature: 'Private Roll-up', description: 'Create a roll-up that is not visible or joinable by other members — for pre-arranged private groups.', roles: ['Member', 'Club Admin'] },
      { feature: 'Approve / Reject Bookings', description: 'Review pending booking requests and either approve or reject them, with the option to add admin notes. Rejected members receive an email notification.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Edit a Booking', description: 'Change the rink number, date, time, competition type, or format of an existing booking. Members are notified of changes.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Move / Swap Bookings', description: 'Move a booking to a different rink or swap two existing bookings between rinks, with automatic conflict checking.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Delete a Booking', description: 'Permanently remove a booking from the system. An audit log entry and email notification are created automatically.', roles: ['Club Admin', 'Steward'] },
      { feature: 'Bulk Booking Import', description: 'Upload a CSV file to create multiple bookings at once — useful for importing pre-planned league fixtures or competitions.', roles: ['Club Admin'] },
      { feature: 'Auto-Approve Bookings', description: 'Configure the club so that all new bookings are automatically approved without requiring manual admin review.', roles: ['Club Admin'] },
      { feature: 'Daily Bookings Summary (Print)', description: 'Generate a printable daily summary showing all approved bookings, including league fixture participants and team selection rosters, grouped by time slot.', roles: ['Club Admin', 'Steward'] },
      { feature: 'TV / Rink Display', description: "A full-screen display-board view designed for a TV or wall screen in the clubhouse, cycling through each day's rink bookings automatically.", roles: ['Club Admin', 'Steward'] },
      { feature: 'Bookings Audit Log', description: 'A timestamped log of every booking change — creation, edits, moves, approvals and deletions — with the responsible user recorded.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Team Selection', icon: '📋',
    features: [
      { feature: 'View Published Selections', description: 'See upcoming published team selections for all competitions. Members can view which rinks they are assigned to and who else is playing.', roles: ['All Members'] },
      { feature: 'Mark Availability', description: 'Indicate whether you are available or unavailable for a specific match selection, giving selectors real-time availability information.', roles: ['Member', 'Club Admin', 'Selector'] },
      { feature: 'Create / Edit a Selection', description: 'Create a new team selection for any competition type (Bramley, Wessex League, Denny, Top Club, Friendly, Fantastic 5s, etc.), assigning members to rink positions.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Publish / Draft a Selection', description: 'Toggle a selection between Draft (admin-only visible) and Published (visible to all members). Members receive email notifications when published.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Delete a Selection', description: 'Permanently remove a draft or published selection from the system.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Print Team Sheet', description: 'Generate a formatted, printable team sheet for a selection using configurable templates (Classic, Compact, Modern, Bowls). Supports club colour and font size customisation.', roles: ['Selector', 'Club Admin'] },
      { feature: 'Live Scoring', description: 'Enter and update live match scores rink-by-rink during a match. Results are displayed in real-time and feed back into the selection record.', roles: ['Selector', 'Club Admin', 'Live Scorer'] },
      { feature: 'Set User Unavailability', description: 'Mark a date range during which you are unavailable (e.g. holiday), so selectors can see this when choosing teams.', roles: ['All Members'] },
    ],
  },
  {
    section: 'Leagues', icon: '🏆',
    features: [
      { feature: 'View League Table', description: 'See the current standings for any active internal league, including points, shots for/against, and win/loss records.', roles: ['All Members'] },
      { feature: 'View Fixtures', description: 'Browse upcoming and past league fixtures, including dates, rink assignments, and scores where available.', roles: ['All Members'] },
      { feature: 'Create a League', description: 'Set up a new internal league with a name, format (Triples/Fours), date range, session times, scoring rules, and rink assignments.', roles: ['Club Admin'] },
      { feature: 'Generate Fixtures', description: 'Automatically generate a round-robin fixture schedule for all teams in the league, with options for even distribution, blacklisted dates, and adjacent rink clustering.', roles: ['Club Admin'] },
      { feature: 'Create Rink Bookings from Fixtures', description: 'Automatically create rink bookings for every generated league fixture, saving manual re-entry of all match slots.', roles: ['Club Admin'] },
      { feature: 'Enter / Edit Match Scores', description: 'Record or update the home and away scores (and sets, if applicable) for individual league fixtures.', roles: ['Club Admin'] },
      { feature: 'Print League Table', description: 'Generate a formatted printable league table using configurable templates and club branding.', roles: ['Club Admin'] },
      { feature: 'Generate Scorecards', description: 'Produce a PDF or XLSX scorecard file for all league fixtures, ready for printing and distribution to teams.', roles: ['Club Admin'] },
      { feature: 'Manage Teams', description: 'Create, edit and delete league teams. Assign captains and player rosters. Manage player unavailability per team.', roles: ['Club Admin'] },
      { feature: 'My League Teams', description: 'View your own team memberships, see your fixtures, and (if captain) manage the playing rota — auto-generating player assignments based on availability.', roles: ['Member', 'Club Admin'] },
      { feature: 'Blacklist Dates', description: 'Mark specific dates on which no league fixtures should be scheduled (e.g. club events, bank holidays).', roles: ['Club Admin'] },
      { feature: 'Sets Scoring Mode', description: 'Enable per-set scoring for leagues that use a sets format, with configurable points per set win and overall game win.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Competitions', icon: '🎖️',
    features: [
      { feature: 'Competition Draw (Knockout / Round Robin)', description: 'Create and manage internal club competition draws. Supports knockout bracket and round-robin group formats across Singles, Pairs, Triples and Fours.', roles: ['Club Admin'] },
      { feature: 'View Tournament Bracket', description: 'See the current bracket or round-robin standings for published tournaments.', roles: ['All Members'] },
      { feature: 'Competition Registration', description: 'Create competitions that members can self-register for, including team-based entries (pairs, triples, fours). Supports entry fees and closing deadlines.', roles: ['Club Admin'] },
      { feature: 'Enter a Competition', description: 'Submit your own entry (and team members) into an open club competition via the Competition Entries page.', roles: ['Member', 'Club Admin'] },
      { feature: 'Withdraw an Entry', description: 'Cancel your competition entry before the deadline.', roles: ['Member', 'Club Admin'] },
      { feature: 'Open Competitions CRM', description: 'Track external teams or contacts for open competitions — manage contact details, follow-up status, and entry confirmation.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Members & Directory', icon: '👥',
    features: [
      { feature: 'Member Directory', description: 'Browse all active club members with contact details, membership groups, and roles. Searchable by name or email and filterable by membership type.', roles: ['All Members'] },
      { feature: 'My Profile', description: 'View and edit your own personal details, contact information, emergency contact, notification preferences, and club membership information.', roles: ['All Members'] },
      { feature: 'Approve / Reject Membership Requests', description: 'Review pending join requests from new members and approve or reject them.', roles: ['Club Admin'] },
      { feature: 'Edit Member Details', description: "Update any member's profile including name, role, membership type, locker number, and contact details.", roles: ['Club Admin'] },
      { feature: 'Change Member Role', description: "Assign or change a member's role within the club (Admin, Steward, Selector, Live Scorer, Member).", roles: ['Club Admin'] },
      { feature: 'Remove a Member', description: 'Mark a member as having left the club, removing their access while retaining their historical record.', roles: ['Club Admin'] },
      { feature: 'Bulk Member Import (CSV)', description: 'Upload a CSV file to add multiple members at once, including names, emails, phone numbers, membership types, and locker numbers.', roles: ['Club Admin'] },
      { feature: 'Invite a New Member', description: 'Send an email invitation to a prospective member so they can register and request to join the club.', roles: ['Club Admin'] },
      { feature: 'Membership Fee Collection', description: 'Charge members an annual membership fee online via Stripe. Members can pay from their Profile page, and admins can see who has paid.', roles: ['Club Admin', 'Member'] },
      { feature: 'Kiosk Mode', description: 'Enable a touch-screen kiosk terminal in the clubhouse where members can log in by entering their unique 5-digit member ID, then make bookings on their behalf.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Accolades & Badges', icon: '🏅',
    features: [
      { feature: 'View Own Accolades', description: 'Members can view all accolades and badges that have been awarded to them on their Profile page.', roles: ['All Members'] },
      { feature: 'Create / Edit Accolades', description: 'Define custom accolades for the club with a name, emoji icon, description, and whether multiple members can hold it simultaneously.', roles: ['Club Admin'] },
      { feature: 'Manually Assign an Accolade', description: 'Award an accolade to a specific member manually.', roles: ['Club Admin'] },
      { feature: 'Auto-Trigger Accolades', description: 'Configure accolades to be automatically awarded when a member reaches a threshold (e.g. 10 bookings, 25 match selections, first booking).', roles: ['Club Admin'] },
      { feature: 'Retroactive Accolade Sweep', description: 'Run a one-click sweep to evaluate all existing member activity against auto-trigger rules, retroactively awarding any accolades not yet assigned.', roles: ['Club Admin'] },
      { feature: 'Seed Standard Accolades', description: 'Instantly populate the club with a library of 12 pre-configured standard accolades to get started quickly.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Club Messaging', icon: '💬',
    features: [
      { feature: 'Send Messages', description: 'Post messages in club channels (General, Social, Selection, Announcements). Messages are visible to all approved club members in real time.', roles: ['All Members'] },
      { feature: 'Channel Navigation', description: 'Switch between different topic channels within the club chat.', roles: ['All Members'] },
    ],
  },
  {
    section: 'Club Homepage', icon: '🏠',
    features: [
      { feature: 'View Club Homepage', description: "See the club's customisable landing page with configurable sections: hero banner, news posts, upcoming matches, today's rinks, gallery, fixtures, match results, and member spotlight.", roles: ['All Members'] },
      { feature: 'Manage Homepage Sections', description: 'Show, hide, and reorder homepage sections to control what members see on the club home page.', roles: ['Club Admin'] },
      { feature: 'Publish News / Posts', description: 'Create and publish club announcements or news articles that appear in the News section of the homepage.', roles: ['Club Admin'] },
      { feature: 'Manage Gallery', description: 'Upload and manage photos displayed in the club gallery section of the homepage.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Function Rooms', icon: '🏢',
    features: [
      { feature: 'View Function Room Availability', description: 'Browse available function rooms and their bookings.', roles: ['All Members'] },
      { feature: 'Manage Function Room Bookings', description: 'Create, edit, and manage enquiries and confirmed bookings for club function rooms.', roles: ['Club Admin'] },
      { feature: 'External Booking API', description: "A REST endpoint allowing external websites (e.g. a club's own website) to submit function room booking enquiries directly.", roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Notifications', icon: '🔔',
    features: [
      { feature: 'In-App Notifications', description: 'Receive bell-icon notifications for booking approvals/rejections, team selection announcements, and league or team activity.', roles: ['All Members'] },
      { feature: 'Email Notifications', description: 'Automatically receive emails when a booking is approved, rejected, or changed; when you are selected for a match; or when a team invite/request is accepted or rejected.', roles: ['All Members'] },
      { feature: 'SMS Notifications', description: 'Optional SMS alerts for team selection notifications (requires Twilio to be configured and the SMS module to be enabled for the club).', roles: ['Club Admin', 'Selector'] },
    ],
  },
  {
    section: 'Club Settings & Configuration', icon: '⚙️',
    features: [
      { feature: 'General Club Settings', description: 'Set the club name, description, logo, rink count, opening/closing times, session duration (fixed or custom), and default landing page.', roles: ['Club Admin'] },
      { feature: 'Module Toggles', description: 'Enable or disable individual platform modules per club: Rink Booking, Team Selection, Competitions, Leagues, SMS Notifications, Club Homepage, Function Rooms, Custom Branding, Accolades, and Messaging.', roles: ['Club Admin', 'Platform Admin'] },
      { feature: 'Membership Types Management', description: 'Define the membership categories available at the club (e.g. Winter Indoor Member, Social Member).', roles: ['Club Admin'] },
      { feature: 'Competition Types Management', description: 'Add, edit, or remove the competition types available when creating team selections (e.g. Bramley, Wessex League).', roles: ['Club Admin'] },
      { feature: 'Team Sheet Customisation', description: 'Choose a print template (Classic, Compact, Modern, Bowls), set primary colour, font size, and toggle fields such as dress code, venue, and start time. Advanced mode allows full custom HTML.', roles: ['Club Admin'] },
      { feature: 'League Table Print Customisation', description: 'Configure the printed league table template style, colour, font size, and optional footer text.', roles: ['Club Admin'] },
      { feature: 'Scorecard Layout Editor', description: 'A drag-and-drop visual editor for designing custom scorecard layouts for PDF/XLSX generation.', roles: ['Club Admin'] },
      { feature: 'Stripe Membership Payments Setup', description: "Configure the club's own Stripe keys and membership fee amount/description to enable online payment collection.", roles: ['Club Admin'] },
      { feature: 'Club Theme', description: 'Select the accent colour theme for the club UI from six preset themes: Emerald, Blue, Purple, Slate, Rose, or Amber.', roles: ['Club Admin'] },
      { feature: 'TV Display Settings', description: 'Set how many seconds the TV rink display shows each day before cycling to the next.', roles: ['Club Admin'] },
    ],
  },
  {
    section: 'Platform Administration', icon: '🛠️',
    features: [
      { feature: 'Create / Manage Clubs', description: 'Create new clubs on the platform, configure their slug and admin email, and toggle active status.', roles: ['Platform Admin'] },
      { feature: 'Manage Club Admins', description: 'Assign or remove platform-level admin access for users within any club.', roles: ['Platform Admin'] },
      { feature: 'Platform Statistics', description: 'View high-level statistics across all clubs: total members, bookings, selections, and leagues.', roles: ['Platform Admin'] },
      { feature: 'Email Logs', description: 'View a log of all transactional emails sent through the platform, including recipient, subject, and timestamp.', roles: ['Platform Admin'] },
      { feature: 'User Feedback Management', description: 'Review, respond to, and update the status of feedback submissions from all platform users.', roles: ['Platform Admin'] },
      { feature: 'Platform Competitions', description: 'Manage cross-club competitions at the platform level.', roles: ['Platform Admin'] },
      { feature: 'Feature Roadmap', description: 'View the prioritised list of recommended upcoming features and improvements for the platform.', roles: ['Platform Admin'] },
      { feature: 'Feature Guide (this document)', description: 'A comprehensive reference of all platform features mapped to the roles that can access them.', roles: ['Platform Admin'] },
      { feature: 'Privacy Notice', description: "View and review the platform's draft GDPR-compliant privacy notice.", roles: ['Platform Admin'] },
      { feature: 'Generate Test Data', description: 'Populate a club with realistic test bookings, members, and selections for development and demonstration purposes.', roles: ['Platform Admin'] },
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
          <span className="text-xs text-gray-400 ml-1">{sectionData.features.length} feature{sectionData.features.length !== 1 ? 's' : ''}</span>
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
          A comprehensive reference of every feature in the BowlsTime platform. Click <Pencil className="w-3 h-3 inline" /> on any section to edit text and drag features to reorder them.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Role key */}
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
        {/* Sections */}
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