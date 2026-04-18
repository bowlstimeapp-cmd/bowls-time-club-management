import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Fetches all the context needed to enrich bookings with player names,
 * then opens a print window with a nicely formatted daily summary.
 */
export default function DailyBookingsSummary({ clubId, selectedDate, bookings, club }) {
  const [generating, setGenerating] = useState(false);

  const dateString = format(selectedDate, 'yyyy-MM-dd');
  const dateDisplay = format(selectedDate, 'EEEE d MMMM yyyy');

  // League data – needed to look up team players
  const { data: leagueFixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId, dateString],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId, match_date: dateString }),
    enabled: !!clubId,
  });

  const { data: leagueTeams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  // Team Selections for this date
  const { data: teamSelections = [] } = useQuery({
    queryKey: ['teamSelections', clubId, dateString],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId, match_date: dateString }),
    enabled: !!clubId,
  });

  // All members for name lookups
  const { data: members = [] } = useQuery({
    queryKey: ['allMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  const getMemberName = (email) => {
    if (!email) return null;
    const m = members.find(m => m.user_email === email);
    if (m) {
      if (m.first_name && m.surname) return `${m.first_name} ${m.surname}`;
      if (m.user_name) return m.user_name;
    }
    return email;
  };

  const getLeagueFixtureForBooking = (booking) => {
    return leagueFixtures.find(f => f.booking_id === booking.id);
  };

  const getTeamSelectionForBooking = (booking) => {
    // Match by rink number and time overlap
    return teamSelections.find(sel => {
      if (!sel.selected_rinks || !Array.isArray(sel.selected_rinks)) return false;
      return sel.selected_rinks.includes(booking.rink_number) &&
        sel.match_start_time === booking.start_time;
    });
  };

  const getLeagueFixturePlayers = (fixture) => {
    const homeTeam = leagueTeams.find(t => t.id === fixture.home_team_id);
    const awayTeam = leagueTeams.find(t => t.id === fixture.away_team_id);
    const league = leagues.find(l => l.id === fixture.league_id);

    const getRotaPlayers = (team) => {
      if (!team) return [];
      const rota = team.fixture_rota || {};
      const players = rota[fixture.id];
      if (players && players.length > 0) {
        return players.map(email => getMemberName(email)).filter(Boolean);
      }
      // Fall back to general team players
      return (team.players || []).map(email => getMemberName(email)).filter(Boolean);
    };

    return {
      league: league?.name || 'League',
      homeTeamName: homeTeam?.name || 'Home',
      awayTeamName: awayTeam?.name || 'Away',
      homePlayers: getRotaPlayers(homeTeam),
      awayPlayers: getRotaPlayers(awayTeam),
    };
  };

  const getSelectionPlayers = (selection) => {
    const sels = selection.selections || {};
    const players = [];
    Object.entries(sels).forEach(([pos, email]) => {
      if (email) players.push({ pos, name: getMemberName(email) });
    });
    return players;
  };

  const handlePrint = () => {
    setGenerating(true);

    // Group approved bookings by time slot, then by rink
    const approved = bookings.filter(b => b.status === 'approved' || b.status === 'pending');
    const sorted = [...approved].sort((a, b) => {
      if (a.start_time < b.start_time) return -1;
      if (a.start_time > b.start_time) return 1;
      return a.rink_number - b.rink_number;
    });

    // Group by time slot
    const slotMap = {};
    sorted.forEach(b => {
      const key = `${b.start_time}–${b.end_time}`;
      if (!slotMap[key]) slotMap[key] = [];
      slotMap[key].push(b);
    });

    const competitionColours = {
      'Club': '#d1fae5',
      'County': '#dbeafe',
      'National': '#fce7f3',
      'Roll-up': '#fef3c7',
      'Private Roll-up': '#ede9fe',
      'Other': '#f3f4f6',
    };

    let bodyHtml = '';

    Object.entries(slotMap).forEach(([timeSlot, slotBookings]) => {
      bodyHtml += `
        <div class="time-block">
          <div class="time-header">${timeSlot}</div>
          <div class="rink-grid">
      `;

      slotBookings.forEach(booking => {
        const fixture = getLeagueFixtureForBooking(booking);
        const selection = !fixture ? getTeamSelectionForBooking(booking) : null;
        const bgColor = competitionColours[booking.competition_type] || '#f9fafb';
        const isPending = booking.status === 'pending';

        let membersSection = '';

        if (fixture) {
          const info = getLeagueFixturePlayers(fixture);
          const homeCols = info.homePlayers.map(p => `<li>${p}</li>`).join('') || '<li><em>TBC</em></li>';
          const awayCols = info.awayPlayers.map(p => `<li>${p}</li>`).join('') || '<li><em>TBC</em></li>';
          membersSection = `
            <div class="league-players">
              <div class="team-col">
                <div class="team-name">${info.homeTeamName}</div>
                <ul>${homeCols}</ul>
              </div>
              <div class="team-col">
                <div class="team-name">${info.awayTeamName}</div>
                <ul>${awayCols}</ul>
              </div>
            </div>
            <div class="league-label">${info.league}</div>
          `;
        } else if (selection) {
          const players = getSelectionPlayers(selection);
          const playerList = players.map(p => `<li>${p.name}</li>`).join('') || '<li><em>TBC</em></li>';
          membersSection = `
            <div class="selection-players">
              <div class="team-name">${selection.competition}${selection.match_name ? ` – ${selection.match_name}` : ''}</div>
              <ul>${playerList}</ul>
            </div>
          `;
        } else if (booking.competition_type === 'Roll-up' && booking.rollup_members?.length > 0) {
          const rollupList = [
            { name: booking.booker_name },
            ...booking.rollup_members,
          ].map(m => `<li>${m.name}</li>`).join('');
          membersSection = `<div class="rollup-players"><ul>${rollupList}</ul></div>`;
        }

        bodyHtml += `
          <div class="rink-card" style="background:${bgColor}${isPending ? ';border:2px dashed #f59e0b' : ''}">
            <div class="rink-title">Rink ${booking.rink_number}</div>
            <div class="booker">${booking.booker_name}</div>
            <div class="comp-type">${booking.competition_type || ''}${booking.competition_other ? ` – ${booking.competition_other}` : ''}${booking.booking_format ? ` (${booking.booking_format})` : ''}${isPending ? ' <span class="pending-badge">Pending</span>' : ''}</div>
            ${booking.notes ? `<div class="notes">${booking.notes}</div>` : ''}
            ${membersSection}
          </div>
        `;
      });

      bodyHtml += `</div></div>`;
    });

    if (!bodyHtml) {
      bodyHtml = '<p class="no-bookings">No approved or pending bookings on this date.</p>';
    }

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Daily Bookings – ${dateDisplay}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 20px; }
    h1 { font-size: 18px; font-weight: 700; margin-bottom: 2px; }
    .subtitle { font-size: 12px; color: #555; margin-bottom: 16px; }
    .time-block { margin-bottom: 20px; }
    .time-header { font-size: 13px; font-weight: 700; background: #1f2937; color: #fff; padding: 5px 10px; border-radius: 4px; margin-bottom: 8px; }
    .rink-grid { display: flex; flex-wrap: wrap; gap: 8px; }
    .rink-card { flex: 0 0 auto; width: calc(16.66% - 8px); min-width: 120px; border-radius: 6px; padding: 8px; border: 1px solid #d1d5db; page-break-inside: avoid; }
    .rink-title { font-weight: 700; font-size: 12px; margin-bottom: 3px; }
    .booker { font-size: 10px; color: #374151; margin-bottom: 2px; }
    .comp-type { font-size: 9px; color: #6b7280; font-style: italic; margin-bottom: 4px; }
    .notes { font-size: 9px; color: #92400e; background: #fffbeb; border-radius: 3px; padding: 2px 4px; margin-bottom: 4px; }
    .pending-badge { background: #f59e0b; color: #fff; border-radius: 3px; padding: 1px 4px; font-size: 8px; font-style: normal; font-weight: 600; }
    .league-players { display: flex; gap: 6px; margin-top: 4px; }
    .team-col { flex: 1; }
    .team-name { font-weight: 600; font-size: 9px; color: #374151; border-bottom: 1px solid #d1d5db; margin-bottom: 2px; padding-bottom: 1px; }
    ul { list-style: none; padding: 0; }
    li { font-size: 9px; color: #1f2937; padding: 1px 0; }
    .league-label { font-size: 8px; color: #6b7280; margin-top: 3px; font-style: italic; }
    .selection-players { margin-top: 4px; }
    .rollup-players { margin-top: 4px; }
    .no-bookings { color: #6b7280; font-style: italic; }
    @media print {
      body { padding: 10px; }
      .time-block { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>${club?.name || 'Club'} – Daily Bookings</h1>
  <p class="subtitle">${dateDisplay}</p>
  ${bodyHtml}
</body>
</html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      setTimeout(() => {
        win.print();
      }, 500);
    }

    setGenerating(false);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handlePrint}
      disabled={generating}
      className="border-gray-400 text-gray-600 hover:bg-gray-50"
    >
      <Printer className="w-4 h-4 mr-2" />
      Print Day Summary
    </Button>
  );
}