/**
 * Team Sheet Print Templates
 * Generates HTML strings for window.print() usage.
 */
import { format, parseISO } from 'date-fns';

const FONT_SIZES = {
  small:  { base: '11px', heading: '16px', sub: '13px', pos: '10px' },
  medium: { base: '13px', heading: '20px', sub: '15px', pos: '11px' },
  large:  { base: '15px', heading: '24px', sub: '17px', pos: '13px' },
};

function lighten(hex, amount = 0.9) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lr = Math.round(r + (255 - r) * amount);
  const lg = Math.round(g + (255 - g) * amount);
  const lb = Math.round(b + (255 - b) * amount);
  return `rgb(${lr},${lg},${lb})`;
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)}, ${parseInt(hex.slice(3,5),16)}, ${parseInt(hex.slice(5,7),16)}`;
}

function headerBlock(data) {
  const { clubName, logoUrl, competition, matchName, matchDate, startTime, venue, dressCode,
          primaryColour, fontSize, showStartTime, showVenue, showDressCode } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  return `
    <div class="sheet-header">
      ${logoUrl ? `<img src="${logoUrl}" class="logo" alt="${clubName}" />` : ''}
      <div class="club-name" style="font-size:${fs.heading}">${clubName}</div>
      <div class="comp-badge">${competition}</div>
      <div class="match-title" style="font-size:${fs.sub}">${matchName || 'Team Selection'}</div>
      <div class="match-date">${matchDate}</div>
      ${showStartTime && startTime ? `<div class="meta-row">⏰ Start Time: <strong>${startTime}</strong></div>` : ''}
      ${showVenue && venue       ? `<div class="meta-row">📍 Venue: <strong>${venue}</strong></div>` : ''}
      ${showDressCode && dressCode ? `<div class="meta-row">👔 Dress Code: <strong>${dressCode}</strong></div>` : ''}
    </div>`;
}

// ── Classic ────────────────────────────────────────────────────────────────
function classicTemplate(data) {
  const { primaryColour, fontSize, rinks, isTopClub, topClubEvents } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const light = lighten(primaryColour);
  const cards = (isTopClub ? topClubEvents.map(ev => ({
    title: `🏆 ${ev.name}`, tag: null, positions: ev.positions
  })) : rinks.map(r => ({
    title: `👥 Rink ${r.number}`, tag: r.tag, positions: r.positions
  }))).map(c => `
    <div class="card">
      <div class="card-head" style="background:${light};border-bottom:2px solid ${primaryColour}">
        <span style="font-size:${fs.sub};font-weight:700">${c.title}</span>
        ${c.tag ? `<span class="rink-tag ${c.tag === 'Home' ? 'tag-home' : 'tag-away'}">${c.tag}</span>` : ''}
      </div>
      <div class="card-body">
        ${c.positions.map(p => `
          <div class="pos-row">
            <span class="pos-label" style="font-size:${fs.pos}">${p.label}</span>
            <span class="pos-name" style="font-size:${fs.base}">${p.name}</span>
          </div>`).join('')}
      </div>
    </div>`).join('');

  return `<html><head><title>Team Sheet</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Georgia,serif;padding:24px;color:#111;font-size:${fs.base}}
    .sheet-header{text-align:center;margin-bottom:24px}
    .logo{max-height:72px;margin-bottom:10px}
    .club-name{font-weight:bold;margin-bottom:4px}
    .comp-badge{display:inline-block;font-size:12px;font-weight:600;border-radius:4px;padding:2px 12px;margin:6px 0;border:1px solid ${primaryColour};color:${primaryColour}}
    .match-title{font-weight:600;margin-bottom:2px}
    .match-date{color:#555;margin-bottom:4px;font-size:12px}
    .meta-row{font-size:12px;color:#444;margin-top:3px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
    .card{border:1px solid #ddd;border-radius:8px;overflow:hidden;break-inside:avoid}
    .card-head{padding:10px 14px;display:flex;align-items:center;justify-content:space-between}
    .card-body{padding:10px 14px}
    .pos-row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f3f4f6}
    .pos-row:last-child{border-bottom:none}
    .pos-label{color:#777;font-weight:500;min-width:48px}
    .pos-name{font-weight:600}
    .rink-tag{font-size:11px;font-weight:600;padding:2px 8px;border-radius:4px}
    .tag-home{background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe}
    .tag-away{background:#fff7ed;color:#c2410c;border:1px solid #fed7aa}
    @media print{body{padding:12px}}
  </style></head><body>${headerBlock(data)}<div class="grid">${cards}</div></body></html>`;
}

// ── Compact ────────────────────────────────────────────────────────────────
function compactTemplate(data) {
  const { primaryColour, fontSize, rinks, isTopClub, topClubEvents } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const light = lighten(primaryColour, 0.92);

  const rows = (isTopClub ? topClubEvents.map(ev => ({ title: `🏆 ${ev.name}`, tag: null, positions: ev.positions }))
    : rinks.map(r => ({ title: `Rink ${r.number}`, tag: r.tag, positions: r.positions }))).map(c => `
    <tr>
      <td colspan="2" style="background:${light};font-weight:700;padding:6px 10px;font-size:${fs.sub};color:${primaryColour}">
        ${c.title}
        ${c.tag ? `<span style="margin-left:8px;font-size:10px;padding:1px 6px;border-radius:3px;${c.tag==='Home'?'background:#eff6ff;color:#1d4ed8':'background:#fff7ed;color:#c2410c'}">${c.tag}</span>` : ''}
      </td>
    </tr>
    ${c.positions.map(p => `
      <tr>
        <td style="padding:3px 10px;color:#888;font-size:${fs.pos};width:80px">${p.label}</td>
        <td style="padding:3px 10px;font-weight:600;font-size:${fs.base}">${p.name}</td>
      </tr>`).join('')}`).join('');

  return `<html><head><title>Team Sheet</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial,sans-serif;padding:20px;color:#111;font-size:${fs.base}}
    .sheet-header{text-align:center;margin-bottom:20px}
    .logo{max-height:60px;margin-bottom:8px}
    .club-name{font-weight:bold;font-size:${fs.heading}}
    .comp-badge{display:inline-block;font-size:11px;font-weight:600;border-radius:3px;padding:1px 10px;margin:4px 0;border:1px solid ${primaryColour};color:${primaryColour}}
    .match-title{font-weight:600;font-size:${fs.sub}}
    .match-date{color:#555;font-size:11px}
    .meta-row{font-size:11px;color:#444;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    tr{border-bottom:1px solid #f0f0f0}
    @media print{body{padding:8px}}
  </style></head><body>${headerBlock(data)}<table><tbody>${rows}</tbody></table></body></html>`;
}

// ── Modern ─────────────────────────────────────────────────────────────────
function modernTemplate(data) {
  const { primaryColour, fontSize, rinks, isTopClub, topClubEvents } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const rgb = hexToRgb(primaryColour);

  const cards = (isTopClub ? topClubEvents.map(ev => ({ title: `🏆 ${ev.name}`, tag: null, positions: ev.positions }))
    : rinks.map(r => ({ title: `Rink ${r.number}`, tag: r.tag, positions: r.positions }))).map(c => `
    <div class="card">
      <div class="card-accent" style="background:${primaryColour}"></div>
      <div class="card-inner">
        <div class="card-title" style="color:${primaryColour};font-size:${fs.sub}">
          ${c.title}
          ${c.tag ? `<span class="rink-tag ${c.tag==='Home'?'tag-home':'tag-away'}">${c.tag}</span>` : ''}
        </div>
        ${c.positions.map(p => `
          <div class="pos-row">
            <div class="pos-chip" style="background:rgba(${rgb},0.1);color:${primaryColour}">${p.label}</div>
            <div class="pos-name" style="font-size:${fs.base}">${p.name}</div>
          </div>`).join('')}
      </div>
    </div>`).join('');

  return `<html><head><title>Team Sheet</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:24px;color:#1a1a2e;background:#f8f9fa;font-size:${fs.base}}
    .sheet-header{text-align:center;margin-bottom:24px;background:white;padding:20px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06)}
    .logo{max-height:72px;margin-bottom:10px}
    .club-name{font-weight:800;font-size:${fs.heading};letter-spacing:-0.5px}
    .comp-badge{display:inline-block;font-size:12px;font-weight:700;border-radius:20px;padding:3px 14px;margin:6px 0;background:${primaryColour};color:white}
    .match-title{font-weight:600;font-size:${fs.sub};color:#333}
    .match-date{color:#777;font-size:12px;margin-top:2px}
    .meta-row{font-size:12px;color:#555;margin-top:3px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
    .card{background:white;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.07);display:flex;overflow:hidden;break-inside:avoid}
    .card-accent{width:5px;flex-shrink:0}
    .card-inner{flex:1;padding:12px 14px}
    .card-title{font-weight:700;margin-bottom:10px;display:flex;align-items:center;gap:8px}
    .pos-row{display:flex;align-items:center;gap:10px;padding:4px 0;border-bottom:1px solid #f3f4f6}
    .pos-row:last-child{border-bottom:none}
    .pos-chip{font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;min-width:36px;text-align:center}
    .pos-name{font-weight:600}
    .rink-tag{font-size:10px;font-weight:600;padding:2px 8px;border-radius:10px}
    .tag-home{background:#eff6ff;color:#1d4ed8}
    .tag-away{background:#fff7ed;color:#c2410c}
    @media print{body{background:white;padding:12px}.card,.sheet-header{box-shadow:none;border:1px solid #e5e7eb}}
  </style></head><body>${headerBlock(data)}<div class="grid">${cards}</div></body></html>`;
}

// ── Bowls (stacked) ────────────────────────────────────────────────────────
function bowlsTemplate(data) {
  const { primaryColour, fontSize, rinks, isTopClub, topClubEvents } = data;
  const fs = FONT_SIZES[fontSize] || FONT_SIZES.medium;
  const light = lighten(primaryColour, 0.88);

  const blocks = (isTopClub ? topClubEvents.map(ev => ({ title: ev.name, tag: null, positions: ev.positions }))
    : rinks.map(r => ({ title: `RINK ${r.number}`, tag: r.tag, positions: r.positions }))).map(b => `
    <div class="rink-block">
      <div class="rink-header" style="background:${primaryColour}">
        ${b.title}
        ${b.tag ? `<span class="rink-tag-inline">${b.tag}</span>` : ''}
      </div>
      <div class="rink-body" style="background:${light}">
        <table class="player-table">
          ${b.positions.map(p => `
            <tr>
              <td class="player-pos" style="font-size:${fs.pos}">${p.label}</td>
              <td class="player-name" style="font-size:${fs.base}">${p.name}</td>
            </tr>`).join('')}
        </table>
      </div>
    </div>`).join('');

  return `<html><head><title>Team Sheet</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Courier New',monospace;padding:20px;color:#111;font-size:${fs.base}}
    .sheet-header{text-align:center;border:3px solid ${primaryColour};padding:16px;margin-bottom:20px;border-radius:4px}
    .logo{max-height:60px;margin-bottom:8px}
    .club-name{font-weight:bold;font-size:${fs.heading};text-transform:uppercase;letter-spacing:2px}
    .comp-badge{font-size:13px;font-weight:bold;margin:6px 0;letter-spacing:1px;color:${primaryColour}}
    .match-title{font-weight:bold;font-size:${fs.sub}}
    .match-date{font-size:12px;color:#444;margin-top:3px}
    .meta-row{font-size:12px;color:#333;margin-top:3px;font-weight:bold}
    .rink-block{border:2px solid ${primaryColour};border-radius:4px;margin-bottom:12px;break-inside:avoid}
    .rink-header{color:white;font-weight:bold;font-size:${fs.sub};padding:8px 14px;letter-spacing:1px;display:flex;align-items:center;gap:10px;text-transform:uppercase}
    .rink-tag-inline{font-size:10px;background:rgba(255,255,255,.25);padding:1px 8px;border-radius:3px}
    .player-table{width:100%;border-collapse:collapse}
    .player-table tr{border-bottom:1px solid rgba(0,0,0,.06)}
    .player-table tr:last-child{border-bottom:none}
    .player-pos{padding:6px 14px;font-weight:bold;width:70px;color:#555;text-transform:uppercase}
    .player-name{padding:6px 4px;font-weight:bold}
    @media print{body{padding:8px}}
  </style></head><body>${headerBlock(data)}${blocks}</body></html>`;
}

// ── Custom HTML renderer ───────────────────────────────────────────────────
function renderCustomHtml(template, data) {
  const flatData = {
    club_name: data.clubName,
    competition: data.competition,
    match_name: data.matchName,
    match_date: data.matchDate,
    start_time: data.startTime || '',
    venue: data.venue || '',
    dress_code: data.dressCode || '',
    logo_url: data.logoUrl || '',
    club_header_img: data.headerImgUrl || '',
  };
  data.rinks.forEach(rink => {
    flatData[`rink${rink.number}_tag`] = rink.tag;
    rink.positions.forEach(p => { flatData[`rink${rink.number}_${p.label}`] = p.name; });
  });
  data.topClubEvents.forEach(ev => {
    ev.positions.forEach(p => {
      flatData[`${ev.name.toLowerCase().replace(/\s+/g,'_')}_${p.label}`] = p.name;
    });
  });
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => flatData[k] ?? '');
}

// ── Public API ─────────────────────────────────────────────────────────────
const TEMPLATES = { classic: classicTemplate, compact: compactTemplate, modern: modernTemplate, bowls: bowlsTemplate };

export const TEMPLATE_OPTIONS = [
  { value: 'classic', label: 'Classic',      description: 'Traditional two-column layout with serif font' },
  { value: 'compact', label: 'Compact',      description: 'Space-efficient table format, ideal for many rinks' },
  { value: 'modern',  label: 'Modern',       description: 'Clean cards with colour accents and modern typography' },
  { value: 'bowls',   label: 'Bowls Style',  description: 'Stacked rink blocks in traditional bowls sheet style' },
];

/**
 * Build the data object consumed by all templates from SelectionView data.
 */
export function buildTeamSheetData({ club, selection, members, allCompetitions }) {
  const activeComp = allCompetitions.find(c => c.name === selection?.competition);
  const isTopClub = selection.competition === 'Top Club';
  const homeRinksCount = activeComp ? activeComp.home_rinks : (selection?.home_rinks || 2);
  const awayRinksCount = isTopClub ? 0 : (activeComp ? (activeComp.away_rinks || 0) : 0);
  const playersPerRink = activeComp?.players_per_rink || 4;
  const positionLabels = ['Lead', '2', '3', 'Skip', '5', '6'].slice(0, playersPerRink);
  const sel = selection.selections || {};

  const getMemberName = (email) => {
    if (!email) return 'TBD';
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const rinks = [
    ...Array.from({ length: homeRinksCount }, (_, i) => ({
      number: i + 1,
      tag: 'Home',
      positions: positionLabels.map(pos => ({ label: pos, name: getMemberName(sel[`rink${i+1}_${pos}`]) })),
    })),
    ...Array.from({ length: awayRinksCount }, (_, i) => ({
      number: homeRinksCount + i + 1,
      tag: 'Away',
      positions: positionLabels.map(pos => ({ label: pos, name: getMemberName(sel[`rink${homeRinksCount+i+1}_${pos}`]) })),
    })),
  ];

  const TOP_CLUB_EVENTS = [
    { id: 'mens_two_wood',   name: "Men's Two Wood", positions: ['Player'] },
    { id: 'ladies_two_wood', name: 'Ladies Two Wood', positions: ['Player'] },
    { id: 'pairs',   name: 'Pairs',  positions: ['Lead', 'Skip'] },
    { id: 'triple',  name: 'Triple', positions: ['Lead', '2', 'Skip'] },
    { id: 'fours',   name: 'Fours',  positions: ['Lead', '2', '3', 'Skip'] },
  ];
  const topClubEvents = TOP_CLUB_EVENTS.map(ev => ({
    name: ev.name,
    positions: ev.positions.map(pos => ({ label: pos, name: getMemberName(sel[`${ev.id}_${pos}`]) })),
  }));

  let matchDate = selection.match_date;
  try { matchDate = format(parseISO(selection.match_date), 'EEEE, d MMMM yyyy'); } catch {}

  return {
    clubName: club?.name || '',
    logoUrl: club?.logo_url || '',
    headerImgUrl: club?.team_sheet_header_img_url || '',
    competition: selection.competition || '',
    matchName: selection.match_name || '',
    matchDate,
    startTime: selection.match_start_time || '',
    venue: '',
    dressCode: '',
    primaryColour: club?.team_sheet_primary_colour || '#10b981',
    fontSize: club?.team_sheet_font_size || 'medium',
    showStartTime: club?.team_sheet_show_start_time !== false,
    showVenue: club?.team_sheet_show_venue || false,
    showDressCode: club?.team_sheet_show_dress_code || false,
    isTopClub,
    rinks,
    topClubEvents,
  };
}

async function toBase64(url) {
  if (!url) return '';
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

/**
 * Render and open-print a team sheet. Falls back to classic on error.
 */
export async function printTeamSheet(data, club) {
  // Convert image URLs to base64 so they render in print
  const [logoBase64, headerBase64] = await Promise.all([
    toBase64(data.logoUrl),
    toBase64(data.headerImgUrl),
  ]);
  const printData = { ...data, logoUrl: logoBase64 || data.logoUrl, headerImgUrl: headerBase64 || data.headerImgUrl };

  let html = '';
  try {
    const advancedMode = club?.team_sheet_advanced_mode && club?.team_sheet_custom_html;
    if (advancedMode) {
      html = renderCustomHtml(club.team_sheet_custom_html, printData);
    } else {
      const fn = TEMPLATES[club?.team_sheet_template] || classicTemplate;
      html = fn(printData);
    }
  } catch {
    try { html = classicTemplate(printData); } catch {
      html = '<html><body><p>Error rendering team sheet.</p></body></html>';
    }
  }
  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.onload = () => win.print();
}