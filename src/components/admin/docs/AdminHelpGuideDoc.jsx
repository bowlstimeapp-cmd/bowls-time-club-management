import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy, ChevronDown, ChevronUp } from 'lucide-react';

const SECTIONS = [
  {
    id: 'club-settings',
    icon: '⚙️',
    title: 'Club Settings',
    intro: 'Everything you need to configure your club — from rink numbers and opening times to modules, branding, and kiosk mode.',
    steps: [
      {
        heading: 'How to navigate to Club Settings',
        instructions: [
          'Ensure you are logged in and have selected the club you manage.',
          'Click or tap your name in the top right corner of the screen.',
          'Select **Club Settings** from the menu. Alternatively, open the **Admin** dropdown in the top navigation and select **Club Admin**.',
          'You will land on the Club Settings page, which contains all the configuration options for your club.',
        ],
      },
      {
        heading: 'General Club Details',
        instructions: [
          'Edit your **Club Name** and **Description** — these appear throughout the app and on your club homepage if enabled.',
          'Upload a **Club Logo** — this is displayed in the header and on printed team sheets.',
          'Set your club **Season** (Indoor or Outdoor) — this affects how fixtures and sessions are displayed.',
          'Enter the **Primary Admin Email** — this is the address that receives admin notifications.',
        ],
      },
      {
        heading: 'Rink & Session Configuration',
        instructions: [
          'Set the **Number of Rinks** available at your club.',
          'Set your **Opening Time** and **Closing Time** — these define the hours members can book between.',
          'Set the **Session Duration** in hours (for example, 2 hours means booking slots are 2 hours long).',
          'If your club uses non-standard session times, toggle **Use Custom Sessions** and define each session\'s start and end times.',
        ],
        tip: 'If you change the number of rinks or session times, existing bookings are not affected — only new bookings use the updated settings.',
      },
      {
        heading: 'Booking Rules',
        instructions: [
          'Toggle **Auto-Approve Bookings** if you want member bookings to be confirmed instantly without admin approval.',
          'Toggle **Open Roll-ups** to allow members to join roll-up sessions booked by other members.',
          'Toggle **Private Roll-ups** (requires Open Roll-ups enabled) to let members create private roll-ups that others cannot join.',
        ],
      },
      {
        heading: 'Modules',
        instructions: [
          'Each module can be switched on or off independently using the toggles in the Modules section.',
          '**Rink Booking** — the core booking grid. Almost always left on.',
          '**Match Selection** — enables team selection and availability tracking.',
          '**Competitions** — enables knockout and round-robin competition draws.',
          '**Leagues** — enables internal league management with fixtures and tables.',
          '**Club Homepage** — builds a public-facing club homepage with news and galleries.',
          '**Function Room Bookings** — manage function room enquiries and availability.',
          '**Custom Branding** — design custom scorecard layouts with your club colours.',
          '**Club Messaging** — enable in-app chat channels for members.',
          '**SMS Notifications** — enable paid SMS notifications (requires a monthly allowance).',
        ],
        tip: 'Turning a module off hides it from members and removes it from the navigation. Existing data is retained if you switch it back on later.',
      },
      {
        heading: 'Branding & Appearance',
        instructions: [
          'Choose a **Club Theme** colour (Emerald, Blue, Purple, Slate, Rose, or Amber) — this sets the accent colour throughout the app for your members.',
          'Configure **Team Sheet** template settings — choose a style (Classic, Compact, Modern, or Bowls), primary colour, font size, and optional fields like dress code or venue.',
          'If you enable **Advanced Mode** for team sheets, you can upload a custom header image and edit the HTML template directly.',
          'Configure **League Table** print settings in the same way — style, colour, font size, and optional footer text.',
        ],
      },
      {
        heading: 'Kiosk Mode',
        instructions: [
          'Toggle **Kiosk Mode** to enable a touch-screen terminal where members log in by entering their unique 5-digit member ID.',
          'Enter the **Kiosk Account Email** — this is the dedicated account used to run the kiosk terminal.',
          'Set up the kiosk device by logging in with the kiosk account email, then navigate to the Bookings page — it will automatically enter kiosk mode.',
        ],
        tip: 'Each member must have a 5-digit Member ID assigned in their profile before they can use the kiosk. You can assign these in the Members admin page.',
      },
      {
        heading: 'Membership Fees',
        instructions: [
          'Toggle **Membership Fee Enabled** to charge members an annual fee online via Stripe.',
          'Enter the **Fee Amount** in pence (for example, 5000 = £50.00).',
          'Enter a **Description** — this is shown to members on the payment page.',
          'If your club has its own Stripe account, enter your **Stripe Secret Key** and **Publishable Key** to collect payments directly. Otherwise, the platform Stripe account is used.',
        ],
      },
      {
        heading: 'Saving your changes',
        instructions: [
          'Scroll to the bottom of the Club Settings page and click **Save Changes**.',
          'A confirmation message will appear when the settings have been saved successfully.',
          'Some changes (such as theme colour) may require members to refresh their browser to see the update.',
        ],
        tip: 'If you are partway through editing and navigate away without saving, your changes will be lost. Always click Save Changes before leaving the page.',
      },
    ],
  },
  {
    id: 'selection',
    icon: '📋',
    title: 'Match Selection (Club Admin & Selector)',
    intro: 'How to create, publish, and manage team selections for matches. This guide covers both the Club Admin and Selector roles.',
    steps: [
      {
        heading: 'How to navigate to Selection',
        instructions: [
          'Ensure you are logged in and have selected your club.',
          'Click **Selection** in the top navigation menu.',
          'If you are a Club Admin, you can also access Selection via the **Admin** dropdown.',
          'You will see a list of upcoming and recent matches. Click **Create New Selection** to start a new one.',
        ],
      },
      {
        heading: 'Creating a new selection',
        instructions: [
          'Click **Create New Selection**.',
          'Choose the **Competition** type (for example: Bramley, Wessex League, Denny, Top Club, or Friendly).',
          'Enter the **Match Date** and optional **Match Name**.',
          'Set the **Match Start Time** and **Match End Time**.',
          'Choose the number of **Home Rinks** for the match.',
          'Click **Create Selection** to open the selection editor.',
        ],
      },
      {
        heading: 'Assigning players to rinks',
        instructions: [
          'In the selection editor, you will see a grid showing each rink and the positions (Lead, 2, 3, Skip).',
          'Click a position to open the member picker and search for a player by name.',
          'Selected players are assigned to that position on that rink.',
          'To remove a player, click their name and select **Remove**.',
          'For Friendly matches, you can set the number of rinks and players per rink, and choose whether the match is Home or Away.',
        ],
        tip: 'You can see which members have marked themselves as unavailable for this date — their names are highlighted in the member picker. Click the **Availability** button to see a full list.',
      },
      {
        heading: 'Setting the Home and Away Captains',
        instructions: [
          'In the selection editor, scroll to the **Captains** section.',
          'Use the dropdowns to assign a **Home Team Captain** and an **Away Team Captain** (optional).',
          'Captains are included on the printed team sheet and in any notifications sent to members.',
        ],
      },
      {
        heading: 'Saving as a draft',
        instructions: [
          'At any point, click **Save as Draft** to store your selection without publishing it.',
          'Draft selections are only visible to admins and selectors — members cannot see them.',
          'You can return to a draft at any time by clicking on it from the Selection list.',
        ],
        tip: 'Use the draft state to build your selection over several days. You can check availability, adjust players, and only publish once you are happy with the team.',
      },
      {
        heading: 'Publishing a selection',
        instructions: [
          'When your selection is complete, click **Publish**.',
          'Members who have been selected will automatically receive an email and/or push notification (depending on their notification preferences).',
          'Once published, the selection is visible to all members from the **Selection** page.',
          'You can still edit a published selection — click **Edit**, make changes, and click **Save**. Members are not re-notified of edits unless you publish again.',
        ],
        tip: 'If you need to make a small change (for example, swapping a player), you do not need to unpublish and republish — just edit and save. The updated selection is visible immediately.',
      },
      {
        heading: 'Sending SMS notifications',
        instructions: [
          'On the Selection page, open a published selection.',
          'If your club has SMS Notifications enabled, you will see an **SMS Notification** toggle.',
          'Toggle it on to send a text message to all selected players who have a mobile number on file.',
          'SMS messages are charged against your club\'s monthly allowance — a counter is shown so you can see how many you have used.',
        ],
        tip: 'Only use SMS for important, time-sensitive selections — for example, late changes or matches with short notice. Email and push notifications are free and should be your default.',
      },
      {
        heading: 'Printing a team sheet',
        instructions: [
          'Open a published selection.',
          'Click **Print Team Sheet**.',
          'A formatted team sheet is generated using the template and branding configured in Club Settings.',
          'Use your browser\'s print dialog to print or save as a PDF.',
        ],
        tip: 'You can change the team sheet template (Classic, Compact, Modern, or Bowls) and colours in Club Settings → Branding & Appearance at any time.',
      },
      {
        heading: 'Marking availability as a member',
        instructions: [
          'Both Club Admins and Selectors can also mark their own availability.',
          'Open the **Selection** page and click on an upcoming match.',
          'If you have been selected, click **Available** or **Unavailable** to indicate whether you can play.',
          'Your availability is visible to the selector when they are choosing teams.',
        ],
      },
      {
        heading: 'Entering match results (Club Admin)',
        instructions: [
          'After a match has been played, open the published selection.',
          'Click **Enter Results** or **Match Scores**.',
          'Enter the club score and opposition score for each rink.',
          'Enter any opposition player names if known.',
          'Click **Save Results** — the scores are stored and visible on the selection page.',
        ],
        tip: 'If you have Live Scoring enabled, scores can be entered rink-by-rink during the match using the Live Scoring page, rather than entering them all afterwards.',
      },
    ],
  },
  {
    id: 'leagues',
    icon: '🏆',
    title: 'League Management (Club Admin)',
    intro: 'How to set up internal club leagues, generate fixtures, manage teams, enter scores, and print league tables.',
    steps: [
      {
        heading: 'How to navigate to Leagues',
        instructions: [
          'Ensure you are logged in as a Club Admin and have selected your club.',
          'Click **Admin** in the top navigation, then select **Leagues**.',
          'You will see a list of existing leagues. Click **Create New League** to set up a new one.',
        ],
      },
      {
        heading: 'Creating a new league',
        instructions: [
          'Click **Create New League**.',
          'Enter a **League Name** (for example: Winter Triples League).',
          'Enter an optional **Description**.',
          'Choose the **Format** — Triples or Fours.',
          'Set the **Start Date** and **End Date** for the league season.',
          'Set the weekly **Start Time** and **End Time** for matches (for example, 18:00 to 21:00).',
          'If matches span multiple sessions, toggle **Multi-Session** and add each session time range.',
          'Click **Create League** to save.',
        ],
      },
      {
        heading: 'Configuring scoring rules',
        instructions: [
          'Open your league and click **Edit Settings**.',
          'Scroll to the **Scoring** section.',
          'Choose how points are awarded: **Points per Set**, **Game Win**, **Standard Win**, or **Highest Shots**.',
          'Enter the points value for each (for example, 2 points per set win, or 3 points for a game win).',
          'If your league uses sets scoring, toggle **Sets Scoring** and enter the number of ends per set (for example, 8 ends).',
          'Click **Save Changes**.',
        ],
        tip: 'Scoring rules must be set before fixtures are generated. If you change scoring rules mid-season, previously entered results are not recalculated automatically.',
      },
      {
        heading: 'Adding teams to the league',
        instructions: [
          'Open your league and click **Manage Teams**.',
          'Click **Add Team** to create a new team.',
          'Enter a **Team Name** (for example: Team Smith).',
          'Assign a **Captain** by searching for a member — the captain can submit results and manage the playing rota.',
          'Add players to the team by searching for members and clicking **Add**.',
          'Repeat for each team in the league.',
          'Click **Save** when all teams have been added.',
        ],
        tip: 'You can edit team rosters at any time during the season. Players added or removed from a team only affect future fixtures.',
      },
      {
        heading: 'Selecting rinks for the league',
        instructions: [
          'Open your league and click **Edit Settings**.',
          'Scroll to the **League Rinks** section.',
          'Select which rink numbers are available for this league\'s fixtures (for example, Rinks 1–4).',
          'If your club is outdoor and you want fixtures clustered on adjacent rinks, toggle **Adjacent Rinks** and define the rink clustering periods.',
          'Add any **Blacklisted Dates** where no fixtures should be scheduled (for example, bank holidays or club events).',
          'Click **Save Changes**.',
        ],
      },
      {
        heading: 'Generating fixtures',
        instructions: [
          'Open your league and click **Generate Fixtures**.',
          'The system automatically creates a round-robin fixture schedule for all teams, alternating home and away.',
          'Review the generated fixtures — you can edit individual fixture dates or rinks if needed.',
          'Toggle **Force Even Fixtures** if you want every team to play every other team the same number of times (recommended for fairness).',
          'Click **Confirm** to save the fixture list.',
        ],
        tip: 'If you add or remove teams after fixtures have been generated, you will need to regenerate the fixture list. This will overwrite any manually edited dates or rinks.',
      },
      {
        heading: 'Creating rink bookings from fixtures',
        instructions: [
          'After generating fixtures, click **Create Bookings**.',
          'The system automatically creates a rink booking for every league fixture, using the rink numbers and session times configured.',
          'These bookings appear on the main rink booking grid and are visible to all members.',
          'If a fixture date or rink is changed later, the associated booking is updated automatically.',
        ],
      },
      {
        heading: 'Entering match scores',
        instructions: [
          'Open your league and click on a completed fixture.',
          'Click **Enter Scores**.',
          'Enter the **Home Score** (total shots) and **Away Score** (total shots).',
          'If the league uses sets, enter the **Home Sets** and **Away Sets** won.',
          'Click **Save Scores** — the league table is updated automatically.',
        ],
        tip: 'Team captains can also submit scores from the **My Teams** page. If both captains submit different scores, a conflict is flagged and the Club Admin is notified to resolve it.',
      },
      {
        heading: 'Resolving score conflicts',
        instructions: [
          'If two captains submit conflicting scores for the same fixture, a warning badge appears on the fixture.',
          'Open the fixture and click **Resolve Conflict**.',
          'You will see both sets of submitted scores side by side.',
          'Enter the correct scores and click **Save** to override both submissions.',
          'The league table is recalculated with the confirmed scores.',
        ],
      },
      {
        heading: 'Generating scorecards',
        instructions: [
          'Open your league and click **Generate Scorecards**.',
          'Choose the format — **PDF** or **Excel (XLSX)**.',
          'The system produces a scorecard for every fixture in the league, pre-filled with team names, dates, and rink numbers.',
          'Download the file and print or distribute to team captains.',
        ],
        tip: 'If your club has Custom Branding enabled, the scorecards will include your club logo and colours. You can configure this in Club Settings → Branding & Appearance.',
      },
      {
        heading: 'Printing the league table',
        instructions: [
          'Open your league and click **Print League Table**.',
          'A formatted league table is generated using the template and branding configured in Club Settings.',
          'The table shows positions, games played, wins, draws, losses, shots for, shots against, and points.',
          'Use your browser\'s print dialog to print or save as a PDF.',
        ],
      },
      {
        heading: 'Managing player unavailability',
        instructions: [
          'Open your league and click **Manage Teams**.',
          'Select a team and click **Player Unavailability**.',
          'Mark date ranges during which each player is unavailable — the captain can see this when managing their playing rota.',
          'Captains can also mark their own players\' unavailability from the **My Teams** page.',
        ],
      },
      {
        heading: 'Setting the league rota',
        instructions: [
          'Open your league and click **Manage Teams**.',
          'Select a team and click **Edit Rota**.',
          'For each fixture, select which players from the team will play.',
          'The rota is visible to the team captain and helps them plan their line-up for each match.',
          'Click **Save** when the rota is complete.',
        ],
        tip: 'Captains can edit the rota themselves from the My Teams page. Encourage your captains to keep the rota up to date so players know whether they are playing each week.',
      },
    ],
  },
  {
    id: 'competitions',
    icon: '🎖️',
    title: 'Competition Entries & Competition Draws (Club Admin)',
    intro: 'How to create competitions that members can enter, manage entries, and build knockout or round-robin competition draws.',
    steps: [
      {
        heading: 'Enabling competition registration',
        instructions: [
          'Before members can enter competitions, you need to enable the Competition Registration feature.',
          'Go to **Club Settings** via the Admin menu or your profile menu.',
          'Scroll to the **Competition Registration** section.',
          'Toggle **Competition Registration Enabled** to on.',
          'Optionally, enter a **Competition Page Header** — this is a message shown at the top of the Competition Entries page (for example, entry rules or deadlines).',
          'Click **Save Changes**.',
        ],
        tip: 'If you do not see the Competition Registration toggle, ensure the Competitions module is enabled in Club Settings → Modules.',
      },
      {
        heading: 'How to navigate to competitions',
        instructions: [
          'Ensure you are logged in as a Club Admin and have selected your club.',
          'Competition management is split across two areas:',
          '**Competition Entries** — where members self-register and you manage entries. Access via the **Competitions** dropdown → **Competition Entries**.',
          '**Entries Admin** — where you review and download all entries. Access via the **Competitions** dropdown → **Entries Admin** (Club Admin only).',
          '**Competition Draw** — where you create and manage knockout or round-robin draws. Access via the **Competitions** dropdown → **Competition Draw**.',
        ],
      },
      {
        heading: 'Creating a competition for member entry',
        instructions: [
          'Go to **Competition Entries** and click **Create Competition** (or go to **Entries Admin** and click **Create Competition**).',
          'Enter a **Competition Name** (for example: Club Singles Championship).',
          'Choose the **Type** — Singles, Pairs, Triples, or Fours.',
          'Enter an optional **Description** and **Rules** (for example: eligibility, handicap requirements, or format details).',
          'Set the **Maximum Entries** — the maximum number of entrants allowed (optional).',
          'Enter the **Price Per Entry** in GBP if you charge an entry fee (optional). Leave blank for free entry.',
          'Set the **Registration Deadline** — the closing date for entries.',
          'Click **Create Competition** — the competition is now open for member entry.',
        ],
        tip: 'Members will see the competition on the Competition Entries page as soon as it is created. The status shows as "Open" until the deadline passes or you close it manually.',
      },
      {
        heading: 'Managing entries as a Club Admin',
        instructions: [
          'Go to **Entries Admin** via the Competitions dropdown.',
          'You will see a list of all competitions with their entry counts and status.',
          'Click a competition to view the full list of entrants.',
          'You can manually **Add an Entrant** by searching for a member — useful for entries taken offline or over the phone.',
          'You can **Remove an Entrant** if they have entered by mistake or withdrawn.',
          'Click **Download Entries** to export the full list as a CSV or PDF for offline use.',
          'Click **Close Competition** to prevent further entries (even if the deadline has not passed).',
        ],
      },
      {
        heading: 'How members enter a competition',
        instructions: [
          'Members go to **Competition Entries** from the Competitions dropdown.',
          'They see a list of open competitions with details — format, price, deadline, and number of entries so far.',
          'They click **Enter Competition** and follow the on-screen instructions.',
          'If there is an entry fee, they are taken to a Stripe payment page to pay by card.',
          'If the competition is Pairs, Triples, or Fours, they can enter their partner or team-mate names during registration.',
          'They receive a confirmation once the entry is recorded.',
        ],
        tip: 'Encourage members to enter early to secure their place. If a competition has a maximum entry limit, it will show as "Full" once the limit is reached.',
      },
      {
        heading: 'Creating a competition draw',
        instructions: [
          'Once registration is closed and you have your list of entrants, you can create a competition draw.',
          'Go to **Competition Draw** from the Competitions dropdown.',
          'Click **Create New Tournament** (or **Create Draw**).',
          'Enter a **Tournament Name** — this is what members see on the Competition Draw page.',
          'Choose the **Tournament Type** — **Knockout** (single elimination) or **Round Robin** (everyone plays everyone).',
          'Choose the **Competition Format** — Singles, Pairs, Triples, or Fours.',
          'Set the **Number of Rinks Available** for the tournament.',
          'Click **Create Tournament** to open the draw builder.',
        ],
      },
      {
        heading: 'Adding players or teams to the draw',
        instructions: [
          'In the draw builder, click **Add Players** (for knockout) or **Add Teams** (for round robin).',
          'For singles knockout, search for and select all the players who have entered the competition.',
          'For pairs, triples, or fours knockout, build teams by selecting players for each team and assigning a team name.',
          'For round robin, create teams (or use existing league teams) and assign them to groups.',
          'Click **Save** when all players or teams have been added.',
          'You can adjust the seeding or bracket order by dragging players or teams before generating the draw.',
        ],
        tip: 'If you have an odd number of players in a knockout, byes are automatically assigned to the top seeds so the first round has an even number of matches.',
      },
      {
        heading: 'Generating the knockout bracket',
        instructions: [
          'Once all players or teams are added, click **Generate Bracket** (knockout) or **Generate Fixtures** (round robin).',
          'For knockout: the system creates a full bracket with rounds — Quarter Finals, Semi Finals, and Final — based on the number of entrants.',
          'For round robin: the system creates a fixture list where every team plays every other team, with rink assignments and rounds automatically scheduled.',
          'Review the generated draw — you can manually adjust rink assignments or fixture dates if needed.',
          'Click **Publish** to make the draw visible to members on the Competition Draw page.',
        ],
        tip: 'You can keep the draw as a draft while you fine-tune it. Members only see it once you click Publish. You can still edit a published draw — changes are visible immediately.',
      },
      {
        heading: 'Managing round robin groups',
        instructions: [
          'For round robin tournaments with many teams, you can split teams into groups.',
          'In the tournament settings, set the **Number of Groups** and **Qualifiers per Group** — the number of teams that progress from each group to the knockout stage.',
          'The system automatically divides teams into groups and generates fixtures within each group.',
          'After all group fixtures are completed, the top qualifiers from each group automatically progress to a knockout stage.',
          'You can manually adjust the group assignments before fixtures are generated if you want to seed specific teams into different groups.',
        ],
      },
      {
        heading: 'Linking a competition to its draw',
        instructions: [
          'If you created a competition for member entry and then built a draw from those entries, you can link them together.',
          'Open the tournament in the Competition Draw page.',
          'Click **Link to Competition** and select the competition from the dropdown.',
          'This allows members to click through from the Competition Entries page directly to the draw to see who they are playing.',
          'The link is also shown on the Competition Draw page so members can see which competition the draw belongs to.',
        ],
      },
      {
        heading: 'Entering results and advancing the draw',
        instructions: [
          'Open the published tournament from the Competition Draw page.',
          'As matches are played, open each match and enter the score.',
          'For knockout: when you enter a result, the winner automatically advances to the next round of the bracket.',
          'For round robin: results update the group standings automatically, and the qualifying teams are highlighted.',
          'For walkovers (where a player or team cannot play), set the result to **Walkover** and the opponent advances automatically.',
          'The bracket and standings update in real time for members viewing the Competition Draw page.',
        ],
        tip: 'You do not need to enter results in order — you can enter them as matches are completed across different rounds. The bracket adjusts automatically.',
      },
      {
        heading: 'Printing or downloading the draw',
        instructions: [
          'Open the published tournament from the Competition Draw page.',
          'Click **Print Draw** or **Download Draw**.',
          'For knockout: a bracket chart is generated showing all rounds, players, and scores — suitable for printing or displaying on a clubhouse noticeboard.',
          'For round robin: a fixture list and group standings are generated.',
          'Use your browser\'s print dialog to print or save as a PDF.',
        ],
      },
      {
        heading: 'Open Competitions CRM (for external entries)',
        instructions: [
          'If your club runs open competitions (where external teams or players enter), you can manage them using the Open Competitions CRM.',
          'Go to **Admin** → **Open Competitions**.',
          'Add external contacts (teams or individuals) with their contact details.',
          'Track the **Contact Status** of each entry — Not Contacted, Contacted, Interested, Entered, or Declined.',
          'Record notes and follow-up dates for each contact.',
          'Once external entries are confirmed, you can add them to a competition draw alongside your club members.',
        ],
        tip: 'The Open Competitions CRM is separate from the member Competition Entries system. Use the CRM for external teams, and Competition Entries for your own club members.',
      },
    ],
  },
];

