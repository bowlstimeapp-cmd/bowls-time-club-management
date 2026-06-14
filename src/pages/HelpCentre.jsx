import React, { useState } from 'react';
import {
  LogIn, Calendar, CalendarCheck, ClipboardList, Users, Trophy,
  BarChart2, Newspaper, Bell, HelpCircle, AlertTriangle, Phone,
  ChevronDown, ChevronUp, CheckCircle, Info, Lightbulb, Search, X,
  Star, BookOpen,
} from 'lucide-react';

// ─── Reusable building blocks ──────────────────────────────────────────────

function SectionAnchor({ id }) {
  return <span id={id} className="-mt-20 pt-20 block" aria-hidden="true" />;
}

function Step({ number, children }) {
  return (
    <div className="flex gap-3 items-start">
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center">
        {number}
      </span>
      <p className="text-gray-700 pt-0.5 leading-relaxed">{children}</p>
    </div>
  );
}

function Tip({ children }) {
  return (
    <div className="flex gap-2 items-start bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-500" />
      <p><strong>Tip: </strong>{children}</p>
    </div>
  );
}

function Note({ children }) {
  return (
    <div className="flex gap-2 items-start bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
      <Info className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-500" />
      <p>{children}</p>
    </div>
  );
}

function Placeholder({ text }) {
  return (
    <span className="inline-block bg-yellow-100 border border-yellow-300 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded">
      {'📋 ' + text}
    </span>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3.5 text-left bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span className="font-medium text-gray-800 pr-4 text-sm leading-snug">{question}</span>
        {open
          ? <ChevronUp className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          : <ChevronDown className="w-4 h-4 flex-shrink-0 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 text-sm text-gray-700 leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}

function SectionCard({ icon: Icon, title, color = 'emerald', children }) {
  const colors = {
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    purple: 'bg-purple-50 border-purple-200 text-purple-700',
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    rose: 'bg-rose-50 border-rose-200 text-rose-700',
    slate: 'bg-slate-50 border-slate-200 text-slate-700',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-4 border-b ${colors[color]}`}>
        <Icon className="w-5 h-5 flex-shrink-0" />
        <h2 className="text-lg font-bold">{title}</h2>
      </div>
      <div className="px-5 py-5 space-y-4">{children}</div>
    </div>
  );
}

// ─── Nav sidebar items ──────────────────────────────────────────────────────

const NAV = [
  { id: 'welcome',         label: 'Welcome',               icon: Star },
  { id: 'getting-started', label: 'Getting Started',       icon: LogIn },
  { id: 'booking',         label: 'Booking a Rink',        icon: Calendar },
  { id: 'selection',       label: 'Match Selection',       icon: ClipboardList },
  { id: 'leagues',         label: 'League Teams',          icon: Users },
  { id: 'competitions',    label: 'Club Competitions',     icon: Trophy },
  { id: 'draws',           label: 'Draws & Results',       icon: BarChart2 },
  { id: 'fixtures',        label: 'Fixtures & Events',     icon: CalendarCheck },
  { id: 'news',            label: 'News & Announcements',  icon: Newspaper },
  { id: 'notifications',   label: 'Notifications',         icon: Bell },
  { id: 'faq',             label: 'FAQs',                  icon: HelpCircle },
  { id: 'troubleshooting', label: 'Troubleshooting',       icon: AlertTriangle },
  { id: 'contact',         label: 'Contact & Support',     icon: Phone },
];

// ─── Main page ──────────────────────────────────────────────────────────────

export default function HelpCentre() {
  const [search, setSearch] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="bg-gradient-to-br from-emerald-700 to-emerald-500 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-3">
            <BookOpen className="w-8 h-8 opacity-80" />
            <span className="text-emerald-100 font-medium text-sm uppercase tracking-widest">Help Centre</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold mb-2">How can we help you?</h1>
          <p className="text-emerald-100 text-base sm:text-lg max-w-xl">
            Everything you need to get the most from your club app — written in plain English, step by step.
          </p>
          <div className="mt-6 relative max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search the Help Centre…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl text-gray-900 bg-white shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-300 text-sm"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {search && (
            <p className="mt-2 text-emerald-100 text-xs">
              Use Ctrl+F / Cmd+F on your keyboard to search this page, or scroll through the sections below.
            </p>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mobile nav toggle */}
        <button
          className="md:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3 mb-6 shadow-sm"
          onClick={() => setMobileNavOpen(o => !o)}
        >
          <span className="font-semibold text-gray-700 text-sm">Jump to a section</span>
          {mobileNavOpen
            ? <ChevronUp className="w-4 h-4 text-gray-500" />
            : <ChevronDown className="w-4 h-4 text-gray-500" />}
        </button>
        {mobileNavOpen && (
          <div className="md:hidden bg-white border border-gray-200 rounded-xl shadow-sm mb-6 overflow-hidden">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 border-b last:border-0 transition-colors text-left"
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-8">
          {/* Sticky sidebar — desktop only */}
          <aside className="hidden md:block w-56 flex-shrink-0">
            <div className="sticky top-24 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
              <p className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-widest border-b">Sections</p>
              {NAV.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-600 hover:bg-emerald-50 hover:text-emerald-700 border-b last:border-0 transition-colors text-left"
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>
          </aside>

          {/* Content */}
          <main className="flex-1 space-y-8 min-w-0">

            {/* WELCOME */}
            <SectionAnchor id="welcome" />
            <SectionCard icon={Star} title="Welcome to the BowlsTime App" color="emerald">
              <p className="text-gray-700 leading-relaxed">
                Welcome! This app has been designed to make club life easier for every member — whether you are booking a rink, checking who has been selected for the next match, or entering a club competition.
              </p>
              <p className="text-gray-700 leading-relaxed">
                It works on your phone, tablet, or computer. There is nothing to download, and you can log in from anywhere with an internet connection.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-2">
                {[
                  ['Book rinks online', 'No more phone calls — check availability and book in seconds.'],
                  ['See match selections', 'Find out if you have been selected and view the full team sheet.'],
                  ['Enter competitions', 'Sign up for club competitions quickly and easily.'],
                  ['Stay informed', 'Receive notifications and read club news all in one place.'],
                ].map(([title, desc]) => (
                  <div key={title} className="flex gap-2 p-3 bg-emerald-50 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-800">{title}</p>
                      <p className="text-xs text-emerald-700 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <Note>If you ever get stuck, there is a Live Chat button at the bottom right of every page. Do not hesitate to use it!</Note>
            </SectionCard>

            {/* GETTING STARTED */}
            <SectionAnchor id="getting-started" />
            <SectionCard icon={LogIn} title="Getting Started" color="blue">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">How to log in</h3>
                  <div className="space-y-2">
                    <Step number={1}>Open the app in your web browser, or tap your saved bookmark.</Step>
                    <Step number={2}>Enter your email address. This is the address you used when you joined the club. If you are unsure, ask your club administrator.</Step>
                    <Step number={3}>You will receive an email with a secure login link. Check your inbox — and your junk or spam folder if you do not see it within a minute or two.</Step>
                    <Step number={4}>Click the link in that email. You will be logged in automatically — no password is needed.</Step>
                  </div>
                  <Tip>Bookmark the app after logging in so you can return to it quickly next time.</Tip>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Forgotten your login email?</h3>
                  <div className="space-y-2">
                    <Step number={1}>Contact your club administrator, who can check which email address is registered on your account.</Step>
                    <Step number={2}>Once confirmed, use that email address to request a new login link.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Updating your personal details</h3>
                  <div className="space-y-2">
                    <Step number={1}>Once logged in, click or tap your name in the top right corner of the screen.</Step>
                    <Step number={2}>Select <strong>My Profile</strong> from the menu.</Step>
                    <Step number={3}>Update your name, phone number, or notification preferences.</Step>
                    <Step number={4}>Click <strong>Save</strong> when you are done.</Step>
                  </div>
                  <Note>Your email address is used to identify your account and cannot be changed here. Contact your club administrator if it needs updating.</Note>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Logging out</h3>
                  <div className="space-y-2">
                    <Step number={1}>Click or tap your name in the top right corner.</Step>
                    <Step number={2}>Select <strong>Sign Out</strong> from the menu.</Step>
                  </div>
                  <Tip>If you use a shared computer (for example in the clubhouse), always log out when you have finished.</Tip>
                </div>
              </div>
            </SectionCard>

            {/* BOOKING A RINK */}
            <SectionAnchor id="booking" />
            <SectionCard icon={Calendar} title="Booking a Rink" color="emerald">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">How to view available rinks</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>Rink Booking</strong>, then <strong>Book a Rink</strong>.</Step>
                    <Step number={2}>Use the date selector to choose the day you would like to play.</Step>
                    <Step number={3}>A grid will show all rinks and available time slots. Available slots are shown in green; taken slots are shown in grey or another colour.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">How to make a booking</h3>
                  <div className="space-y-2">
                    <Step number={1}>Click on an available (green) time slot on the rink you would like to use.</Step>
                    <Step number={2}>A booking form will appear. Fill in your name and the type of game (for example: Roll-up, Club, County).</Step>
                    <Step number={3}>Add any notes if needed — this is optional.</Step>
                    <Step number={4}>Click <strong>Confirm Booking</strong>.</Step>
                    <Step number={5}>You will receive a confirmation. <Placeholder text="Note: your club may require admin approval before the booking is confirmed" /></Step>
                  </div>
                  <Tip>You can only book rinks that do not clash with existing club or league sessions.</Tip>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">How to cancel a booking</h3>
                  <div className="space-y-2">
                    <Step number={1}>Go to <strong>Rink Booking</strong>, then <strong>My Bookings</strong>.</Step>
                    <Step number={2}>Find the booking you would like to cancel.</Step>
                    <Step number={3}>Click the <strong>Cancel</strong> button next to it.</Step>
                    <Step number={4}>Confirm the cancellation when prompted.</Step>
                  </div>
                  <Note>Please cancel as early as possible so other members can use the rink.</Note>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing your existing bookings</h3>
                  <div className="space-y-2">
                    <Step number={1}>Go to <strong>Rink Booking</strong>, then <strong>My Bookings</strong>.</Step>
                    <Step number={2}>This page lists all your upcoming and past bookings.</Step>
                  </div>
                </div>
              </div>
            </SectionCard>

            {/* MATCH SELECTION */}
            <SectionAnchor id="selection" />
            <SectionCard icon={ClipboardList} title="Match Selection" color="purple">
              <div className="space-y-5">
                <p className="text-gray-700 leading-relaxed">
                  Match selections are published by your club selector or administrator. When you have been selected to play, your name will appear on the team sheet.
                </p>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Finding match selections</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>Selection</strong>.</Step>
                    <Step number={2}>You will see a list of upcoming and recent matches.</Step>
                    <Step number={3}>Click on any match to view the full team sheet, including rink assignments and player names.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Understanding selection information</h3>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><strong>Competition name</strong> — for example: Bramley, Wessex League</li>
                    <li><strong>Match date and time</strong></li>
                    <li><strong>Rink assignments</strong> — which rink you will be playing on</li>
                    <li><strong>Your position</strong> — Lead, 2, 3, or Skip</li>
                    <li><strong>Team-mates</strong> — who else is on your rink</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">What to do if you have been selected</h3>
                  <div className="space-y-2">
                    <Step number={1}>You will receive a notification when a selection is published. Check the details carefully.</Step>
                    <Step number={2}>If you cannot play, contact your selector or administrator as soon as possible. <Placeholder text="Insert selector contact details or availability system instructions here" /></Step>
                    <Step number={3}>Make a note of your match date, time, and rink number.</Step>
                  </div>
                  <Tip>Turn on email notifications in your Profile settings so you are always alerted when a selection is published.</Tip>
                </div>
              </div>
            </SectionCard>

            {/* LEAGUE TEAMS */}
            <SectionAnchor id="leagues" />
            <SectionCard icon={Users} title="League Teams" color="blue">
              <div className="space-y-5">
                <p className="text-gray-700 leading-relaxed">
                  The Leagues section shows all the club internal league competitions, including team fixtures, results, and standings.
                </p>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing league teams</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>My Teams</strong>.</Step>
                    <Step number={2}>You will see the leagues you are involved in as a player or captain.</Step>
                    <Step number={3}>Click on a league to view fixtures, results, and the current league table.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Understanding team details</h3>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><strong>Fixtures</strong> — upcoming and completed matches with dates and rink assignments</li>
                    <li><strong>Results</strong> — scores from completed games</li>
                    <li><strong>League Table</strong> — standings based on points, shots for, and shots against</li>
                    <li><strong>Players</strong> — members of your team</li>
                  </ul>
                </div>

                <Note>If you are a team captain, you may also be able to submit match results and manage your squad through this section.</Note>
              </div>
            </SectionCard>

            {/* COMPETITIONS */}
            <SectionAnchor id="competitions" />
            <SectionCard icon={Trophy} title="Club Competitions" color="amber">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">How to enter a competition</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>Competitions</strong>, then <strong>Competition Entries</strong>.</Step>
                    <Step number={2}>You will see a list of open competitions available to enter.</Step>
                    <Step number={3}>Click on a competition to read the details — including format, eligibility, and closing date.</Step>
                    <Step number={4}>Click <strong>Enter Competition</strong> and follow the on-screen instructions.</Step>
                    <Step number={5}>You will receive a confirmation once your entry has been recorded.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Eligibility and entry deadlines</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    Each competition displays its eligibility rules (for example, gender or membership type) and a closing date. Make sure you enter before the deadline — late entries may not be accepted.
                  </p>
                  <Placeholder text="Add any club-specific eligibility rules here — e.g. minimum years of membership, handicap requirements" />
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Checking your entry</h3>
                  <div className="space-y-2">
                    <Step number={1}>Go to <strong>Competitions</strong>, then <strong>Competition Entries</strong>.</Step>
                    <Step number={2}>Your submitted entries will be listed here with their status.</Step>
                  </div>
                  <Tip>If you have entered a pairs, triples, or fours competition, make sure all your partners have also submitted their entries if required.</Tip>
                </div>
              </div>
            </SectionCard>

            {/* DRAWS & RESULTS */}
            <SectionAnchor id="draws" />
            <SectionCard icon={BarChart2} title="Competition Draws & Results" color="purple">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Finding competition draws</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>Competitions</strong>, then <strong>Competition Draw</strong>.</Step>
                    <Step number={2}>Select the competition you would like to view.</Step>
                    <Step number={3}>The draw shows which players or teams are competing against each other in each round.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Understanding the draw format</h3>
                  <p className="text-sm text-gray-700 mb-2">Competitions use one of two formats:</p>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li><strong>Knockout</strong> — you play one match per round; lose and you are out. The draw shows a bracket with all rounds displayed.</li>
                    <li><strong>Round Robin</strong> — every team plays everyone else; results determine final standings.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing results and progress</h3>
                  <div className="space-y-2">
                    <Step number={1}>Open the draw for your competition.</Step>
                    <Step number={2}>Completed matches show the final score. Upcoming matches show the players or teams scheduled to play.</Step>
                    <Step number={3}>For knockout tournaments, your progress through the draw is shown visually on a bracket chart.</Step>
                  </div>
                </div>

                <Note>Results are updated by your club administrator. If a result appears incorrect, please contact your administrator.</Note>
              </div>
            </SectionCard>

            {/* FIXTURES & EVENTS */}
            <SectionAnchor id="fixtures" />
            <SectionCard icon={CalendarCheck} title="Fixtures & Events" color="emerald">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing upcoming matches</h3>
                  <div className="space-y-2">
                    <Step number={1}>From the top menu, click <strong>Selection</strong> to see all published match selections.</Step>
                    <Step number={2}>Each card shows the competition, date, and whether a team has been selected yet.</Step>
                    <Step number={3}>Click a match to see the full details, including rink assignments.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing league fixtures</h3>
                  <div className="space-y-2">
                    <Step number={1}>Go to <strong>My Teams</strong> from the top menu.</Step>
                    <Step number={2}>Select your league and view the fixture list for the season.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Adding events to your personal calendar</h3>
                  <p className="text-sm text-gray-600"><Placeholder text="If calendar export is available, add instructions here — e.g. click the calendar icon on any fixture to download an .ics file" /></p>
                  <Tip>As a quick alternative, take a screenshot of your upcoming fixtures to refer to later.</Tip>
                </div>
              </div>
            </SectionCard>

            {/* NEWS */}
            <SectionAnchor id="news" />
            <SectionCard icon={Newspaper} title="News & Announcements" color="slate">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Where to find club news</h3>
                  <div className="space-y-2">
                    <Step number={1}>If your club has a homepage enabled, it will be the first thing you see after selecting your club.</Step>
                    <Step number={2}>News posts, notices, and upcoming events are displayed on the homepage.</Step>
                    <Step number={3}>Older posts can be scrolled through or browsed by date.</Step>
                  </div>
                </div>
                <Note>Not all clubs use the club homepage. If you cannot find news here, check with your administrator about how announcements are shared. <Placeholder text="Insert club preferred communication channel here" /></Note>
                <Tip>Important notices — such as green closures or competition deadlines — will also be sent as app notifications if you have them enabled.</Tip>
              </div>
            </SectionCard>

            {/* NOTIFICATIONS */}
            <SectionAnchor id="notifications" />
            <SectionCard icon={Bell} title="Notifications" color="blue">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">What the app notifies you about</h3>
                  <ul className="list-disc ml-5 space-y-1 text-sm text-gray-700">
                    <li>Your rink booking has been approved or rejected</li>
                    <li>A match selection has been published and you have been selected</li>
                    <li>A booking you made has been moved or cancelled by an administrator</li>
                    <li>Important club announcements</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Viewing notifications</h3>
                  <div className="space-y-2">
                    <Step number={1}>Look for the bell icon in the top right corner of the app.</Step>
                    <Step number={2}>A number badge shows how many unread notifications you have.</Step>
                    <Step number={3}>Click the bell to see a list of recent notifications.</Step>
                    <Step number={4}>Click any notification to go directly to the relevant part of the app.</Step>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-3">Managing notification preferences</h3>
                  <div className="space-y-2">
                    <Step number={1}>Go to <strong>My Profile</strong> (click your name in the top right).</Step>
                    <Step number={2}>Scroll to the <strong>Notifications</strong> section.</Step>
                    <Step number={3}>Toggle email or SMS notifications on or off.</Step>
                    <Step number={4}>Click <strong>Save</strong>.</Step>
                  </div>
                  <Tip>We recommend keeping email notifications turned on so you never miss a selection announcement.</Tip>
                </div>
              </div>
            </SectionCard>

            {/* FAQ */}
            <SectionAnchor id="faq" />
            <SectionCard icon={HelpCircle} title="Frequently Asked Questions" color="amber">
              <div className="space-y-2">
                <FaqItem
                  question="I have not received my login email — what should I do?"
                  answer="First, check your junk or spam folder. If it is not there, wait a minute or two and try again. If you still do not receive it, contact your club administrator to confirm the email address registered on your account."
                />
                <FaqItem
                  question="I cannot log in — the page just keeps asking for my email."
                  answer="This usually means the login link in your email has expired (they are valid for a limited time only). Simply go back to the app and request a new one by entering your email address again."
                />
                <FaqItem
                  question="My name or details are wrong in the app — how do I fix this?"
                  answer="Go to My Profile and update your first name, surname, and phone number. If your email address needs changing, contact your club administrator as this is the key to your account."
                />
                <FaqItem
                  question="Can I use the app on my mobile phone?"
                  answer="Yes! The app is fully designed for smartphones and tablets. Open it in your phone browser (Chrome, Safari, etc.) and it will adjust to fit your screen. You can also save it to your home screen for quick access — ask at the club if you need help with this."
                />
                <FaqItem
                  question="I booked a rink but it is showing as Pending — is my booking confirmed?"
                  answer="Some clubs require bookings to be approved by an administrator. Pending means your booking has been received and is awaiting approval. You will be notified once it has been approved or if there is an issue."
                />
                <FaqItem
                  question="I cannot see a rink slot I think should be free — why?"
                  answer="Rink slots may be unavailable if they are already booked, reserved for league or club use, or outside your club booking window. If you think there is an error, contact your club administrator."
                />
                <FaqItem
                  question="How do I cancel a booking I have made?"
                  answer="Go to Rink Booking, then My Bookings. Find the booking and click Cancel. Please cancel as early as possible so other members can use the rink."
                />
                <FaqItem
                  question="I have been selected to play but I cannot make it — what do I do?"
                  answer="Please contact your club selector or administrator as soon as possible so they can arrange a replacement. Contact details can be found in the Member Directory or by asking at the club."
                />
                <FaqItem
                  question="I can see the team sheet but my name is not on it — does that mean I was not selected?"
                  answer="Yes — if your name does not appear on a published team sheet, you have not been selected for that particular match. If you think there has been an error, speak to your selector."
                />
                <FaqItem
                  question="How do I enter a competition?"
                  answer="Go to Competitions, then Competition Entries. Find the competition you would like to enter, click it to read the details and eligibility rules, then click Enter Competition to submit your entry."
                />
                <FaqItem
                  question="The competition closing date has passed — can I still enter?"
                  answer="Once a competition is closed, entries are no longer accepted. Contact your club administrator if you believe there has been a mistake or if you had a genuine reason for missing the deadline."
                />
                <FaqItem
                  question="I cannot find a competition I know has been created — where is it?"
                  answer="Competitions need to be marked as open by your administrator before they appear. Check back later, or contact your administrator if you think it should already be visible."
                />
                <FaqItem
                  question="How do I view the draw for a competition I am in?"
                  answer="Go to Competitions, then Competition Draw. Select the competition from the list. If the draw has not been published yet, it will appear once your administrator creates and publishes it."
                />
                <FaqItem
                  question="My notifications are not working — how do I fix this?"
                  answer="Check that email notifications are turned on in your Profile settings. Also check your junk or spam folder for notification emails. If you are still not receiving them, contact your club administrator."
                />
                <FaqItem
                  question="Is my personal information safe in the app?"
                  answer="Yes. The app only shows your information to you and your club administrators. Your data is never shared with third parties."
                />
                <FaqItem
                  question="I share this device with a family member — how do we both use the app?"
                  answer="Each person should log out after they have finished (click your name in the top right, then Sign Out). The next person can then log in with their own email address."
                />
                <FaqItem
                  question="How do I find another member's contact details?"
                  answer="Go to My Club, then Member Directory. You can search for members by name. Contact details are shown for members who have made them available."
                />
              </div>
            </SectionCard>

            {/* TROUBLESHOOTING */}
            <SectionAnchor id="troubleshooting" />
            <SectionCard icon={AlertTriangle} title="Troubleshooting" color="rose">
              <div className="space-y-5">
                {[
                  {
                    problem: 'Unable to log in',
                    emoji: '🔐',
                    steps: [
                      'Make sure you are using the email address registered with your club.',
                      'Check your junk or spam folder for the login email.',
                      'Login links expire after a short time — request a new one if needed.',
                      'Try a different web browser (for example Chrome or Safari).',
                      'If problems persist, contact your club administrator to confirm your account email.',
                    ],
                  },
                  {
                    problem: 'Page not loading or showing an error',
                    emoji: '🌐',
                    steps: [
                      'Refresh the page (press F5 on a computer, or swipe down in your phone browser).',
                      'Check your internet or Wi-Fi connection.',
                      'Try closing the browser and reopening it.',
                      'Clear your browser cache (found in browser settings).',
                      'If the problem continues, contact support — the app may briefly be unavailable.',
                    ],
                  },
                  {
                    problem: 'Booking not saving',
                    emoji: '📅',
                    steps: [
                      'Check that you have filled in all required fields.',
                      'Make sure the rink slot is still available — someone else may have just booked it.',
                      'Check your internet connection and try again.',
                      'If you get an error message, note what it says and contact your club administrator.',
                    ],
                  },
                  {
                    problem: 'Competition entry not submitting',
                    emoji: '🏆',
                    steps: [
                      'Check that the competition is still open and has not passed its closing date.',
                      'Make sure you meet the eligibility requirements listed on the competition page.',
                      'Try refreshing the page and submitting again.',
                      'Contact your club administrator if the problem continues.',
                    ],
                  },
                  {
                    problem: 'Missing notifications',
                    emoji: '🔔',
                    steps: [
                      'Check your notification settings in My Profile — email notifications may be turned off.',
                      'Check your junk or spam folder for notification emails.',
                      'Ensure your email address is correct in your profile.',
                      'Ask your club administrator to check that your account is active.',
                    ],
                  },
                ].map(({ problem, emoji, steps }) => (
                  <div key={problem}>
                    <h3 className="font-semibold text-gray-800 mb-2">{emoji} {problem}</h3>
                    <div className="space-y-1.5">
                      {steps.map((step, i) => <Step key={i} number={i + 1}>{step}</Step>)}
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>

            {/* CONTACT */}
            <SectionAnchor id="contact" />
            <SectionCard icon={Phone} title="Contact & Support" color="slate">
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Getting help with the app</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    If something is not working as expected, you can use the <strong>Live Chat</strong> button at the bottom right of the screen to speak with the BowlsTime support team.
                  </p>
                  <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800">
                    💬 <strong>Live Chat</strong> — use the green button at the bottom right of every page.
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Club-related enquiries</h3>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    For questions about your membership, match selections, bookings, or competitions, please contact your club directly:
                  </p>
                  <div className="mt-3 p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2 text-sm text-gray-700">
                    <p>📧 <strong>Email:</strong> <Placeholder text="Insert club email address" /></p>
                    <p>📞 <strong>Phone:</strong> <Placeholder text="Insert club phone number" /></p>
                    <p>👤 <strong>Club Administrator:</strong> <Placeholder text="Insert administrator name and contact details" /></p>
                    <p>🏟️ <strong>Club Address:</strong> <Placeholder text="Insert club address" /></p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-800 mb-2">Who deals with what?</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Issue</th>
                          <th className="text-left px-3 py-2 font-semibold text-gray-700">Contact</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          ['Cannot log in or account problem', 'Club Administrator'],
                          ['Booking query or dispute', 'Club Administrator or Steward'],
                          ['Match selection question', 'Club Selector'],
                          ['Competition entry issue', 'Club Administrator'],
                          ['App technical bug or error', 'BowlsTime Support (Live Chat)'],
                          ['Membership or personal details', 'Club Administrator'],
                        ].map(([issue, contact], i) => (
                          <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-gray-700 border-t border-gray-100">{issue}</td>
                            <td className="px-3 py-2 font-medium text-emerald-700 border-t border-gray-100">{contact}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <Note>If you are unsure who to contact, your club administrator is always the best first point of contact for club-related questions.</Note>
              </div>
            </SectionCard>

            {/* Footer */}
            <div className="text-center py-6 text-xs text-gray-400">
              <p>BowlsTime Help Centre · Last updated June 2026</p>
              <p className="mt-1">Still need help? Use the <strong>Live Chat</strong> button at the bottom right of the screen.</p>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}