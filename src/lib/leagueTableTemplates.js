/**
 * League Table Print Templates
 * Generates full HTML strings for window.print() usage.
 */
import { format, parseISO } from 'date-fns';

const FONT_SIZES = {
  small:  { base: '11px', heading: '18px', sub: '13px', table: '11px' },
  medium: { base: '13px', heading: '22px', sub: '15px', table: '13px' },
  large:  { base: '15px', heading: '26px', sub: '17px', table: '15px' },
};

function lighten(hex, amount = 0.88) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${Math.round(r + (255 - r) * amount)},${Math.round(g + (255 - g) * amount)},${Math.round(b + (255 - b) * amount)})`;
}

function formatDate(iso) {
  if (!iso) return '';
  try { return format(parseISO(iso), 'd MMMM yyyy'); } catch { return iso; }
}

function buildTableRows(tableData) {
  return (tableData || []).map(row => `
    <tr>
      <td class="pos">${row.position}</td>
      <td class="team">${row.teamName}</td>
      <td>${row.played}</td>
      <td>${row.won}</td>
      <td>${row.drawn}</td>
      <td>${row.lost}</td>
      <td>${row.pointsFor}</td>
      <td>${row.pointsAgainst}</td>
      <td>${row.pointsDiff > 0 ? '+' : ''}${row.pointsDiff}</td>
      <td class="pts">${row.points}</td>
    </tr>`).join('');
}

function headerBlock(data) {
  const { clubName, logoUrl, headerImgUrl, leagueName, leagueFormat,
    startDate, endDate, sessionTime, datePrinted,
    showAccurateAsOf, showSessionTime, showLeagueDates, fontSize } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;

  return `
    ${headerImgUrl ? `<img src="${headerImgUrl}" class="header-img" alt="Club header" />` : ''}
    <div class="sheet-header">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="${clubName}" />` : ''}
      <div class="club-name" style="font-size:${fs.heading}">${clubName}</div>
      <div class="league-name" style="font-size:${fs.sub}">${leagueName}</div>
      ${leagueFormat ? `<div class="format-badge">${leagueFormat}</div>` : ''}
      ${showLeagueDates && startDate && endDate ? `<div class="meta-row">📅 ${formatDate(startDate)} – ${formatDate(endDate)}</div>` : ''}
      ${showSessionTime && sessionTime ? `<div class="meta-row">⏰ Session: <strong>${sessionTime}</strong></div>` : ''}
      ${showAccurateAsOf ? `<div class="meta-row accurate-as-of">Accurate as of ${datePrinted}</div>` : ''}
    </div>`;
}

// ── Classic ─────────────────────────────────────────────────────────────────
function classicTemplate(data) {
  const { primaryColour, fontSize, tableData, showFooter, footerText } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const light = lighten(primaryColour, 0.92);
  const rows = buildTableRows(tableData);

  return `<html><head><title>League Table</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;padding:24px;color:#111;font-size:${fs.base}}
    .header-img{width:100%;max-height:100px;object-fit:cover;display:block;margin-bottom:0}
    .sheet-header{text-align:center;margin-bottom:20px;padding-top:12px}
    .logo{max-height:64px;margin-bottom:8px}
    .club-name{font-weight:bold;margin-bottom:4px}
    .league-name{font-weight:600;font-size:${fs.sub};margin-bottom:4px}
    .format-badge{display:inline-block;font-size:11px;font-weight:600;border-radius:4px;padding:2px 12px;margin:4px 0;border:1px solid ${primaryColour};color:${primaryColour}}
    .meta-row{font-size:11px;color:#555;margin-top:3px}
    .accurate-as-of{color:#888;font-style:italic;margin-top:6px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:${fs.table}}
    thead tr{background:${primaryColour};color:white}
    thead th{padding:8px 10px;text-align:center;font-weight:600}
    thead th.team-col{text-align:left}
    tbody tr:nth-child(even){background:${light}}
    tbody tr:nth-child(odd){background:#fff}
    tbody td{padding:7px 10px;text-align:center;border-bottom:1px solid #eee}
    td.team{text-align:left;font-weight:500}
    td.pos{font-weight:700}
    td.pts{font-weight:700}
    .footer{margin-top:16px;text-align:center;font-size:11px;color:#777;border-top:1px solid #ddd;padding-top:8px}
    @media print{body{padding:12px}}
  </style></head><body>
    ${headerBlock(data)}
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="team-col">Team</th>
          <th>P</th><th>W</th><th>D</th><th>L</th>
          <th>PF</th><th>PA</th><th>+/-</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${showFooter && footerText ? `<div class="footer">${footerText}</div>` : ''}
  </body></html>`;
}