function AdminGuideSection({ section, isOpen, onToggle }) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 text-left">
          <span className="text-lg">{section.icon}</span>
          <span className="font-semibold text-gray-800 text-sm">{section.title}</span>
          <Badge variant="secondary" className="ml-1">{section.steps.length} guides</Badge>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {isOpen && (
        <div className="px-4 py-4 bg-white">
          <p className="text-sm text-gray-500 mb-4 italic">{section.intro}</p>
          <div className="space-y-6">
            {section.steps.map((step, i) => (
              <div key={i} className="border-l-2 border-emerald-100 pl-4">
                <h4 className="font-semibold text-gray-900 text-sm mb-2">{i + 1}. {step.heading}</h4>
                <ol className="space-y-1.5">
                  {step.instructions.map((instruction, j) => (
                    <li key={j} className="text-sm text-gray-600 flex gap-2.5">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold flex items-center justify-center mt-0.5">
                        {j + 1}
                      </span>
                      <span
                        className="leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: instruction.replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium text-gray-900">$1</strong>') }}
                      />
                    </li>
                  ))}
                </ol>
                {step.tip && (
                  <div className="mt-3 flex gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                    <span className="text-amber-600 font-semibold text-sm">💡 Tip:</span>
                    <span
                      className="text-sm text-amber-700 leading-relaxed"
                      dangerouslySetInnerHTML={{ __html: step.tip.replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium text-amber-900">$1</strong>') }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminHelpGuideDoc() {
  const [openSection, setOpenSection] = useState('club-settings');

  const toggleSection = (id) => {
    setOpenSection(openSection === id ? null : id);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LifeBuoy className="w-5 h-5 text-blue-600" />
          Admin Help Guides
        </CardTitle>
        <p className="text-sm text-gray-500 mt-1">
          Step-by-step guidance for Club Admins and Selectors — covering Club Settings, Match Selection, League Management, and Competition Entries & Draws.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2 mb-2">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setOpenSection(s.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border"
              style={
                openSection === s.id
                  ? { backgroundColor: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }
                  : { backgroundColor: '#fff', color: '#6b7280', borderColor: '#e5e7eb' }
              }
            >
              <span>{s.icon}</span>
              {s.title}
            </button>
          ))}
        </div>
        {SECTIONS.map(section => (
          <AdminGuideSection
            key={section.id}
            section={section}
            isOpen={openSection === section.id}
            onToggle={() => toggleSection(section.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}