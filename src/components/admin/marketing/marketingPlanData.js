// Zero-budget marketing plan for Bowls Time.
// Keep every claim in here honest: placeholders in [square brackets] must be filled
// with real numbers before anything is sent or published.

export const POSITIONING = {
  one_liner: 'The clubhouse admin that runs itself, for bowls clubs that run on volunteers.',
  promise: 'Members book their own rinks, teams pick and notify themselves, and league tables update without a spreadsheet. Set up in an evening, free for your first season.',
  say: [
    'Replaces the paper rink diary and the Sunday-night selection phone calls',
    'Built for bowls: rinks, ends, triples and fours, county fixtures, roll-ups',
    'Members get one tap on their phone to say they are available',
    'Free tier that a club can genuinely run on, not a 14-day trial',
  ],
  never_say: [
    'SaaS, platform, digital transformation, solution, leverage',
    'Anything that sounds like a booking app for gyms or tennis courts',
    'Big numbers you cannot evidence in one sentence',
  ],
  proof_to_build: [
    'A 3-minute screen recording of one real club doing a whole week of admin',
    'One named club saying yes on the record',
    'A one-page PDF a secretary can hand round at committee',
  ],
};

export const PERSONAS = [
  {
    role: 'Club Secretary',
    pain: 'Carries the whole club in their head and a paper diary, and gets blamed when two things land on rink 4.',
    hook: 'One diary everyone can see, so nothing gets double-booked again.',
    win: 'Stops being the human booking system.',
  },
  {
    role: 'Fixture / Match Secretary',
    pain: 'Chases availability by text, picks the team on a kitchen table, then tells 16 people one at a time.',
    hook: 'Members mark themselves available; publish the team and everyone is told at once, rinks already booked.',
    win: 'Selection night drops from two hours to twenty minutes.',
  },
  {
    role: 'Treasurer',
    pain: 'Subs, rink fees and invoices tracked in a book, and no idea who has actually paid.',
    hook: 'Rink fees and membership payments land in one place you can export.',
    win: 'Can answer "who owes what" without a shoebox.',
  },
  {
    role: 'Captain / Player',
    pain: 'Never quite sure if they are picked, what time, or which green.',
    hook: 'See your matches, your rink and your team on your phone.',
    win: 'No more group chats on a Friday night.',
  },
];

export const CHANNELS = [
  {
    rank: 1,
    name: 'County associations & league organisers',
    why: 'One conversation reaches 30–80 affiliated clubs. Bowls is governed by people who already talk to every club in the county.',
    effort: 'Low',
    return: 'Very high',
    play: 'Offer every affiliated club free access for a season, plus the county a working league-table tool. Ask for one thing: an introduction email from them to club secretaries.',
  },
  {
    rank: 2,
    name: 'Club-to-club referral (the built-in loop)',
    why: 'Bowls people visit other clubs every week of the season. A member who likes the app will mention it at an away match.',
    effort: 'Very low',
    return: 'High',
    play: 'Ask every happy admin for the name of one secretary who is still on paper. Offer to set that club up yourself, free, in an evening.',
  },
  {
    rank: 3,
    name: 'Bowls Facebook groups & pages',
    why: 'The bowls community lives on Facebook far more than any other channel — county groups, club groups, "bowls for sale" groups.',
    effort: 'Medium',
    return: 'High',
    play: 'Never post adverts. Answer admin questions properly, then let your profile link do the work. One genuinely useful post per week beats five adverts.',
  },
  {
    rank: 4,
    name: 'Short demo video',
    why: 'A 3-minute recording of a real rink diary being filled in is worth more than any brochure, and costs nothing but your phone.',
    effort: 'Low',
    return: 'High',
    play: 'Record one video per pain: booking a rink, publishing a team, printing a league table. Post natively, no link in the first comment.',
  },
  {
    rank: 5,
    name: 'Club newsletters & local press',
    why: 'Clubs and local papers are always short of content, and "volunteers get their evenings back" is a story they will run.',
    effort: 'Medium',
    return: 'Medium',
    play: 'Offer a 200-word piece plus a photo to five club newsletters and the local paper in each club town. Always free to publish, no cost to them.',
  },
  {
    rank: 6,
    name: 'Long-tail search',
    why: 'Low volume, but somebody searching "bowls club rink booking system" is ready to buy today.',
    effort: 'Medium',
    return: 'Medium (slow burn)',
    play: 'One page per phrase: bowls rink booking, bowls club membership software, league table generator, team selection app for bowls clubs.',
  },
  {
    rank: 7,
    name: 'Free tools as a lead magnet',
    why: 'A free league fixture generator or round-robin draw builder gets used by people who are not ready for the full system yet.',
    effort: 'Medium',
    return: 'Medium',
    play: 'Give the tool away with no sign-up. Collect an email only to send the download, then follow up once in the closed season.',
  },
];

