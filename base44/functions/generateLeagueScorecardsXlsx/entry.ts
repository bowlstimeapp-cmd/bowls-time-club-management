import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { leagueId, clubId } = await req.json();
    if (!leagueId || !clubId) return Response.json({ error: 'Missing leagueId or clubId' }, { status: 400 });

    const [leagues, fixtures, teams, clubs] = await Promise.all([
      base44.asServiceRole.entities.League.filter({ id: leagueId }),
      base44.asServiceRole.entities.LeagueFixture.filter({ league_id: leagueId }),
      base44.asServiceRole.entities.LeagueTeam.filter({ league_id: leagueId }),
      base44.asServiceRole.entities.Club.filter({ id: clubId }),
    ]);

    const league = leagues[0];
    const club = clubs[0];
    if (!league || !club) return Response.json({ error: 'League or club not found' }, { status: 404 });

    const sortedFixtures = fixtures.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

    // Assign round numbers by unique date
    const dateToRound = {};
    let roundNum = 1;
    sortedFixtures.forEach(f => {
      if (!dateToRound[f.match_date]) dateToRound[f.match_date] = roundNum++;
    });

    // CSV escape helper
    const esc = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('—') || str.includes('–')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rowLine = (cells) => cells.map(esc).join(',');

    const lines = [];

    for (const fixture of sortedFixtures) {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);
      if (!homeTeam || !awayTeam) continue;

      const matchDate = new Date(fixture.match_date + 'T12:00:00');
      const dateStr = matchDate.toLocaleDateString('en-GB', {
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric'
      });
      const round = dateToRound[fixture.match_date];
      const timeRange = (league.start_time && league.end_time) ? `${league.start_time}-${league.end_time}` : '';

      // Scorecard header
      lines.push(rowLine([`${league.name} - ${club.season === 'indoor' ? 'Indoor' : 'Outdoor'} Season`, '', '', '', '']));
      lines.push(rowLine([`${dateStr} | Round ${round} | ${timeRange} | Rink ${fixture.rink_number || 'TBC'}`, '', '', '', '']));
      lines.push(rowLine(['', '', '', '', '']));

      // Column headers
      lines.push(rowLine([homeTeam.name, '', 'END', '', awayTeam.name]));
      lines.push(rowLine(['Score', 'Running Total', '', 'Running Total', 'Score']));

      // End rows
      for (let end = 1; end <= 24; end++) {
        lines.push(rowLine(['', '', end, '', '']));
      }

      // Footer
      lines.push(rowLine(['TOTAL', '', '', '', 'TOTAL']));
      lines.push(rowLine(['', '', '', '', '']));
      lines.push(rowLine(['Skip (Home):', '', '', 'Skip (Away):', '']));
      lines.push(rowLine(['', '', '', '', '']));
      lines.push(rowLine(['', '', '', '', '']));
      lines.push(rowLine(['--- END OF SCORECARD ---', '', '', '', '']));
      lines.push(rowLine(['', '', '', '', '']));
      lines.push(rowLine(['', '', '', '', '']));
    }

    const csvContent = lines.join('\n');

    return Response.json({ success: true, csv: csvContent, filename: `${league.name}-scorecards.csv` });
  } catch (error) {
    console.error('CSV scorecard error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});