// ── Modern ──────────────────────────────────────────────────────────────────
function modernTemplate(data) {
  const { primaryColour, fontSize, tableData, showFooter, footerText } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const rows = buildTableRows(tableData);

  return `<html><head><title>League Table</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:system-ui,Arial,sans-serif;padding:24px;color:#111;font-size:${fs.base}}
    .header-img{width:100%;max-height:100px;object-fit:cover;display:block;margin-bottom:0}
    .sheet-header{margin-bottom:20px;padding:16px 20px;border-left:5px solid ${primaryColour};background:#fafafa}
    .logo{max-height:56px;margin-bottom:6px;display:block}
    .club-name{font-weight:800;font-size:${fs.heading};letter-spacing:-0.5px}
    .league-name{font-size:${fs.sub};font-weight:600;color:#333;margin-top:2px}
    .format-badge{display:inline-block;font-size:11px;font-weight:700;border-radius:20px;padding:2px 12px;margin:4px 0;background:${primaryColour};color:white}
    .meta-row{font-size:11px;color:#666;margin-top:3px}
    .accurate-as-of{color:#aaa;font-style:italic;margin-top:5px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:${fs.table}}
    thead tr{background:#1a1a1a;color:white}
    thead th{padding:8px 10px;text-align:center;font-weight:600}
    thead th.team-col{text-align:left}
    tbody tr{border-bottom:1px solid #e5e7eb}
    tbody td{padding:7px 10px;text-align:center}
    td.team{text-align:left;font-weight:500}
    td.pos{font-weight:700;color:#555}
    td.pts{font-weight:700;color:#111}
    .footer{margin-top:16px;font-size:11px;color:#999;border-top:1px solid #e5e7eb;padding-top:8px}
    @media print{body{padding:12px}}
  </style></head><body>
    ${headerBlock(data)}
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="team-col">Team</th>
          <th>P</th><th>W</th><th>D</th><th>L</th>
          <th>PF</th><th>PA</th><th>+/-</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${showFooter && footerText ? `<div class="footer">${footerText}</div>` : ''}
  </body></html>`;
}

// ── Minimal ──────────────────────────────────────────────────────────────────
function minimalTemplate(data) {
  const { fontSize, tableData, showFooter, footerText } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const rows = buildTableRows(tableData);

  return `<html><head><title>League Table</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:24px;color:#000;font-size:${fs.base}}
    .header-img{width:100%;max-height:90px;object-fit:cover;display:block;margin-bottom:0}
    .sheet-header{text-align:center;margin-bottom:20px;padding-top:10px}
    .logo{max-height:54px;margin-bottom:6px}
    .club-name{font-weight:bold;font-size:${fs.heading}}
    .league-name{font-weight:600;font-size:${fs.sub};margin-top:2px}
    .format-badge{font-size:11px;font-weight:600;padding:2px 0;margin:3px 0;display:block}
    .meta-row{font-size:11px;color:#444;margin-top:2px}
    .accurate-as-of{font-style:italic;color:#666;margin-top:5px}
    table{width:100%;border-collapse:collapse;margin-top:12px;font-size:${fs.table}}
    thead tr{border-top:2px solid #000;border-bottom:2px solid #000}
    thead th{padding:6px 10px;text-align:center;font-weight:bold}
    thead th.team-col{text-align:left}
    tbody tr{border-bottom:1px solid #ccc}
    tbody td{padding:6px 10px;text-align:center}
    td.team{text-align:left}
    td.pos{font-weight:bold}
    td.pts{font-weight:bold}
    .footer{margin-top:14px;font-size:11px;color:#444;border-top:1px solid #999;padding-top:7px}
    @media print{body{padding:12px}}
  </style></head><body>
    ${headerBlock(data)}
    <table>
      <thead>
        <tr>
          <th>#</th>
          <th class="team-col">Team</th>
          <th>P</th><th>W</th><th>D</th><th>L</th>
          <th>PF</th><th>PA</th><th>+/-</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${showFooter && footerText ? `<div class="footer">${footerText}</div>` : ''}
  </body></html>`;
}

