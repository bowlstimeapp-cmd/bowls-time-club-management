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

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    
    const pageWidth = 297;
    const pageHeight = 210;
    const cardWidth = 140;
    const cardHeight = 98;
    const margin = 8;

    let cardCount = 0;

    for (const fixture of sortedFixtures) {
      const homeTeam = teams.find(t => t.id === fixture.home_team_id);
      const awayTeam = teams.find(t => t.id === fixture.away_team_id);

      if (!homeTeam || !awayTeam) continue;

      // Calculate position (2x2 grid)
      const col = cardCount % 2;
      const row = Math.floor((cardCount % 4) / 2);
      const x = margin + (col * (cardWidth + margin));
      const y = margin + (row * (cardHeight + margin));

      // Start new page every 4 cards
      if (cardCount > 0 && cardCount % 4 === 0) {
        doc.addPage();
      }

      // Draw card border
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(x, y, cardWidth, cardHeight);

      // Header section
      const headerHeight = 22;
      doc.setFillColor(255, 255, 255);
      doc.rect(x, y, cardWidth, headerHeight, 'F');

      // Club logo (if available)
      if (club.logo_url) {
        try {
          // Draw placeholder box for logo
          doc.setDrawColor(220, 220, 220);
          doc.rect(x + 3, y + 3, 16, 16);
          doc.setFontSize(6);
          doc.setTextColor(150, 150, 150);
          doc.text('LOGO', x + 11, y + 11, { align: 'center' });
        } catch (e) {
          // Logo loading failed, skip
        }
      }

      // League name and season info
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      const leagueName = league.name || 'League';
      doc.text(leagueName, x + 22, y + 7);
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.text(club.season === 'indoor' ? 'Indoor Season' : 'Outdoor Season', x + 22, y + 12);
      
      const startYear = new Date(league.start_date).getFullYear();
      const endYear = new Date(league.end_date).getFullYear();
      doc.text(`${startYear}-${endYear}`, x + 22, y + 17);

      // Match details bar
      doc.setFillColor(245, 245, 245);
      doc.rect(x, y + headerHeight, cardWidth, 8, 'F');
      
      doc.setFontSize(8);
      doc.setFont(undefined, 'bold');
      const matchDate = new Date(fixture.match_date);
      const dayName = matchDate.toLocaleDateString('en-GB', { weekday: 'long' });
      const dateStr = matchDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      
      // Calculate round number
      const roundNum = sortedFixtures.findIndex(f => f.id === fixture.id) + 1;
      const matchInfo = `${dayName} - ${dateStr} - Round ${roundNum} - ${league.start_time} to ${league.end_time} - Rink ${fixture.rink_number || 'TBC'}`;
      
      doc.setFontSize(7);
      doc.text(matchInfo, x + cardWidth / 2, y + headerHeight + 5, { align: 'center' });

      // Team names
      doc.setFillColor(250, 250, 250);
      doc.rect(x, y + 30, cardWidth, 6, 'F');
      
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text(homeTeam.name || '', x + 3, y + 34.5);
      doc.text('Vs', x + cardWidth / 2, y + 34.5, { align: 'center' });
      doc.text(awayTeam.name || '', x + cardWidth - 3, y + 34.5, { align: 'right' });

      // Player positions (1, 2, 3, Skip)
      const positions = ['1', '2', '3', 'Skip'];
      let posY = y + 38;
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'normal');
      positions.forEach((pos, idx) => {
        doc.text(pos, x + cardWidth / 2, posY + (idx * 3.5), { align: 'center' });
      });

      // Score table header
      const tableStartY = y + 52;
      doc.setFillColor(240, 240, 240);
      doc.rect(x, tableStartY, cardWidth, 5, 'F');
      
      doc.setFontSize(7);
      doc.setFont(undefined, 'bold');
      doc.text('Score', x + 8, tableStartY + 3.5, { align: 'center' });
      doc.text('Total', x + 20, tableStartY + 3.5, { align: 'center' });
      doc.text('Ends', x + cardWidth / 2, tableStartY + 3.5, { align: 'center' });
      doc.text('Score', x + cardWidth - 20, tableStartY + 3.5, { align: 'center' });
      doc.text('Total', x + cardWidth - 8, tableStartY + 3.5, { align: 'center' });

      // Ends rows (1-24)
      doc.setFont(undefined, 'normal');
      doc.setFontSize(6);
      for (let end = 1; end <= 24; end++) {
        const rowY = tableStartY + 5 + (end * 1.6);
        
        // Draw horizontal line
        doc.setDrawColor(220, 220, 220);
        doc.line(x, rowY - 1.6, x + cardWidth, rowY - 1.6);
        
        // End number
        doc.text(String(end), x + cardWidth / 2, rowY, { align: 'center' });
      }

      // Vertical lines for table
      doc.setDrawColor(220, 220, 220);
      doc.line(x + 15, tableStartY, x + 15, tableStartY + 40); // Score | Total
      doc.line(x + 27, tableStartY, x + 27, tableStartY + 40); // Total | Ends
      doc.line(x + cardWidth - 27, tableStartY, x + cardWidth - 27, tableStartY + 40); // Ends | Score
      doc.line(x + cardWidth - 15, tableStartY, x + cardWidth - 15, tableStartY + 40); // Score | Total

      // Total row
      const totalRowY = tableStartY + 41;
      doc.setFillColor(240, 240, 240);
      doc.rect(x, totalRowY, cardWidth, 4, 'F');
      doc.setFont(undefined, 'bold');
      doc.setFontSize(7);
      doc.text('Total', x + 8, totalRowY + 3, { align: 'center' });
      doc.text('Total', x + cardWidth - 8, totalRowY + 3, { align: 'center' });

      // Signatures section
      doc.setFontSize(6);
      doc.setFont(undefined, 'italic');
      doc.text('Signatures', x + cardWidth / 2, totalRowY + 6, { align: 'center' });
      doc.text('of Skips', x + cardWidth / 2, totalRowY + 9, { align: 'center' });

      cardCount++;
    }

    const pdfBytes = doc.output('arraybuffer');

    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${league.name.replace(/\s+/g, '-')}-Scorecards.pdf"`
      }
    });
  } catch (error) {
    console.error('Scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});