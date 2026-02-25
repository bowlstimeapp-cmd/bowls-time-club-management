import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leagueId, clubId } = await req.json();

    if (!leagueId || !clubId) {
      return Response.json({ error: 'Missing leagueId or clubId' }, { status: 400 });
    }

    // Fetch league, fixtures, teams, and club data
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

    // Sort fixtures by date
    const sortedFixtures = fixtures.sort((a, b) => new Date(a.match_date) - new Date(b.match_date));

    // Calculate round numbers based on unique dates
    const dateToRound = {};
    let currentRound = 1;
    sortedFixtures.forEach(fixture => {
      if (!dateToRound[fixture.match_date]) {
        dateToRound[fixture.match_date] = currentRound++;
      }
    });

    // Build scorecard data
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

    // Generate HTML
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
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
.page {
      width: 277mm;
      display: flex;
      flex-direction: row;
      gap: 2mm;
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
.scorecard {
      width: 67mm;
      height: 190mm;
      border: 1px solid #000;
      page-break-inside: avoid;
      display: block;
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
    
    .logo-box img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .info-box {
      border: 1px solid #000;
      flex: 1;
      padding: 1mm 2mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    
    .league-name {
      font-size: 9pt;
      font-weight: bold;
      line-height: 1.1;
    }
    
    .season-info {
      font-size: 7pt;
      line-height: 1.2;
    }
    
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
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 8pt;
      font-weight: bold;
      border-top: 1px solid #000;
      border-bottom: 1px solid #000;
    }
    
    .vs {
      font-size: 7pt;
    }
    
    .players-section {
      padding: 2mm 0;
      text-align: center;
      font-size: 7pt;
      line-height: 3mm;
    }
    
    .score-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 6pt;
    }
    
    .score-table th {
      background: #dcdcdc;
      padding: 1mm;
      border: 1px solid #000;
      font-weight: bold;
      font-size: 7pt;
    }
    
    .score-table td {
      border: 1px solid #b4b4b4;
      height: 3.2mm;
      text-align: center;
      padding: 0;
    }
    
    .score-table .end-num {
      font-size: 6pt;
    }
    
    .score-table .total-row {
      background: #dcdcdc;
      font-weight: bold;
      font-size: 7pt;
    }
    
    .signatures {
      text-align: center;
      padding: 2mm 0 1mm 0;
      font-size: 6pt;
      line-height: 1.3;
    }
    
    @media print {
      .page {
        page-break-after: always;
      }
      .page:last-child {
        page-break-after: auto;
      }
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
      <span>${card.teamAName}</span>
      <span class="vs">Vs</span>
      <span>${card.teamBName}</span>
    </div>
    
    <div class="players-section">
      <div>1</div>
      <div>2</div>
      <div>3</div>
      <div>Skip</div>
    </div>
    
    <table class="score-table">
      <thead>
        <tr>
          <th style="width: 13mm;">Score</th>
          <th style="width: 13mm;">Total</th>
          <th style="width: 17mm;">Ends</th>
          <th style="width: 13mm;">Score</th>
          <th style="width: 13mm;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${Array.from({ length: 24 }, (_, i) => `
        <tr>
          <td></td>
          <td></td>
          <td class="end-num">${i + 1}</td>
          <td></td>
          <td></td>
        </tr>`).join('')}
        <tr class="total-row">
          <td colspan="2">Total</td>
          <td></td>
          <td colspan="2">Total</td>
        </tr>
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

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      }
    });
  } catch (error) {
    console.error('Scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});