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
      
      const matchDate = new Date(fixture.match_date);
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

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const cardWidth = 72;
    const cardHeight = 100;
    const marginX = 8.5;
    const marginY = 6;

    let cardCount = 0;

    for (const fixture of sortedFixtures) {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);

      if (!homeTeam || !awayTeam) continue;

      // Calculate position (2x2 grid)
      const col = cardCount % 2;
      const row = Math.floor((cardCount % 4) / 2);
      const x = marginX + (col * (cardWidth + marginX));
      const y = marginY + (row * (cardHeight + marginY));

      // Start new page every 4 cards
      if (cardCount > 0 && cardCount % 4 === 0) {
        doc.addPage();
      }

      // Outer border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.rect(x, y, cardWidth, cardHeight);

      // Header box with logo and league info
      const headerBoxHeight = 18;
      doc.rect(x, y, cardWidth, headerBoxHeight);

      // Logo placeholder (left side)
      const logoSize = 12;
      doc.rect(x + 3, y + 3, logoSize, logoSize);
      
      // League info box (right side of header)
      const infoBoxX = x + logoSize + 6;
      const infoBoxWidth = cardWidth - logoSize - 9;
      doc.rect(infoBoxX, y + 3, infoBoxWidth, 12);
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      const leagueName = league.name || 'League';
      const nameLines = doc.splitTextToSize(leagueName, infoBoxWidth - 4);
      doc.text(nameLines[0], infoBoxX + 2, y + 6);
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      const seasonText = club.season === 'indoor' ? 'Indoor Season' : 'Outdoor Season';
      doc.text(seasonText, infoBoxX + 2, y + 10);
      
      const startYear = new Date(league.start_date).getFullYear();
      const endYear = new Date(league.end_date).getFullYear();
      doc.text(`${startYear}-${endYear}`, infoBoxX + 2, y + 14);

      // Match details bar
      const matchDate = new Date(fixture.match_date);
      const dayName = matchDate.toLocaleDateString('en-GB', { weekday: 'long' });
      const day = matchDate.getDate();
      const monthName = matchDate.toLocaleDateString('en-GB', { month: 'short' });
      const year = matchDate.getFullYear();
      const dateStr = `${day} ${monthName} ${year}`;
      
      const roundNum = dateToRound[fixture.match_date];
      const matchInfo = `${dayName} - ${dateStr} - Round ${roundNum} -`;
      const timeInfo = `${league.start_time} to ${league.end_time} - Rink ${fixture.rink_number || 'TBC'}`;
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      const detailsY = y + headerBoxHeight + 4;
      doc.text(matchInfo, x + cardWidth / 2, detailsY, { align: 'center' });
      doc.text(timeInfo, x + cardWidth / 2, detailsY + 3.5, { align: 'center' });

      // Team names row
      const teamsY = y + headerBoxHeight + 10;
      doc.setFillColor(230, 230, 230);
      doc.rect(x, teamsY, cardWidth, 6, 'F');
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text(homeTeam.name || '', x + 3, teamsY + 4);
      doc.text('Vs', x + cardWidth / 2, teamsY + 4, { align: 'center' });
      doc.text(awayTeam.name || '', x + cardWidth - 3, teamsY + 4, { align: 'right' });

      // Player positions
      const posStartY = teamsY + 7;
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      ['1', '2', '3', 'Skip'].forEach((pos, idx) => {
        doc.text(pos, x + cardWidth / 2, posStartY + (idx * 3), { align: 'center' });
      });

      // Score table
      const tableY = posStartY + 13;
      const colWidths = { score: 13, total: 13, ends: 20 };
      
      // Table header
      doc.setFillColor(220, 220, 220);
      doc.rect(x, tableY, cardWidth, 4, 'F');
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text('Score', x + colWidths.score / 2, tableY + 3, { align: 'center' });
      doc.text('Total', x + colWidths.score + colWidths.total / 2, tableY + 3, { align: 'center' });
      doc.text('Ends', x + cardWidth / 2, tableY + 3, { align: 'center' });
      doc.text('Score', x + cardWidth - colWidths.score - colWidths.total / 2, tableY + 3, { align: 'center' });
      doc.text('Total', x + cardWidth - colWidths.total / 2, tableY + 3, { align: 'center' });

      // Vertical lines
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.2);
      const tableHeight = 38;
      doc.line(x + colWidths.score, tableY, x + colWidths.score, tableY + tableHeight);
      doc.line(x + colWidths.score + colWidths.total, tableY, x + colWidths.score + colWidths.total, tableY + tableHeight);
      doc.line(x + cardWidth - colWidths.score - colWidths.total, tableY, x + cardWidth - colWidths.score - colWidths.total, tableY + tableHeight);
      doc.line(x + cardWidth - colWidths.total, tableY, x + cardWidth - colWidths.total, tableY + tableHeight);

      // End numbers (1-24)
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6);
      const rowHeight = 1.55;
      for (let end = 1; end <= 24; end++) {
        const rowY = tableY + 4 + (end * rowHeight);
        doc.text(String(end), x + cardWidth / 2, rowY, { align: 'center' });
      }

      // Total row
      const totalY = tableY + 4 + (24 * rowHeight) + 1;
      doc.setFillColor(220, 220, 220);
      doc.rect(x, totalY, cardWidth, 4, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Total', x + colWidths.score + colWidths.total / 2, totalY + 3, { align: 'center' });
      doc.text('Total', x + cardWidth - colWidths.total / 2, totalY + 3, { align: 'center' });

      // Signatures
      const sigY = totalY + 6;
      doc.setFontSize(6);
      doc.setFont(undefined, 'normal');
      doc.text('Signatures', x + cardWidth / 2, sigY, { align: 'center' });
      doc.text('of Skips', x + cardWidth / 2, sigY + 3, { align: 'center' });

      cardCount++;
    }

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
      gap: 0;
      page-break-after: always;
      page-break-inside: avoid;
    }
    
    .page:last-child {
      page-break-after: auto;
    }
    
    .scorecard {
      width: 69mm;
      height: 100mm;
      border: 1px solid #000;
      page-break-inside: avoid;
      display: inline-block;
      vertical-align: top;
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