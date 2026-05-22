const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi Final';
  if (remaining === 3) return 'Quarter Final';
  return `Round ${roundIndex + 1}`;
};

/**
 * Generate and open a printable HTML knockout draw in a new tab.
 * Uses browser print-to-PDF (no jsPDF dependency).
 */
export function generateTournamentDrawPdf(tournament, clubName, getMemberName) {
  const bracket = tournament.bracket;
  if (!bracket?.rounds?.length) return;

  const rounds = bracket.rounds;
  const totalRounds = rounds.length;

  // Build flat player list for round 1 (padded to next power of 2)
  const round0 = rounds[0];
  const playerSlots = [];
  for (const match of round0) {
    playerSlots.push(match.player1 ? getMemberName(match.player1) : '');
    playerSlots.push(match.player2 ? getMemberName(match.player2) : '');
  }

  // Round names
  const roundNames = rounds.map((_, i) => getRoundName(i, totalRounds));

  // Total HTML rows = playerSlots.length * 2 (name row + spacer row each)
  const totalRows = playerSlots.length * 2;

  // Build column headers row
  const headerCells = roundNames.map(name => {
    const isFinal = name === 'Final';
    const roundDate = bracket.round_dates?.[name];
    let dateHtml = '';
    if (roundDate && !isFinal) {
      const d = new Date(roundDate + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      dateHtml = `<div class="round-date">Play by: ${label}</div>`;
    }
    const challengeHtml = !isFinal ? `<div class="round-challenge">Challenge by: ___________</div>` : '';
    return `<th>${name}${challengeHtml}${dateHtml}</th>`;
  }).join('');

  // Build all table rows
  // For round 0: each player gets one name-row and one spacer-row
  // For round R: each match gets a cell with rowspan = 2^(R+1), vertically centred
  //   - the first row of the pair of feeders is where we place the cell
  //   - subsequent rows are skipped

  // Track which rows are already consumed per column
  const consumed = Array.from({ length: totalRounds }, () => new Set());

  // Pre-compute for each round/match which HTML row index its cell starts on
  // Round 0, match m: starts at row m*4 (each match = 2 name rows + 2 spacer rows = 4 HTML rows)
  // Round 1, match m: starts at row m*8
  // Round R, match m: starts at row m * 2^(R+1) * 2... actually simpler:
  // Row index for round R, match m: m * (totalRows / matchesInRound)
  // The cell rowspan = totalRows / matchesInRound
  const cellInfo = []; // cellInfo[rIdx][mIdx] = { startRow, rowspan, name, winner }

  for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
    const matchCount = rounds[rIdx].length;
    const rowspan = totalRows / matchCount;
    cellInfo.push(rounds[rIdx].map((match, mIdx) => {
      const startRow = mIdx * rowspan;
      let name = '';
      if (rIdx === 0) {
        // Not used directly — we render player cells row by row
        name = '';
      } else {
        const w = match.winner || match.player1 || null;
        name = w ? getMemberName(w) : '';
      }
      return { startRow, rowspan, name, winner: !!match.winner };
    }));
  }

  // Build rows HTML
  const rowsHtml = [];

  for (let row = 0; row < totalRows; row++) {
    const isNameRow = row % 2 === 0;
    const playerIdx = Math.floor(row / 2);

    let rowHtml = '<tr>';

    // Column 0: round 0 player cells
    if (isNameRow) {
      const playerName = playerSlots[playerIdx] || '';
      const matchIdx = Math.floor(playerIdx / 2);
      const match = rounds[0][matchIdx];
      const isWinner = match?.winner && (
        (playerIdx % 2 === 0 && match.winner === match.player1) ||
        (playerIdx % 2 === 1 && match.winner === match.player2)
      );
      rowHtml += `<td class="name-cell${isWinner ? ' winner' : ''}">${escHtml(playerName)}</td>`;
    } else {
      rowHtml += `<td class="spacer-cell"></td>`;
    }

    // Columns 1..N: later rounds
    for (let rIdx = 1; rIdx < totalRounds; rIdx++) {
      if (consumed[rIdx].has(row)) {
        // This row is covered by a rowspan from above — skip
        rowHtml += '';
        continue;
      }

      // Find if a match starts on this row
      const matchForRow = cellInfo[rIdx].find(c => c.startRow === row);
      if (matchForRow) {
        const isFinal = rIdx === totalRounds - 1;
        const cls = isFinal ? 'name-cell final-cell' : (matchForRow.winner ? 'name-cell winner' : 'name-cell result-cell');
        rowHtml += `<td class="${cls}" rowspan="${matchForRow.rowspan}" style="vertical-align:middle;text-align:${isFinal ? 'center' : 'left'};">${escHtml(matchForRow.name)}</td>`;
        // Mark all rows consumed
        for (let r = row; r < row + matchForRow.rowspan; r++) {
          consumed[rIdx].add(r);
        }
      } else {
        // No match starts here and not consumed — shouldn't happen, but add empty
        rowHtml += `<td class="name-cell"></td>`;
      }
    }

    rowHtml += '</tr>';
    rowsHtml.push(rowHtml);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${escHtml(tournament.name)} - Draw</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; background: #fff; padding: 10mm; }
  .header { text-align: center; margin-bottom: 8mm; }
  .club-name { font-size: 20px; font-weight: bold; color: #1a5c1a; letter-spacing: 1px; text-transform: uppercase; }
  .comp-name { font-size: 14px; font-weight: bold; color: #2E7D32; margin-top: 3px; }
  .gen-date { font-size: 9px; color: #888; margin-top: 2px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; }
  th {
    background: #e8f5e9;
    color: #1a5c1a;
    font-size: 10px;
    font-weight: bold;
    text-align: center;
    padding: 5px 4px 4px;
    border: 1px solid #bbbbbb;
    vertical-align: top;
  }
  .round-challenge { font-size: 8px; font-weight: normal; color: #555; margin-top: 3px; }
  .round-date { font-size: 8px; font-weight: normal; color: #555; margin-top: 2px; }
  td.name-cell {
    background: #ffffff;
    font-size: 10px;
    font-weight: bold;
    color: #222;
    border-bottom: 1px solid #cccccc;
    border-left: 1px solid #cccccc;
    border-right: 1px solid #cccccc;
    padding: 3px 6px;
    height: 20px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  td.spacer-cell {
    background: #ffffff;
    border-left: 1px solid #cccccc;
    border-right: 1px solid #cccccc;
    height: 14px;
  }
  td.result-cell {
    background: #f8f8ff;
    color: #333;
    font-weight: normal;
  }
  td.winner {
    background: #e8f5e9;
    color: #1a5c1a;
  }
  td.final-cell {
    background: #fff9e6;
    font-size: 13px;
    font-weight: bold;
    color: #7b5100;
    border: 2px solid #f0c040;
    text-align: center;
  }
  .print-btn {
    display: block;
    margin: 8mm auto 4mm;
    padding: 8px 24px;
    background: #2E7D32;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 13px;
    cursor: pointer;
  }
  @media print {
    .print-btn { display: none; }
    body { padding: 0; }
    @page { size: A4 landscape; margin: 10mm; }
  }
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
<div class="header">
  <div class="club-name">${escHtml(clubName)}</div>
  <div class="comp-name">${escHtml(tournament.name)}</div>
  <div class="gen-date">Competition Draw &bull; ${new Date().toLocaleDateString('en-GB')}</div>
</div>
<table>
  <thead><tr>${headerCells}</tr></thead>
  <tbody>
    ${rowsHtml.join('\n    ')}
  </tbody>
</table>
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