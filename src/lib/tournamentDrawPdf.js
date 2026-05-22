import { jsPDF } from 'jspdf';

const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi Final';
  if (remaining === 3) return 'Quarter Final';
  return `Round ${roundIndex + 1}`;
};

/**
 * Generate a knockout draw PDF with a proper table-cell layout.
 * Each round column has exactly the right number of cells (half of previous).
 * Cells are bordered boxes; connector lines link each pair to the next round cell.
 */
export function generateTournamentDrawPdf(tournament, clubName, getMemberName) {
  const bracket = tournament.bracket;
  if (!bracket?.rounds?.length) return;

  const rounds = bracket.rounds;
  const totalRounds = rounds.length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 12;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(clubName.toUpperCase(), PAGE_W / 2, MARGIN + 5, { align: 'center' });

  doc.setFontSize(10);
  doc.text(tournament.name, PAGE_W / 2, MARGIN + 11, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text(`Competition Draw  •  ${new Date().toLocaleDateString('en-GB')}`, PAGE_W / 2, MARGIN + 16, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  const HEADER_BOTTOM = MARGIN + 20;

  // ── Layout maths ────────────────────────────────────────────────────────────
  // First round: players are individual entries (each match has 2 slots visible)
  // We show each *player slot* as a cell, so round 0 = N players, round 1 = N/2 cells, etc.
  const firstRoundMatches = rounds[0].length;
  const totalPlayerSlots = firstRoundMatches * 2; // e.g. 8 for 4 matches

  // Round header area height
  const ROUND_HEADER_H = 12;

  // Available bracket area height
  const BRACKET_H = PAGE_H - HEADER_BOTTOM - MARGIN - 4;
  const BRACKET_TOP = HEADER_BOTTOM;

  // Players area (below round headers)
  const PLAYERS_TOP = BRACKET_TOP + ROUND_HEADER_H;
  const PLAYERS_H = BRACKET_H - ROUND_HEADER_H;

  // Cell height: all cells are the same height = PLAYERS_H / totalPlayerSlots
  const CELL_H = PLAYERS_H / totalPlayerSlots;

  // Column widths
  const colW = CONTENT_W / totalRounds;

  // ── Draw round headers ──────────────────────────────────────────────────────
  for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
    const roundName = getRoundName(rIdx, totalRounds);
    const x = MARGIN + rIdx * colW;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.rect(x, BRACKET_TOP, colW, ROUND_HEADER_H);

    // Fill header with light grey
    doc.setFillColor(240, 240, 240);
    doc.rect(x, BRACKET_TOP, colW, ROUND_HEADER_H, 'F');
    doc.setDrawColor(80, 80, 80);
    doc.rect(x, BRACKET_TOP, colW, ROUND_HEADER_H);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(roundName, x + colW / 2, BRACKET_TOP + 5, { align: 'center' });

    // Round date if set
    const roundDate = bracket.round_dates?.[roundName];
    if (roundDate) {
      const d = new Date(roundDate + 'T00:00:00');
      const label = `Play by: ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(label, x + colW / 2, BRACKET_TOP + 9.5, { align: 'center' });
    }
  }

  // ── Draw cells for each round ───────────────────────────────────────────────
  for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
    const round = rounds[rIdx];
    const matchCount = round.length; // e.g. 4 in round 0, 2 in round 1, 1 in final
    const x = MARGIN + rIdx * colW;

    // Each match occupies a "block" of rows proportional to the spacing
    // Round 0: each match = 2 player cells
    // Round 1: each match = 4 player cells (sits in middle of its 4-cell block)
    // etc.
    const blockSize = totalPlayerSlots / matchCount; // number of player-slot heights per match
    const blockH = blockSize * CELL_H;

    for (let mIdx = 0; mIdx < matchCount; mIdx++) {
      const match = round[mIdx];
      const blockTop = PLAYERS_TOP + mIdx * blockH;

      if (rIdx === 0) {
        // First round: draw 2 individual player cells stacked
        const p1Name = match.player1 ? getMemberName(match.player1) : 'BYE';
        const p2Name = match.player2 ? getMemberName(match.player2) : 'BYE';

        const cell1Top = blockTop;
        const cell2Top = blockTop + CELL_H;
        const p1Won = match.winner && match.winner === match.player1;
        const p2Won = match.winner && match.winner === match.player2;

        // Cell 1
        drawCell(doc, x, cell1Top, colW, CELL_H, p1Name, p1Won);
        // Cell 2
        drawCell(doc, x, cell2Top, colW, CELL_H, p2Name, p2Won);

        // Score between the two cells
        if (match.player1_score != null && match.player2_score != null) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6);
          doc.setTextColor(80, 80, 80);
          const scoreY = cell1Top + CELL_H + (CELL_H * 0.05);
          // Small score badge at right edge
          doc.text(`${match.player1_score}-${match.player2_score}`, x + colW - 1.5, scoreY, { align: 'right' });
        }

        // Connector line from right edge of the match block to next round
        if (totalRounds > 1) {
          const connX = x + colW;
          const topY = cell1Top + CELL_H / 2;
          const botY = cell2Top + CELL_H / 2;
          const midY = (topY + botY) / 2;

          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.3);
          // Vertical bracket
          doc.line(connX - 0.5, topY, connX - 0.5, botY);
          // Horizontal to next column
          doc.line(connX - 0.5, midY, connX + 0.5, midY);
        }

      } else {
        // Later rounds: one "result cell" centred in its block
        // The winner cell sits at the vertical centre of the block
        const cellTop = blockTop + (blockH - CELL_H) / 2;

        const winnerEntry = match.winner || match.player1 || null;
        const winnerName = winnerEntry ? getMemberName(winnerEntry) : '';

        drawCell(doc, x, cellTop, colW, CELL_H, winnerName, false, true);

        // Score
        if (match.player1_score != null && match.player2_score != null) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 100, 100);
          doc.text(`${match.player1_score}-${match.player2_score}`, x + colW - 1.5, cellTop + CELL_H / 2 + 2, { align: 'right' });
        }

        // Connector to next round
        if (rIdx < totalRounds - 1) {
          const connX = x + colW;
          const midY = cellTop + CELL_H / 2;

          const nextBlockSize = totalPlayerSlots / (matchCount / 2);
          const nextBlockH = nextBlockSize * CELL_H;
          const nextMatchIdx = Math.floor(mIdx / 2);
          const nextBlockTop = PLAYERS_TOP + nextMatchIdx * nextBlockH;
          const nextCellTop = nextBlockTop + (nextBlockH - CELL_H) / 2;
          const nextMidY = nextCellTop + CELL_H / 2;

          doc.setDrawColor(160, 160, 160);
          doc.setLineWidth(0.3);
          // From current cell mid-right
          doc.line(connX - 0.5, midY, connX - 0.5, nextMidY);
          doc.line(connX - 0.5, nextMidY, connX + 0.5, nextMidY);
        }
      }
    }
  }

  // ── Outer border ──────────────────────────────────────────────────────────
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN, BRACKET_TOP, CONTENT_W, BRACKET_H);

  // ── Footer ────────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by BowlsTime`, PAGE_W / 2, PAGE_H - 3, { align: 'center' });

  const safeName = tournament.name.replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeName}_draw.pdf`);
}

/**
 * Draw a single bordered cell with a player name inside.
 * @param {boolean} isWinner  - bold green text
 * @param {boolean} isResult  - slightly different shade for result cells
 */
function drawCell(doc, x, y, w, h, name, isWinner, isResult = false) {
  // Background
  if (isWinner) {
    doc.setFillColor(230, 255, 235);
  } else if (isResult) {
    doc.setFillColor(248, 248, 255);
  } else {
    doc.setFillColor(255, 255, 255);
  }
  doc.rect(x, y, w, h, 'F');

  // Border
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h);

  // Text
  if (!name) return;
  doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(isWinner ? 0 : 30, isWinner ? 120 : 30, 0);
  // Truncate if needed
  const maxW = w - 4;
  doc.text(name, x + 2, y + h / 2 + 2, { maxWidth: maxW });
  doc.setTextColor(0, 0, 0);
}