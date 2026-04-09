import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Convert canvas px (268px = 67mm) to mm
const pxToMm = (px) => ((px * 67) / 268).toFixed(3);

function renderElement(elem, card) {
  const { type, x, y, width, height, styles } = elem;
  const fs = styles?.fontSize || 8;

  const pos = `position:absolute;left:${pxToMm(x)}mm;top:${pxToMm(y)}mm;width:${pxToMm(width)}mm;height:${pxToMm(height)}mm;`;
  const base = `${pos}font-size:${fs}pt;font-weight:${styles?.fontWeight || 'normal'};text-align:${styles?.textAlign || 'left'};${styles?.backgroundColor ? `background-color:${styles.backgroundColor};` : ''}${styles?.borderColor ? `border:1px solid ${styles.borderColor};` : ''}overflow:hidden;box-sizing:border-box;`;

  switch (type) {
    case 'logo':
      return `<div style="${base}display:flex;align-items:center;justify-content:center;">
        ${card.logoUrl ? `<img src="${card.logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain;">` : ''}
      </div>`;

    case 'competition':
      return `<div style="${base}padding:1mm 2mm;line-height:1.2;">${card.competition}</div>`;

    case 'matchName':
      return `<div style="${base}padding:1mm 2mm;line-height:1.2;">${card.clubName} vs ${card.matchName || 'Opponents'}</div>`;

    case 'date':
      return `<div style="${base}padding:1mm 2mm;line-height:1.2;">${card.dateStr} · ${card.time}</div>`;

    case 'matchDetailsBar':
      return `<div style="${base}display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;line-height:1.3;padding:1mm;">
        <div>${card.dayName} - ${card.dateStr}</div>
        <div>${card.competition} · Rink ${card.rink} (${card.tag})</div>
      </div>`;

    case 'teamsRow':
      return `<div style="${base}display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:0 2mm;">
        <span>${card.clubName}</span>
        <span style="padding:0 2mm;font-size:${Math.max(fs - 1, 6)}pt;">Vs</span>
        <span style="text-align:right;">${card.matchName || 'Opponents'}</span>
      </div>`;

    case 'players': {
      const rowH = card.players.length > 0 ? (height / card.players.length) : height;
      const rowHmm = pxToMm(rowH);
      const rows = card.players.map(p =>
        `<div style="display:grid;grid-template-columns:1fr 6mm 1fr;align-items:center;border-bottom:1px solid #b4b4b4;height:${rowHmm}mm;padding:0 2mm;font-size:${fs}pt;font-weight:bold;box-sizing:border-box;">
          <span>${p.name}</span>
          <span style="text-align:center;font-size:${Math.max(fs - 1, 6)}pt;">${p.position}</span>
          <span></span>
        </div>`
      ).join('');
      return `<div style="${base}">${rows}</div>`;
    }

    case 'scoreTable': {
      const endRows = Array.from({ length: 21 }, (_, i) =>
        `<tr>
          <td style="border:1px solid #b4b4b4;"></td>
          <td style="border:1px solid #b4b4b4;"></td>
          <td style="border:1px solid #b4b4b4;font-size:6pt;text-align:center;background:#f9f9f9;">${i + 1}</td>
          <td style="border:1px solid #b4b4b4;"></td>
          <td style="border:1px solid #b4b4b4;"></td>
        </tr>`
      ).join('');
      return `<div style="${base}">
        <table style="width:100%;height:100%;border-collapse:collapse;font-size:${fs}pt;">
          <thead>
            <tr>
              <th style="border:1px solid #000;background:#dcdcdc;padding:0.5mm;font-size:7pt;font-weight:bold;">Score</th>
              <th style="border:1px solid #000;background:#dcdcdc;padding:0.5mm;font-size:7pt;font-weight:bold;">Total</th>
              <th style="border:1px solid #000;background:#dcdcdc;padding:0.5mm;font-size:7pt;font-weight:bold;">Ends</th>
              <th style="border:1px solid #000;background:#dcdcdc;padding:0.5mm;font-size:7pt;font-weight:bold;">Score</th>
              <th style="border:1px solid #000;background:#dcdcdc;padding:0.5mm;font-size:7pt;font-weight:bold;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${endRows}
            <tr>
              <td style="border:1px solid #000;background:#dcdcdc;padding-left:1mm;font-weight:bold;font-size:7pt;">Total</td>
              <td style="border:1px solid #000;background:#dcdcdc;"></td>
              <td style="border:1px solid #000;background:#dcdcdc;"></td>
              <td style="border:1px solid #000;background:#dcdcdc;padding-left:1mm;font-weight:bold;font-size:7pt;">Total</td>
              <td style="border:1px solid #000;background:#dcdcdc;"></td>
            </tr>
          </tbody>
        </table>
      </div>`;
    }

    case 'signatures':
      return `<div style="${base}display:flex;align-items:center;justify-content:center;">Signatures of Skips</div>`;

    default:
      return '';
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { selectionId, clubId } = await req.json();
    if (!selectionId || !clubId) return Response.json({ error: 'Missing selectionId or clubId' }, { status: 400 });

    const [selectionArr, clubs, memberships, layouts] = await Promise.all([
      base44.entities.TeamSelection.filter({ id: selectionId }),
      base44.entities.Club.filter({ id: clubId }),
      base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
      base44.entities.ScorecardLayout.filter({ club_id: clubId }),
    ]);

    const selection = selectionArr[0];
    const club = clubs[0];
    const layout = layouts[0];

    if (!selection || !club) return Response.json({ error: 'Selection or club not found' }, { status: 404 });

    const elements = layout?.layout_config?.elements || [];

    const getMemberName = (email) => {
      const member = memberships.find(m => m.user_email === email);
      if (!member) return email || '';
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

    const posOrder = ['Lead', '2', '3', 'Skip', '4', '5', '6'];
    const posToNumber = { 'Lead': '1', '2': '2', '3': '3', 'Skip': 'Skip', '4': '4', '5': '5', '6': '6' };

    const rinkNumbers = [...new Set(
      Object.keys(selection.selections || {})
        .map(key => key.match(/^rink(\d+)_/)?.[1])
        .filter(Boolean)
        .map(Number)
    )].sort((a, b) => a - b);

    const allPositionKeys = Object.keys(selection.selections || {});
    const positionsForRink = (rinkNum) => {
      const prefix = `rink${rinkNum}_`;
      return posOrder.filter(pos => allPositionKeys.includes(prefix + pos));
    };

    const homeRinks = selection.home_rinks || 2;
    const selectedRinks = selection.selected_rinks || [];

    const scorecards = rinkNumbers.map(rinkNum => {
      const positions = positionsForRink(rinkNum);
      const players = positions.map(pos => ({
        position: posToNumber[pos] || pos,
        name: (selection.selections[`rink${rinkNum}_${pos}`] ? getMemberName(selection.selections[`rink${rinkNum}_${pos}`]) : '')
      }));
      return {
        competition: selection.competition,
        matchName: selection.match_name || '',
        dateStr,
        dayName,
        time: `${selection.match_start_time || ''} to ${selection.match_end_time || ''}`,
        rink: selectedRinks[rinkNum - 1] || rinkNum,
        tag: rinkNum <= homeRinks ? 'Home' : 'Away',
        players,
        logoUrl: club.logo_url || '',
        clubName: club.name || '',
      };
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page { size: A4 landscape; margin: 10mm; }
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
      flex: 0 0 67mm;
      overflow: hidden;
      position: relative;
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
  const cardHtml = elements.map(el => renderElement(el, card)).join('\n');
  return `${isNewPage ? '<div class="page">' : ''}
  <div class="scorecard">${cardHtml}</div>
${isEndPage ? '</div>' : ''}`;
}).join('\n')}
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { 'Content-Type': 'text/html' }
    });

  } catch (error) {
    console.error('Custom scorecard generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});