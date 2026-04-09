import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

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
      base44.asServiceRole.entities.League.filter({ id: leagueId }),
      base44.asServiceRole.entities.LeagueFixture.filter({ league_id: leagueId }),
      base44.asServiceRole.entities.LeagueTeam.filter({ league_id: leagueId }),
      base44.asServiceRole.entities.Club.filter({ id: clubId })
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

    // Generate PDF using jsPDF
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const cardWidth = 69;
    const cardHeight = 100;
    const marginX = 8.5;
    const marginY = 6;

    let cardCount = 0;

    for (const card of scorecards) {
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
      const nameLines = doc.splitTextToSize(card.leagueName, infoBoxWidth - 4);
      doc.text(nameLines[0], infoBoxX + 2, y + 6);
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      doc.text(card.season, infoBoxX + 2, y + 10);
      doc.text(card.seasonYears, infoBoxX + 2, y + 14);

      // Match details bar
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      const detailsY = y + headerBoxHeight + 4;
      const matchInfo = `${card.dayName} - ${card.dateStr} - Round ${card.round} -`;
      const timeInfo = `${card.time} - Rink ${card.rink}`;
      doc.text(matchInfo, x + cardWidth / 2, detailsY, { align: 'center' });
      doc.text(timeInfo, x + cardWidth / 2, detailsY + 3.5, { align: 'center' });

      // Team names row
      const teamsY = y + headerBoxHeight + 10;
      doc.setFillColor(230, 230, 230);
      doc.rect(x, teamsY, cardWidth, 6, 'F');
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      doc.text(card.teamAName, x + 3, teamsY + 4);
      doc.text('Vs', x + cardWidth / 2, teamsY + 4, { align: 'center' });
      doc.text(card.teamBName, x + cardWidth - 3, teamsY + 4, { align: 'right' });

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

    const pdfBuffer = doc.output('arraybuffer');
    
    // Upload PDF using Core.UploadFile integration
    const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
    const { file_url } = await base44.asServiceRole.integrations.Core.UploadFile({
      file: blob
    });

    // Update league with PDF URL
    await base44.asServiceRole.entities.League.update(leagueId, {
      scorecards_pdf_url: file_url
    });

    return Response.json({ 
      success: true,
      file_url 
    });
  } catch (error) {
    console.error('Scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});