export const SPRINTS = [
  {
    title: 'Sprint 1 — Foundations & first conversations',
    window: 'Weeks 1–4',
    goal: 'Look credible, and have 20 real conversations with club admins.',
    hours: '5 hrs / week',
    weeks: [
      {
        label: 'Week 1',
        actions: [
          'Write the one-liner and the three proof points into the app homepage and your email signature',
          'Record a 3-minute demo: rink diary, then team selection, then a league table. Phone screen recording is fine',
          'Rewrite the free-tier offer so a club can run a full season on it',
        ],
      },
      {
        label: 'Week 2',
        actions: [
          'Build a prospect list of 200 clubs from county association directories and league websites',
          'Add 4 fields per club: secretary name, email, green type, league played in',
          'Send the first 40 personal emails — one sentence of local detail each, no mail-merge',
        ],
      },
      {
        label: 'Week 3',
        actions: [
          'Follow up everyone who has not replied, with the demo video',
          'Join 6 bowls Facebook groups and answer questions only — no links for now',
          'Ask your existing clubs for one introduction each',
        ],
      },
      {
        label: 'Week 4',
        actions: [
          'Book and run 5 live 20-minute demo calls',
          'Set up any club that says yes yourself, on the call',
          'Write down the exact words they used about their problem — that is your homepage copy',
        ],
      },
    ],
    milestone: 'Target: 40 emails, 8 replies, 5 demos, 2 clubs live.',
  },
  {
    title: 'Sprint 2 — Borrow other people’s audiences',
    window: 'Weeks 5–8',
    goal: 'One county partnership, one case study, and a repeatable weekly content rhythm.',
    hours: '5 hrs / week',
    weeks: [
      {
        label: 'Week 5',
        actions: [
          'Email three county associations offering free access for all affiliated clubs',
          'Offer the county a league-table tool for their county squads at no cost',
          'Send the club-newsletter piece to five clubs who are already using it',
        ],
      },
      {
        label: 'Week 6',
        actions: [
          'Interview your best club on the phone for 15 minutes and write a one-page case study',
          'Ask them for a photo of the green and one quote you can use by name',
          'Post the case study in two bowls groups as a story, not an advert',
        ],
      },
      {
        label: 'Week 7',
        actions: [
          'Publish three short videos: rink booking, team selection, league table',
          'Publish the four search pages with real screenshots',
          'Send 40 more outreach emails, leading with the county name',
        ],
      },
      {
        label: 'Week 8',
        actions: [
          'Run a "bring your diary" session: 30 minutes, screen-share, set the club up live',
          'Offer existing admins the referral ask in one sentence',
          'Check activation — every new club must make a real booking in week one',
        ],
      },
    ],
    milestone: 'Target: 1 county partnership, 1 published case study, 6 clubs live.',
  },
  {
    title: 'Sprint 3 — Season-start push & the referral engine',
    window: 'Weeks 9–12',
    goal: 'Convert interest at the moment clubs actually prepare for the season, and make referrals routine.',
    hours: '5 hrs / week',
    weeks: [
      {
        label: 'Week 9',
        actions: [
          'Send the "ready for the season in one evening" campaign to every club that ever replied',
          'Prepare the committee one-pager for clubs who need a decision',
          'Line up local press in two club towns',
        ],
      },
      {
        label: 'Week 10',
        actions: [
          'Run two open webinars: one for secretaries, one for fixture secretaries',
          'Give every admin a simple referral message to forward',
          'Fix the one step in onboarding where most clubs stall',
        ],
      },
      {
        label: 'Week 11',
        actions: [
          'Ask every live club to add their first committee member (the second user is the real activation)',
          'Publish the local press story and share it back to the clubs featured',
          'Follow up the county partnership for the introduction email',
        ],
      },
      {
        label: 'Week 12',
        actions: [
          'Review the scoreboard, cut the two channels that produced nothing',
          'Double down on whichever produced the most demos',
          'Write the next 90-day plan with the same shape',
        ],
      },
    ],
    milestone: 'Target: 12 clubs live, 4 paying, 30+ conversations a month.',
  },
];

