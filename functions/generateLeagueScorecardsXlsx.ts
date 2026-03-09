import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import * as XLSX from 'npm:xlsx@0.18.5';

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

    const wb = XLSX.utils.book_new();

    const isSets = league.is_sets && league.sets_ends;
    const endsPerSet = isSets ? parseInt(league.sets_ends) : 24;
    const totalEnds = isSets ? endsPerSet * Math.ceil(24 / endsPerSet) : 24;

    for (const fixture of sortedFixtures) {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);
      if (!homeTeam || !awayTeam) continue;

      const matchDate = new Date(fixture.match_date);
      const dateStr = matchDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
      const round = dateToRound[fixture.match_date];

      const rows = [];

      // Header
      rows.push([`${league.name} — ${club.season === 'indoor' ? 'Indoor' : 'Outdoor'} Season`]);
      rows.push([`${dateStr}  |  Round ${round}  |  ${league.start_time}–${league.end_time}  |  Rink ${fixture.rink_number || 'TBC'}`]);
      rows.push([]);

      // Teams header
      rows.push([homeTeam.name, '', 'END', '', awayTeam.name]);
      rows.push(['Score', 'Running Total', '', 'Running Total', 'Score']);

      // End rows
      let endCount = 0;
      for (let end = 1; end <= (isSets ? totalEnds : 24); end++) {
        endCount++;
        rows.push(['', '', end, '', '']);
        if (isSets && endCount % endsPerSet === 0) {
          rows.push(['SET TOTAL', '', '', '', 'SET TOTAL']);
          endCount = 0;
        }
      }

      // Final total
      rows.push(['TOTAL', '', '', '', 'TOTAL']);
      rows.push([]);
      rows.push(['Skip signature (Home):', '', '', 'Skip signature (Away):', '']);

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Column widths
      ws['!cols'] = [
        { wch: 18 }, { wch: 18 }, { wch: 6 }, { wch: 18 }, { wch: 18 }
      ];

      // Merge title rows across all 5 cols
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 1, c: 0 }, e: { r: 1, c: 4 } },
      ];

      const sheetName = `R${round} ${homeTeam.name.substring(0,8)} v ${awayTeam.name.substring(0,8)}`.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // Write to buffer
    const xlsxBuffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([xlsxBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({ file: blob });

    await base44.asServiceRole.entities.League.update(leagueId, { scorecards_pdf_url: file_url });

    return Response.json({ success: true, file_url });
  } catch (error) {
    console.error('XLSX scorecard error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});