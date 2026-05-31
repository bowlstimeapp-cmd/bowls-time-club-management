import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId, clubId, matchDate } = await req.json();

    if (!leagueId || !clubId) {
      return Response.json({ error: 'Missing leagueId or clubId' }, { status: 400 });
    }

    const [leagues, fixtures, teams, clubs] = await Promise.all([
      base44.entities.League.filter({ id: leagueId }),
      base44.entities.LeagueFixture.filter({ league_id: leagueId }),
      base44.entities.LeagueTeam.filter({ league_id: leagueId }),
      base44.entities.Club.filter({ id: clubId })
    ]);

    const league = leagues[0];
    const club = clubs[0];

    if (!league || !club) {
      return Response.json({ error: 'League or club not found' }, { status: 404 });
    }

    const allFixtures = fixtures.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));
    const sortedFixtures = (matchDate && typeof matchDate === 'string') ? allFixtures.filter(f => f.match_date === matchDate) : allFixtures;

    const dateToRound = {};
    let currentRound = 1;
    allFixtures.forEach(fixture => {
      if (!dateToRound[fixture.match_date]) {
        dateToRound[fixture.match_date] = currentRound++;
      }
    });

    const isSets = !!league.is_sets;
    const setsEnds = isSets ? (parseInt(league.sets_ends) || 8) : 0;

    const scorecards = sortedFixtures.map(fixture => {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);
      if (!homeTeam || !awayTeam) return null;

      const matchDate = new Date(fixture.match_date + 'T12:00:00');
      const dayName = matchDate.toLocaleDateString('en-GB', { weekday: 'long' });
      const day = matchDate.getDate();
      const monthName = matchDate.toLocaleDateString('en-GB', { month: 'short' });
      const year = matchDate.getFullYear();

      return {
        leagueName: league.name,
        season: club.season === 'indoor' ? 'Indoor Season' : 'Outdoor Season',
        seasonYears: `${new Date(league.start_date).getFullYear()}-${new Date(league.end_date).getFullYear()}`,
        dayName,
        dateStr: `${day} ${monthName} ${year}`,
        round: dateToRound[fixture.match_date],
        time: `${league.start_time} to ${league.end_time}`,
        rink: fixture.rink_number || 'TBC',
        teamAName: homeTeam.name,
        teamBName: awayTeam.name,
        logoUrl: club.logo_url || ''
      };
    }).filter(Boolean);

    // Player positions — same 4 labels for both sides
    const positions = ['1', '2', '3', 'Skip'];

    // Build score table rows.
    // Each position covers (totalEnds / 4) consecutive end rows, using rowspan on the player columns.
    // Standard: 24 ends, so 6 ends per position.
    // Sets: setsEnds ends per set × 2 sets, but positions span across the whole card (6 ends each for 8-end sets).
    const buildScoreRows = () => {
      if (!isSets) {
        const totalEnds = 24;
        const endsPerPosition = totalEnds / positions.length; // 6

        const rows = Array.from({ length: totalEnds }, (_, i) => {
          const isFirstInPosition = i % endsPerPosition === 0;
          const posLabel = positions[Math.floor(i / endsPerPosition)];
          const endCell = isFirstInPosition
            ? `<td class="end-num pos-first" rowspan="${endsPerPosition}"><span class="pos-label">${posLabel}</span><br>${i + 1}</td>`
            : `<td class="end-num">${i + 1}</td>`;

          return `<tr>
          <td></td>
          <td></td>
          ${endCell}
          <td></td>
          <td></td>
        </tr>`;
        }).join('');

        const total = `<tr class="total-row">
          <td colspan="2" style="text-align:left;padding-left:1mm;">Total</td>
          <td></td>
          <td colspan="2" style="text-align:left;padding-left:1mm;">Total</td>
        </tr>`;
        return rows + total;
      }

      // Sets: setsEnds ends per set, 2 sets
      // Positions span the full card: across both sets combined (setsEnds*2 total ends / 4 positions)
      const totalEnds = setsEnds * 2;
      const endsPerPosition = Math.ceil(totalEnds / positions.length);

      let rows = '';
      let globalEndIdx = 0;

      for (let set = 0; set < 2; set++) {
        for (let e = 1; e <= setsEnds; e++) {
          const isFirstInPosition = globalEndIdx % endsPerPosition === 0;
          const posLabel = positions[Math.floor(globalEndIdx / endsPerPosition)];
          const endCell = isFirstInPosition
            ? `<td class="end-num pos-first" rowspan="${endsPerPosition}"><span class="pos-label">${posLabel}</span><br>${e}</td>`
            : `<td class="end-num">${e}</td>`;

          rows += `<tr>
          <td></td>
          <td></td>
          ${endCell}
          <td></td>
          <td></td>
        </tr>`;
          globalEndIdx++;
        }

        // TOTAL row after each set
        rows += `<tr class="total-row">
          <td colspan="2" style="text-align:left;padding-left:1mm;">TOTAL</td>
          <td></td>
          <td colspan="2" style="text-align:left;padding-left:1mm;">TOTAL</td>
        </tr>`;

        // Spacer rows between sets
        if (set < 1) {
          rows += `<tr class="spacer-row"><td></td><td></td><td></td><td></td><td></td></tr>`;
          rows += `<tr class="spacer-row"><td></td><td></td><td></td><td></td><td></td></tr>`;
        }
      }

      rows += `<tr class="sets-row">
        <td colspan="2" style="text-align:center;font-weight:bold;font-size:6pt;padding:1mm;">Sets ____</td>
        <td></td>
        <td colspan="2" style="text-align:center;font-weight:bold;font-size:6pt;padding:1mm;">Sets ____</td>
      </tr>`;

      return rows;
    };

    const scoreRows = buildScoreRows();

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: A4 landscape;
      margin: 10mm;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page {
      width: 277mm;
      display: flex;
      flex-direction: row;
      gap: 2mm;
      page-break-after: always;
      page-break-inside: avoid;
    }
    .page:last-child { page-break-after: auto; }
    .scorecard {
      width: 67mm;
      height: 190mm;
      border: 1px solid #000;
      page-break-inside: avoid;
      display: flex;
      flex-direction: column;
      flex: 0 0 67mm;
      overflow: hidden;
    }
    .header {
      height: 18mm;
      border-bottom: 1px solid #000;
      display: flex;
      padding: 3mm;
      gap: 3mm;
    }
    .logo-box {
      width: 15mm;
      height: 12mm;
      border: 1px solid #ccc;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    .logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .info-box {
      border: 1px solid #000;
      flex: 1;
      padding: 1mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .league-name { font-size: 9pt; font-weight: bold; line-height: 1.1; }
    .season-info { font-size: 7pt; line-height: 1.2; }
    .match-details {
      background: #f5f5f5;
      padding: 2mm;
      text-align: center;
      font-size: 7pt;
      font-weight: bold;
      line-height: 1.3;
    }
    .teams-row {
      background: #e6e6e6;
      padding: 1.5mm 3mm;
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      font-size: 8pt;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    .vs { font-size: 7pt; }
    .score-table { width: 100%; border-collapse: collapse; font-size: 6pt; }
    .score-table th {
      background: #dcdcdc;
      padding: 1mm;
      border: 1px solid #000;
      font-weight: bold;
      font-size: 7pt;
    }
    .score-table td {
      border: 1px solid #b4b4b4;
      height: 4mm;
      text-align: center;
      padding: 0;
    }
    .score-table .end-num { font-size: 6pt; }
    .score-table .total-row { background: #dcdcdc; font-weight: bold; font-size: 7pt; }
    .score-table .spacer-row td { background: #f9f9f9; border-color: #e0e0e0; }
    .score-table .sets-row { background: #e8e8ff; font-weight: bold; }
    /* Position label shown in the Ends column, centred above each group's first end number */
    .score-table .pos-first {
      vertical-align: top;
      text-align: center;
      padding: 1px 0;
      background: #efefef;
    }
    .score-table .pos-label {
      display: block;
      font-weight: bold;
      font-size: 6.5pt;
      color: #333;
      border-bottom: 1px solid #ccc;
      margin-bottom: 1px;
    }
    .signatures {
      text-align: center;
      padding: 0.5mm 0;
      font-size: 6pt;
      line-height: 1.1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2mm;
    }
    @media print {
      .page { page-break-after: always; }
      .page:last-child { page-break-after: auto; }
    }
  </style>
</head>
<body>
${scorecards.map((card, idx) => {
  const isNewPage = idx % 4 === 0;
  const isEndPage = idx % 4 === 3 || idx === scorecards.length - 1;

  return `${isNewPage ? '<div class="page">' : ''}
  <div class="scorecard">
    <div class="header">
      <div class="logo-box">
        ${card.logoUrl ? `<img src="${card.logoUrl}" alt="Club Logo">` : ''}
      </div>
      <div class="info-box">
        <div class="league-name">${card.leagueName}</div>
        <div class="season-info">
          <div>${card.season}</div>
          <div>${card.seasonYears}</div>
        </div>
      </div>
    </div>
    <div class="match-details">
      <div>${card.dayName} - ${card.dateStr} - Round ${card.round} -</div>
      <div>${card.time} - Rink ${card.rink}</div>
    </div>
    <div class="teams-row">
      <span style="text-align:left;">${card.teamAName}</span>
      <span class="vs" style="text-align:center;padding:0 2mm;">Vs</span>
      <span style="text-align:right;">${card.teamBName}</span>
    </div>
    <table class="score-table">
      <thead>
        <tr>
          <th style="width:13mm;">Score</th>
          <th style="width:13mm;">Total</th>
          <th style="width:15mm;">Ends</th>
          <th style="width:13mm;">Score</th>
          <th style="width:13mm;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${scoreRows}
      </tbody>
    </table>
    <div class="signatures">
      <div>Signatures</div>
      <div>of Skips</div>
    </div>
  </div>
${isEndPage ? '</div>' : ''}`;
}).join('\n')}
</body>
</html>`;

    return Response.json({ html });
  } catch (error) {
    console.error('Scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});