export const COPY_ASSETS = [
  {
    id: 'cold-1',
    category: 'Outreach',
    title: 'Cold email 1 — club secretary',
    purpose: 'First touch. One specific observation, one benefit, one small ask.',
    body: `Subject: The rink diary at [Club name]

Hi [First name],

I saw [Club name] plays in the [league name] and that you run [number] rinks. I am guessing the diary is still a book on the bar and half your week goes on sorting out clashes.

Bowls Time is club software built only for bowls clubs. Members book rinks themselves, so the diary is always right, and the fixtures secretary can publish a team that emails everyone at once.

It is free for a club your size to run a full season on. Would 15 minutes on the phone be useful? I can show you the rink diary with your own session times on it.

[Your name]
Bowls Time — [app link]`,
  },
  {
    id: 'cold-2',
    category: 'Outreach',
    title: 'Cold email 2 — the follow-up',
    purpose: 'Day 4. Give something, do not just nudge.',
    body: `Subject: A 3-minute look (no call needed)

Hi [First name],

Rather than chase you, here is the 3-minute recording of a club setting up a week of rink bookings and publishing a team: [video link]

If it is useful, I will set [Club name] up myself — you send me your session times and I will do the rest.

If it is not for you, tell me and I will stop emailing.

[Your name]`,
  },
  {
    id: 'cold-3',
    category: 'Outreach',
    title: 'Cold email 3 — the close',
    purpose: 'Day 12. Make saying no easy, so the yes replies stand out.',
    body: `Subject: Closing the file on [Club name]

Hi [First name],

I will assume the timing is wrong and leave you alone after this.

One thing before I do: if your committee is looking at anything for next season, this is a single page you can hand round — [one-page link]. It covers cost (free tier), data (your club owns it) and what a member actually sees.

If you would rather I set up a demo club you can log into and poke at, just reply "demo" and I will send the login.

[Your name]`,
  },
  {
    id: 'county',
    category: 'Partnership',
    title: 'County association email',
    purpose: 'Ask for the thing that actually matters: the introduction to club secretaries.',
    body: `Subject: Free access for every [County] affiliated club

Dear [Name],

I run Bowls Time, club software built for bowls clubs — rink bookings, team selection with automatic notification to players, league fixtures and printable tables.

I would like to offer every club affiliated to [County] free access for their next season, with no strings and no card details. For the county itself I can set up league tables and county squad selection at no cost.

The only thing I would ask in return, if you are comfortable, is a short introduction email from you to club secretaries letting them know it exists.

Happy to send you a two-paragraph summary you can use, or to talk it through at a county meeting.

[Your name]
Bowls Time — [app link]`,
  },
  {
    id: 'facebook',
    category: 'Social',
    title: 'Facebook group post (value, not advert)',
    purpose: 'Post this as a person helping admins, not as a company selling.',
    body: `Genuine question for secretaries and fixture secretaries — how are you handling availability this season?

At our place we were doing it by text, one player at a time, and it took two evenings a week. What finally worked was having members mark themselves available in the app, then publishing the team once and letting it email everyone, with the rinks already booked.

If anyone is still on the paper diary and wants to see how it looks for their session times, happy to show you — I built the thing so I am biased, but the set-up is free and takes an evening.

What is everyone else doing? Curious whether anyone has cracked a good system for late drop-outs.`,
  },
  {
    id: 'press',
    category: 'Press',
    title: 'Local press release',
    purpose: 'Send to local papers in club towns. 200 words, one photo, one quote.',
    body: `Bowls club volunteers win back their evenings as paper diary goes online

Volunteers at [Club name] have replaced their handwritten rink diary with an online booking system, after finding that members were increasingly booking by text message and double-booking rinks.

[Secretary name], club secretary, said: "Everything used to run through me. If I was away, nothing got booked. Now members book their own rink and the committee can see exactly what is happening."

The club has also moved team selection online. Players mark the matches they are available for, and the published team sheet is emailed and pushed to every player's phone, along with the rink they are on.

[Optional: the club reports that selection now takes [X] minutes instead of [Y], and that [number] members have signed up in the first [period].]

[Club name] plays in the [league] and welcomes new members. Contact [name] on [number].

About Bowls Time: club management software built specifically for bowls clubs, free for clubs to run a season. [app link]`,
  },
  {
    id: 'committee',
    category: 'Committee',
    title: 'Committee one-pager copy',
    purpose: 'The wording that gets a decision at a committee meeting, without you being in the room.',
    body: `Proposal: move rink bookings and team selection to Bowls Time

What it is: club software built only for bowls clubs. Members log in on their phone.

What changes for members: they book their own rink, see which rinks are free, and get their team selection by email and phone notification. No new passwords to remember — they sign in with email.

What changes for the committee: one shared diary, automatic clash warnings, printable team sheets and league tables, and a member list with contact details.

Cost: the free tier covers rink booking, selection, competitions and leagues at our size. There is nothing to pay to run a season. [If we later want X, it is Y — decide later, not now.]

Data and privacy: the club owns its data, it can be exported, and it is held in the UK.

Risk: none to the paper process — we can run both for a fortnight and compare.

Recommendation: approve a two-week trial, secretary to set it up, review at the next meeting.`,
  },
  {
    id: 'objections',
    category: 'Objections',
    title: 'Objection handling — say it out loud',
    purpose: 'The five things you will hear on every call, and the honest answer.',
    body: `"We are happy with the paper diary."
Fair — it works right up until you are ill, away, or two people book rink 4. Ask: what happens to the diary when you are on holiday? Then leave it. They will call you in a year.

"It is another thing for members to learn."
If they can send a text message they can do this; there is one screen with a date and the free rinks. Offer to sit with four members for ten minutes at the club and prove it.

"The committee needs to decide."
Good, that is healthy. Send the one-pager and offer to dial in to the meeting for five minutes. Never ask the secretary to sell it for you.

"Who owns the data / GDPR?"
The club does. It can be exported at any time. Only the club's own members see member details, and the member list is not visible to other clubs.

"We have no budget."
Neither does anyone. That is why the free tier exists — run a season on it, pay nothing, and decide next year whether the extras are worth it.`,
  },
  {
    id: 'referral',
    category: 'Referral',
    title: 'Referral ask (one sentence)',
    purpose: 'Send to every happy admin. Ask for a name, never a testimonial.',
    body: `Chuffed this is working for [Club name]. One favour: is there a secretary at another club who is still doing the diary by hand? Send me their name and I will set them up myself and mention you sent me — no cost to either of you.`,
  },
  {
    id: 'homepage',
    category: 'Website',
    title: 'Homepage headline options',
    purpose: 'Test these in order. Short, concrete, no adjectives.',
    body: `1. Your rink diary, online. Free for the season.
2. Pick your team. Everyone gets told. Rinks included.
3. Run the whole club from one screen — bookings, teams, leagues, members.
4. Built for bowls clubs. Not for gyms, not for tennis.
5. Stop being the club's booking system.

Sub-line to sit under any of them:
Everything a bowls club needs to run its week: rink bookings, availability, team selection, league tables and member admin. Set up in an evening.`,
  },
];