// ── Custom HTML renderer ─────────────────────────────────────────────────────
function renderCustomHtml(template, data) {
  const tableRowsHtml = `<tbody>${buildTableRows(data.tableData)}</tbody>`;
  const replacements = {
    league_name:    data.leagueName || '',
    league_format:  data.leagueFormat || '',
    start_date:     formatDate(data.startDate),
    end_date:       formatDate(data.endDate),
    session_time:   data.sessionTime || '',
    date_printed:   data.datePrinted || '',
    accurate_as_of: `Accurate as of ${data.datePrinted || ''}`,
    club_name:      data.clubName || '',
    logo_url:       data.logoUrl || '',
    club_header_img: data.headerImgUrl || '',
    footer_text:    data.footerText || '',
    table_rows:     tableRowsHtml,
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => replacements[k] ?? '');
}

// ── Public API ───────────────────────────────────────────────────────────────
export const TABLE_TEMPLATE_OPTIONS = [
  { value: 'classic', label: 'Classic',  description: 'Traditional layout with primary colour header and alternating rows' },
  { value: 'modern',  label: 'Modern',   description: 'Clean sans-serif with dark header and left colour accent' },
  { value: 'minimal', label: 'Minimal',  description: 'Plain black and white — functional and printer-friendly' },
];

const TEMPLATES = { classic: classicTemplate, modern: modernTemplate, minimal: minimalTemplate };

async function toBase64(url) {
  if (!url) return '';
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch { return ''; }
}

/**
 * Generate and print the league table.
 */
export async function printLeagueTable(data, club) {
  const [logoBase64, headerBase64] = await Promise.all([
    toBase64(data.logoUrl),
    toBase64(data.headerImgUrl),
  ]);
  const printData = {
    ...data,
    logoUrl: logoBase64 || data.logoUrl,
    headerImgUrl: headerBase64 || data.headerImgUrl,
  };

  let html = '';
  try {
    const advancedMode = club?.league_table_advanced_mode && club?.league_table_custom_html?.trim();
    if (advancedMode) {
      html = renderCustomHtml(club.league_table_custom_html, printData);
    } else {
      const fn = TEMPLATES[club?.league_table_template] || classicTemplate;
      html = fn(printData);
    }
  } catch {
    try { html = classicTemplate(printData); } catch {
      html = '<html><body><p>Error rendering league table.</p></body></html>';
    }
  }

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}

/**
 * Build the data object for generateLeagueTableHtml from league + club + table.
 */
export function buildLeagueTableData({ league, club, tableEntries }) {
  const today = format(new Date(), 'd MMMM yyyy');
  return {
    leagueName:        league?.name || '',
    leagueFormat:      league?.format ? (league.format === 'triples' ? 'Triples' : 'Fours') : '',
    startDate:         league?.start_date || null,
    endDate:           league?.end_date || null,
    sessionTime:       league?.session_time || null,
    datePrinted:       today,
    clubName:          club?.name || '',
    logoUrl:           club?.logo_url || '',
    headerImgUrl:      club?.league_table_header_img_url || '',
    primaryColour:     club?.league_table_primary_colour || '#10b981',
    fontSize:          club?.league_table_font_size || 'medium',
    showAccurateAsOf:  club?.league_table_show_accurate_as_of !== false,
    showSessionTime:   club?.league_table_show_session_time !== false,
    showLeagueDates:   club?.league_table_show_league_dates !== false,
    showFooter:        club?.league_table_show_footer || false,
    footerText:        club?.league_table_footer_text || '',
    template:          club?.league_table_template || 'classic',
    advancedMode:      club?.league_table_advanced_mode || false,
    customHtml:        club?.league_table_custom_html || '',
    tableData:         (tableEntries || []).map((entry, idx) => ({
      position:      idx + 1,
      teamName:      entry.team?.name || '',
      played:        entry.played,
      won:           entry.won,
      drawn:         entry.drawn,
      lost:          entry.lost,
      pointsFor:     entry.pointsFor,
      pointsAgainst: entry.pointsAgainst,
      pointsDiff:    entry.pointsDiff,
      points:        entry.points,
    })),
  };
}