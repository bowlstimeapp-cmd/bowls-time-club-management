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

    // Round numbers by unique date
    const dateToRound = {};
    let roundNum = 1;
    sortedFixtures.forEach(f => {
      if (!dateToRound[f.match_date]) dateToRound[f.match_date] = roundNum++;
    });

    // Helper to escape CSV values
    const csv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = (arr) => arr.map(row => row.map(csv).join(',')).join('\n');

    let csvContent = '';

    for (const fixture of sortedFixtures) {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);
      if (!homeTeam || !awayTeam) continue;

      const matchDate = new Date(fixture.match_date + 'T12:00:00');
      const dateStr = matchDate.toLocaleDateString('en-GB', { 
        weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' 
      });
      const round = dateToRound[fixture.match_date];

      csvContent += rows([
        // Header
        [`${league.name} — ${club.season === 'indoor' ? 'Indoor' : 'Outdoor'} Season`, '', '', '', ''],
        [`${dateStr}  |  Round ${round}  |  ${league.start_time}–${league.end_time}  |  Rink ${fixture.rink_number || 'TBC'}`, '', '', '', ''],
        ['', '', '', '', ''],
        // Teams header
        [homeTeam.name, '', 'END', '', awayTeam.name],
        ['Score', 'Running Total', '', 'Running Total', 'Score'],
      ]);
      csvContent += '\n';

      // End rows
      for (let end = 1; end <= 24; end++) {
        csvContent += rows([['', '', end, '', '']]);
        csvContent += '\n';
      }

      csvContent += rows([
        ['TOTAL', '', '', '', 'TOTAL'],
        ['', '', '', '', ''],
        ['Skip signature (Home):', '', '', 'Skip signature (Away):', ''],
        // Spacer between fixtures
        ['', '', '', '', ''],
        ['', '', '', '', ''],
        ['--- END OF SCORECARD ---', '', '', '', ''],
        ['', '', '', '', ''],
        ['', '', '', '', ''],
      ]);
      csvContent += '\n';
    }

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    await base44.asServiceRole.entities.League.update(leagueId, { scorecards_xlsx_url: file_url });

    return Response.json({ success: true, file_url });
  } catch (error) {
    console.error('CSV scorecard error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});