export const KPIS = [
  {
    metric: 'Clubs contacted',
    target: '150 in 90 days',
    why: 'The only number fully in your control. If it is low, nothing downstream matters.',
  },
  {
    metric: 'Replies',
    target: '15% of contacted',
    why: 'Below 10% means the first line is about you, not them.',
  },
  {
    metric: 'Demos run',
    target: '30',
    why: 'Demos close clubs. Emails do not.',
  },
  {
    metric: 'Clubs live',
    target: '12',
    why: 'Live means a real booking has been made by a real member.',
  },
  {
    metric: 'Activation: first booking within 7 days',
    target: '80% of new clubs',
    why: 'A club that does not book in week one never comes back. Chase this, not sign-ups.',
  },
  {
    metric: 'Second user added',
    target: '70% of new clubs',
    why: 'One admin on their own is a hobby. Two people means the club has adopted it.',
  },
  {
    metric: 'North star: bookings per club per week',
    target: 'rising month on month',
    why: 'If this rises, the club will renew without being asked. If it falls, they churn quietly.',
  },
];

export const THIS_WEEK = [
  'Write your one-liner and put it in your email signature',
  'Record a 3-minute demo on your phone — rink diary, team sheet, league table',
  'List 20 clubs in your own county with secretary names and emails',
  'Send 10 personal emails using the cold email template — change one detail each',
  'Join 3 bowls Facebook groups and answer two questions without linking anything',
  'Ask one current club for the name of one secretary still on paper',
  'Diary 5 hours next week and protect them',
];

export const ASSETS_NEEDED = [
  'One-page committee summary (PDF) — the most requested thing on the phone',
  'Three screen recordings, under 3 minutes each',
  'One case study with a name, a photo and a quote',
  'Photograph of a real green, not stock imagery',
  'A demo club login you can hand out on the spot',
];