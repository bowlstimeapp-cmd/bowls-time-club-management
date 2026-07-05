const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi-Final';
  if (remaining === 3) return 'Quarter-Final';
  return `Round ${roundIndex + 1}`;
};

export function generateTournamentDrawPdf(tournament, clubName, getMemberName) {
  const bracket = tournament.bracket;
  if (!bracket?.rounds?.length) return;

  const rounds = bracket.rounds;
  const totalRounds = rounds.length;

  const round0 = rounds[0];
  const playerSlots = [];
  for (const match of round0) {
    playerSlots.push(match.player1 ? getMemberName(match.player1) : 'BYE');
    playerSlots.push(match.player2 ? getMemberName(match.player2) : 'BYE');
  }

  const roundNames = rounds.map((_, i) => getRoundName(i, totalRounds));

  // Final winner
  const finalMatch = rounds[totalRounds - 1]?.[0];
  const finalWinner = finalMatch?.winner ? getMemberName(finalMatch.winner) : null;

  // Build column definitions
  // Each round column: round 0 = player names, subsequent = advancing players
  // We build the bracket using CSS grid / table with SVG connector lines

  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  // Build round columns HTML
  // Strategy: flex row of columns; each column is a flex-col with evenly spaced slots
  // Connector lines drawn with CSS borders on wrapper divs

  // Number of slots in round 0 = playerSlots.length
  // Each subsequent round has half the slots
  const numPlayers = playerSlots.length; // always power of 2

  // Build each round's column
  const roundColumnsHtml = rounds.map((roundMatches, rIdx) => {
    const isFirst = rIdx === 0;
    const isLast = rIdx === totalRounds - 1;
    const roundName = roundNames[rIdx];
    const roundDate = bracket.round_dates?.[roundName]
                   ?? bracket.round_dates?.[roundName + 's']
                   ?? bracket.round_dates?.[`Round ${rIdx + 1}`];
    let dateStr = '';
    if (roundDate) {
      const d = new Date(roundDate + 'T00:00:00');
      dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Slots in this round: always 2 per match (both players), except Final = 1
    const slotsInRound = isLast ? 1 : roundMatches.length * 2;

    // Each "half slot" height doubles every round so that a pair in round R
    // spans exactly the same vertical space as the two pairs that feed into it.
    // Base: round 0 half-height = 34px (slot + surrounding space).
    // Round R half-height = 34 * 2^R  px.
    const halfH = 34 * Math.pow(2, rIdx);

    // Build slot items — two per match for all rounds (top player + bottom player)
    // Final is a special case: single trophy cell
    let slotsHtml = '';

    if (isLast) {
      // Final — single centred trophy slot (fills full column height via flex:1)
      const match = roundMatches[0];
      const w = match?.winner ? getMemberName(match.winner) : '';
      const cls = w ? 'slot final-slot' : 'slot final-slot empty';
      slotsHtml = `<div class="match-pair-slot final-pair">
        <div class="${cls}">
          ${w ? `<span class="trophy">&#127942;</span>${escHtml(w)}` : '<span class="tbd">Winner</span>'}
        </div>
      </div>`;
    } else {
      // Every other round: two slots per match with connector lines
      slotsHtml = roundMatches.map((match, mIdx) => {
        // Determine player names and states
        const getSlot = (player, isTopSlot) => {
          const score = isTopSlot ? match?.player1_score : match?.player2_score;
          const hasScore = score != null && !isNaN(score);
          if (isFirst) {
            // Round 0: pull directly from playerSlots
            const pIdx = mIdx * 2 + (isTopSlot ? 0 : 1);
            const name = playerSlots[pIdx] || 'BYE';
            const isBye = name === 'BYE';
            const isWinner = !isBye && match?.winner && match.winner === player;
            const isLoser = !isBye && match?.winner && !isWinner;
            return { name, isBye, isWinner, isLoser, score: hasScore ? score : null };
          } else {
            // Later rounds: both players are advancing winners from prior round
            const name = player ? getMemberName(player) : '';
            const isBye = !player;
            const isWinner = !!match.winner && match.winner === player;
            const isLoser = !!match.winner && !isWinner && !!player;
            return { name: name || 'TBD', isBye, isWinner, isLoser, score: hasScore ? score : null };
          }
        };

        const top = getSlot(match.player1, true);
        const bot = getSlot(match.player2, false);

        const slotClass = (s) => {
          if (s.isBye) return 'slot bye';
          if (s.isWinner) return isFirst ? 'slot winner' : 'slot result winner';
          if (s.isLoser) return isFirst ? 'slot loser' : 'slot result loser';
          return isFirst ? 'slot' : 'slot result';
        };

        if (isFirst) {
          // R1: wrap both players in a fixture-box so the match reads as one unit.
          // The outer wrapper is a full-height spacer that carries the right-side
          // connector line outward to the next round.
          return `<div style="height:${halfH * 2}px; display:flex; flex-direction:column; justify-content:center; border-right:1.5px solid var(--line); padding:0 0 0 4px; margin:0;">
            <div class="fixture-box">
              <div class="match-pair-slot connector-top" style="height:${halfH}px;">
                <div class="${slotClass(top)}">${escHtml(top.name)}${top.score != null ? `<span class="slot-score">${top.score}</span>` : ''}</div>
              </div>
              <div class="match-pair-slot connector-bottom" style="height:${halfH}px;">
                <div class="${slotClass(bot)}">${escHtml(bot.name)}${bot.score != null ? `<span class="slot-score">${bot.score}</span>` : ''}</div>
              </div>
            </div>
          </div>`;
        }

        return `<div class="match-pair-slot connector-top no-divider" style="height:${halfH}px;">
          <div class="${slotClass(top)}">${escHtml(top.name)}${top.score != null ? `<span class="slot-score">${top.score}</span>` : ''}</div>
        </div>
        <div class="match-pair-slot connector-bottom no-divider" style="height:${halfH}px;">
          <div class="${slotClass(bot)}">${escHtml(bot.name)}${bot.score != null ? `<span class="slot-score">${bot.score}</span>` : ''}</div>
        </div>`;
      }).join('\n');
    }

    const headerDateHtml = dateStr ? `<div class="round-date">Play by ${dateStr}</div>` : '';
    const isFinalCol = isLast;

    return `<div class="round-col${isFinalCol ? ' final-col' : ''}">
      <div class="round-header">
        <div class="round-title">${escHtml(roundName)}</div>
        ${headerDateHtml}
      </div>
      <div class="slots-col">
        ${slotsHtml}
      </div>
    </div>`;
  }).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escHtml(tournament.name)} – Draw</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Source+Sans+3:wght@400;600&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --green-dark:  #1b4d2e;
    --green-mid:   #2e7d4f;
    --green-light: #e8f5ed;
    --green-pale:  #f3faf6;
    --gold:        #b8963e;
    --gold-light:  #f5ecd0;
    --ink:         #1a1a1a;
    --muted:       #5a6672;
    --line:        #c8d8cc;
    --white:       #ffffff;
    --slot-h:      28px;
    --gap-h:       10px;
  }

  body {
    font-family: 'Source Sans 3', 'Helvetica Neue', Arial, sans-serif;
    background: #fff;
    color: var(--ink);
    padding: 10mm 12mm 8mm;
    min-height: 210mm;
  }

  /* ── Header ─────────────────────────────────────── */
  .page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid var(--green-dark);
    padding-bottom: 6px;
    margin-bottom: 10px;
  }
  .header-left { display: flex; flex-direction: column; gap: 2px; }
  .club-name {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 20px;
    color: var(--green-dark);
    letter-spacing: 0.5px;
    line-height: 1.1;
  }
  .comp-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--green-mid);
    letter-spacing: 0.3px;
    text-transform: uppercase;
  }
  .header-center {
    text-align: center;
  }
  .draw-label {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 13px;
    color: var(--muted);
    letter-spacing: 2px;
    text-transform: uppercase;
  }
  .header-right {
    text-align: right;
    font-size: 10px;
    color: var(--muted);
    line-height: 1.6;
  }

  /* ── Winner banner (shown if final is complete) ── */
  .winner-banner {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: var(--gold-light);
    border: 1.5px solid var(--gold);
    border-radius: 4px;
    padding: 5px 14px;
    margin-bottom: 10px;
    font-size: 12px;
    color: #6b4e0a;
  }
  .winner-banner .trophy-icon { font-size: 16px; }
  .winner-banner strong { font-size: 13px; }

  /* ── Bracket layout ──────────────────────────────── */
  .bracket {
    display: flex;
    flex-direction: row;
    align-items: stretch;
    gap: 0;
    width: 100%;
  }

  /* ── Round column ────────────────────────────────── */
  .round-col {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
  }

  .round-header {
    background: var(--green-dark);
    color: #fff;
    text-align: center;
    padding: 5px 4px 4px;
    border-right: 1px solid rgba(255,255,255,0.15);
  }
  .round-col:last-child .round-header { border-right: none; }
  .round-title {
    font-family: 'Playfair Display', Georgia, serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .round-date {
    font-size: 8px;
    color: rgba(255,255,255,0.7);
    margin-top: 1px;
  }

  /* Final column special header */
  .final-col .round-header {
    background: var(--gold);
  }

  /* ── Slots column ────────────────────────────────── */
  .slots-col {
    display: flex;
    flex-direction: column;
    flex: 1;
    position: relative;
  }

  /* ── Match pair slot wrapper ─────────────────────── */
  /* Each half-match takes an explicit pixel height set inline via style="height:Npx"
     so that every round's pairs are proportionally taller than the previous.
     The slot is pinned to the connector line; the rest is empty space. */
  .match-pair-slot {
    display: flex;
    flex-direction: column;
    position: relative;
    padding: 0 6px;
    flex-shrink: 0;
  }

  /* Top half: name centred in the half, connector bracket on bottom+right */
  .connector-top {
    justify-content: center;
    border-right: 1.5px solid var(--line);
    border-bottom: 1.5px solid var(--line);
  }
  /* Bottom half: name centred in the half, connector bracket on top+right */
  .connector-bottom {
    justify-content: center;
    border-right: 1.5px solid var(--line);
    border-top: 1.5px solid var(--line);
  }

  /* Rounds 2+: keep only the right-side bracket line; no horizontal divider between players */
  .connector-top.no-divider  { border-bottom: none; }
  .connector-bottom.no-divider { border-top: none; }

  /* Final pair: no connectors, centred vertically */
  .final-pair {
    justify-content: center;
    border: none;
    flex: 1;
  }

  /* ── Round 1 fixture box ─────────────────────────── */
  .fixture-box {
    display: flex;
    flex-direction: column;
    border: 1.5px solid #a8c8b0;
    border-right: 1.5px solid var(--line);
    border-radius: 4px 0 0 4px;
    background: var(--green-pale);
    overflow: hidden;
    margin: 4px 0 4px 4px;
  }
  .fixture-box .match-pair-slot {
    padding: 0;
    border: none !important;
  }
  .fixture-box .slot {
    border: none;
    border-radius: 0;
    margin: 0;
    padding: 0 8px;
    background: transparent;
  }
  .fixture-box .connector-top {
    border-bottom: 1px dashed #c0d8c4;
  }
  .fixture-box .slot.winner { background: var(--green-light); color: var(--green-dark); }
  .fixture-box .slot.loser  { color: #bbb; text-decoration: line-through; }
  .fixture-box .slot.bye    { color: var(--muted); font-style: italic; font-weight: 400; border: none; }

  /* ── Slot (name cell) ────────────────────────────── */
  .slot {
    height: var(--slot-h);
    line-height: var(--slot-h);
    font-size: 10px;
    font-weight: 600;
    color: var(--ink);
    background: var(--white);
    border: 1px solid var(--line);
    border-radius: 3px;
    padding: 0 7px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 2px 0;
    position: relative;
  }

  .slot.bye {
    color: var(--muted);
    background: #f7f7f7;
    font-style: italic;
    font-weight: 400;
    border-style: dashed;
  }

  .slot.winner {
    background: var(--green-light);
    border-color: var(--green-mid);
    color: var(--green-dark);
  }

  .slot.loser {
    color: #aaa;
    text-decoration: line-through;
    background: #fafafa;
  }

  /* Score shown to the right of a player name for played matches */
  .slot-score {
    float: right;
    margin-left: 8px;
    font-weight: 700;
    color: var(--green-dark);
  }
  .slot.loser .slot-score {
    color: #999;
    text-decoration: none;
  }

  .slot.result {
    background: var(--green-pale);
    border-color: #b3d4be;
    color: var(--ink);
    font-weight: 600;
  }
  .slot.result.winner {
    background: var(--green-light);
    border-color: var(--green-mid);
    color: var(--green-dark);
  }

  /* Final slot */
  .slot.final-slot {
    height: 38px;
    line-height: 38px;
    font-size: 12px;
    font-weight: 700;
    background: var(--gold-light);
    border: 2px solid var(--gold);
    color: #5a3d0a;
    border-radius: 4px;
    text-align: center;
    padding: 0 10px;
  }
  .slot.final-slot.empty {
    border-style: dashed;
    color: var(--muted);
    font-weight: 400;
    font-style: italic;
  }
  .slot.final-slot .trophy { margin-right: 6px; }
  .slot.final-slot .tbd { color: #b0a070; }

  /* ── Print button ────────────────────────────────── */
  .print-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
  }
  .print-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 7px 18px;
    background: var(--green-dark);
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 12px;
    font-family: inherit;
    font-weight: 600;
    cursor: pointer;
    letter-spacing: 0.3px;
  }
  .print-btn:hover { background: var(--green-mid); }
  .hint { font-size: 10px; color: var(--muted); }

  /* ── Footer ──────────────────────────────────────── */
  .page-footer {
    margin-top: 8px;
    border-top: 1px solid var(--line);
    padding-top: 5px;
    display: flex;
    justify-content: space-between;
    font-size: 8px;
    color: var(--muted);
  }

  /* ── Print styles ────────────────────────────────── */
  @media print {
    .print-bar { display: none; }
    body { padding: 8mm 10mm; }
    @page { size: A4 landscape; margin: 8mm; }
  }
</style>
</head>
<body>

<div class="print-bar">
  <button class="print-btn" onclick="window.print()">&#128438; Print / Save as PDF</button>
  <span class="hint">Best printed on A4 Landscape &bull; use browser Print &rarr; Save as PDF</span>
</div>

<div class="page-header">
  <div class="header-left">
    <div class="club-name">${escHtml(clubName)}</div>
    <div class="comp-name">${escHtml(tournament.name)}</div>
  </div>
  <div class="header-center">
    <div class="draw-label">Competition Draw</div>
  </div>
  <div class="header-right">
    Generated: ${today}<br>
    ${numPlayers} Players &bull; ${totalRounds} Round${totalRounds !== 1 ? 's' : ''}
  </div>
</div>

${finalWinner ? `<div class="winner-banner"><span class="trophy-icon">&#127942;</span> Champion: <strong>${escHtml(finalWinner)}</strong></div>` : ''}

<div class="bracket">
  ${roundColumnsHtml}
</div>

<div class="page-footer">
  <span>${escHtml(clubName)} &bull; ${escHtml(tournament.name)}</span>
  <span>Generated ${today}</span>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}