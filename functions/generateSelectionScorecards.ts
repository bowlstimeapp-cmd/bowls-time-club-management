import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { selectionId, clubId } = await req.json();

    if (!selectionId || !clubId) {
      return Response.json({ error: 'Missing selectionId or clubId' }, { status: 400 });
    }

    const [selectionArr, clubs, memberships] = await Promise.all([
      base44.entities.TeamSelection.filter({ id: selectionId }),
      base44.entities.Club.filter({ id: clubId }),
      base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' })
    ]);

    const selection = selectionArr[0];
    const club = clubs[0];

    if (!selection || !club) {
      return Response.json({ error: 'Selection or club not found' }, { status: 404 });
    }

    const getMemberName = (email) => {
      const member = memberships.find(m => m.user_email === email);
      if (!member) return email;
      return member.first_name && member.surname
        ? `${member.first_name} ${member.surname}`
        : member.user_name || email;
    };

    const matchDate = new Date(selection.match_date + 'T12:00:00');
    const dayName = matchDate.toLocaleDateString('en-GB', { weekday: 'long' });
    const day = matchDate.getDate();
    const monthName = matchDate.toLocaleDateString('en-GB', { month: 'short' });
    const year = matchDate.getFullYear();
    const dateStr = `${day} ${monthName} ${year}`;

    // Determine rinks from selections keys e.g. rink1_Lead, rink2_Skip
    const rinkNumbers = [...new Set(
      Object.keys(selection.selections || {})
        .map(key => key.match(/^rink(\d+)_/)?.[1])
        .filter(Boolean)
        .map(Number)
    )].sort((a, b) => a - b);

    // Determine positions used
    const allPositionKeys = Object.keys(selection.selections || {});
    const positionsForRink = (rinkNum) => {
      const prefix = `rink${rinkNum}_`;
      const posOrder = ['Lead', '2', '3', 'Skip', '4', '5', '6'];
      return posOrder.filter(pos =>
        allPositionKeys.includes(prefix + pos)
      );
    };

    // Build one scorecard per rink
    const scorecards = rinkNumbers.map(rinkNum => {
      const positions = positionsForRink(rinkNum);
      const players = positions.map(pos => {
        const email = selection.selections[`rink${rinkNum}_${pos}`];
        return {
          position: pos,
          name: email ? getMemberName(email) : ''
        };
      });

      // Determine home/away tag
      const homeRinks = selection.home_rinks || 2;
      const tag = rinkNum <= homeRinks ? 'Home' : 'Away';
      const selectedRinks = selection.selected_rinks || [];
      const rinkLabel = selectedRinks[rinkNum - 1] || rinkNum;

      return {
        competition: selection.competition,
        matchName: selection.match_name || '',
        dateStr,
        dayName,
        time: `${selection.match_start_time || ''} to ${selection.match_end_time || ''}`,
        rink: rinkLabel,
        tag,
        players,
        logoUrl: club.logo_url || '',
        clubName: club.name || ''
      };
    });

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
    .vs { font-size: 7pt; text-align: center; padding: 0 2mm; }
    .players-section {
      font-size: 8pt;
      font-weight: bold;
      border-bottom: 1px solid #000;
    }
    .players-section div {
      border-bottom: 1px solid #b4b4b4;
      padding: 0.5mm 2mm;
      height: 4.5mm;
      display: flex;
      align-items: center;
    }
    .players-section div:last-child { border-bottom: none; }
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
    .score-table .total-row {
      background: #dcdcdc;
      font-weight: bold;
      font-size: 7pt;
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

        <div class="season-info">
          <div class="league-name">${card.competition}</div>
          <div>${card.dateStr} - ${card.time}</div>
        </div>
      </div>
    </div>
    <div class="match-details">
          <div class="league-name">${card.competition}</div>
    </div>
    <div class="teams-row">
      <span style="text-align:left;">${card.clubName}</span>
      <span class="vs">Vs</span>
      <span style="text-align:right;">${card.matchName || 'Opponents'}</span>
    </div>
    <div class="players-section">
      ${card.players.map(p => `<div><strong>${p.position}:</strong>&nbsp;${p.name}</div>`).join('')}
    </div>
    <table class="score-table">
      <thead>
        <tr>
          <th style="width:13mm;">Score</th>
          <th style="width:13mm;">Total</th>
          <th style="width:17mm;">Ends</th>
          <th style="width:13mm;">Score</th>
          <th style="width:13mm;">Total</th>
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
          <td style="text-align:left; padding-left:1mm;">Total</td>
          <td></td>
          <td></td>
          <td style="text-align:left; padding-left:1mm;">Total</td>
          <td></td>
        </tr>
      </tbody>
    </table>
    <div class="signatures"><div>Signatures of Skips</div></div>
  </div>
${isEndPage ? '</div>' : ''}`;
}).join('\n')}
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Selection scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});