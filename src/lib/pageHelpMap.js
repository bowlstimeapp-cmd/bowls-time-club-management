/**
 * Page → Help Centre mapping for the context-sensitive help pop-ups.
 *
 * Each entry:
 *   sectionId - an id in SECTIONS (src/pages/HelpCentre.jsx)
 *   steps     - step headings to show (must match "heading" exactly).
 *               Leave as [] to show every step in that section.
 *   audience  - 'club admin' or 'selector or club admin'
 *
 * The help TEXT is never copied here — the pop-up reads it from SECTIONS.
 */

export const AUDIENCE_CLUB_ADMIN = 'club admin';
export const AUDIENCE_SELECTOR_OR_ADMIN = 'selector or club admin';

export const PAGE_HELP = {
  ClubSettings: {
    sectionId: 'club-settings',
    steps: [
      'General Club Details',
      'Rink & Session Configuration',
      'Booking Rules',
      'Modules',
      'Saving your changes',
    ],
    audience: AUDIENCE_CLUB_ADMIN,
  },

  Selection: {
    sectionId: 'selection',
    steps: [
      'Creating a new selection',
      'Publishing a selection',
      'Printing a team sheet',
    ],
    audience: AUDIENCE_SELECTOR_OR_ADMIN,
  },

  SelectionEditor: {
    sectionId: 'selection',
    steps: [
      'Assigning players to rinks',
      'Setting the Home and Away Captains',
      'Saving as a draft',
      'Publishing a selection',
      'Sending SMS notifications',
    ],
    audience: AUDIENCE_SELECTOR_OR_ADMIN,
  },

  LeagueAdmin: {
    sectionId: 'leagues',
    steps: [
      'Creating a new league',
      'Configuring scoring rules',
      'Adding teams to the league',
      'Generating fixtures',
      'Entering match scores',
    ],
    audience: AUDIENCE_CLUB_ADMIN,
  },

  ClubTournaments: {
    sectionId: 'competitions',
    steps: [
      'How to navigate to competitions',
      'Creating a competition draw',
    ],
    audience: AUDIENCE_CLUB_ADMIN,
  },

  TournamentEditor: {
    sectionId: 'competitions',
    steps: [
      'Adding players or teams to the draw',
      'Generating the knockout bracket',
      'Managing round robin groups',
      'Entering results and advancing the draw',
      'Printing or downloading the draw',
    ],
    audience: AUDIENCE_CLUB_ADMIN,
  },

  CompetitionEntriesAdmin: {
    sectionId: 'competitions',
    steps: [
      'Creating a competition for member entry',
      'Managing entries as a Club Admin',
    ],
    audience: AUDIENCE_CLUB_ADMIN,
  },

  OpenCompetitions: {
    sectionId: 'competitions',
    steps: ['Open Competitions CRM (for external entries)'],
    audience: AUDIENCE_CLUB_ADMIN,
  },
};