import { jsPDF } from 'jspdf';

const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi Final';
  if (remaining === 3) return 'Quarter Final';
  return `Round ${roundIndex + 1}`;
};

/**
 * Generate a knockout draw PDF.
 * Every cell is the same height. Later-round cells sit at the midpoint
 * between the two feeder cells, so spacing is perfectly equal throughout.
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

  // ── Header ──────────────────────────────────────────────────────────────
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
  const ROUND_HEADER_H = 12;
  const BRACKET_TOP = HEADER_BOTTOM;
  const BRACKET_H = PAGE_H - HEADER_BOTTOM - MARGIN - 4;
  const PLAYERS_TOP = BRACKET_TOP + ROUND_HEADER_H;
  const PLAYERS_H = BRACKET_H - ROUND_HEADER_H;

  // Total player slots = players in first round (2 per match)
  const totalPlayerSlots = rounds[0].length * 2;

  // CELL_H is uniform for every cell in every round
  const CELL_H = PLAYERS_H / totalPlayerSlots;

  const colW = CONTENT_W / totalRounds;

  // ── Pre-compute cell Y centres for round 0 ──────────────────────────────
  // Each round-0 match has 2 cells. Cell centres are evenly spaced.
  // cellCentres[rIdx][mIdx] = Y centre of the result cell for that match.
  // Round 0 is special: each match has TWO input cells (player1, player2),
  // the result centre is the midpoint.
  const cellCentres = [];

  // Round 0: player slot centres
  // Slot i (0-indexed) has centre at PLAYERS_TOP + (i + 0.5) * CELL_H
  const round0Centres = [];
  for (let mIdx = 0; mIdx < rounds[0].length; mIdx++) {
    const topSlot = mIdx * 2;       // player 1 slot index
    const botSlot = mIdx * 2 + 1;   // player 2 slot index
    const topY = PLAYERS_TOP + (topSlot + 0.5) * CELL_H;
    const botY = PLAYERS_TOP + (botSlot + 0.5) * CELL_H;
    round0Centres.push((topY + botY) / 2); // midpoint = result cell centre
  }
  cellCentres.push(round0Centres);

  // Later rounds: each match result sits at midpoint of its two feeder cells
  for (let rIdx = 1; rIdx < totalRounds; rIdx++) {
    const prevCentres = cellCentres[rIdx - 1];
    const centres = [];
    for (let mIdx = 0; mIdx < rounds[rIdx].length; mIdx++) {
      const topFeeder = prevCentres[mIdx * 2];
      const botFeeder = prevCentres[mIdx * 2 + 1];
      centres.push((topFeeder + botFeeder) / 2);
    }
    cellCentres.push(centres);
  }

  // ── Draw round headers ──────────────────────────────────────────────────
  for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
    const roundName = getRoundName(rIdx, totalRounds);
    const x = MARGIN + rIdx * colW;

    doc.setFillColor(240, 240, 240);
    doc.rect(x, BRACKET_TOP, colW, ROUND_HEADER_H, 'F');
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.4);
    doc.rect(x, BRACKET_TOP, colW, ROUND_HEADER_H);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(roundName, x + colW / 2, BRACKET_TOP + 5, { align: 'center' });

    const roundDate = bracket.round_dates?.[roundName];
    if (roundDate) {
      const d = new Date(roundDate + 'T00:00:00');
      const label = `Play by: ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.text(label, x + colW / 2, BRACKET_TOP + 9.5, { align: 'center' });
    }
  }

  // ── Draw round 0 player cells ───────────────────────────────────────────
  {
    const rIdx = 0;
    const x = MARGIN + rIdx * colW;

    for (let mIdx = 0; mIdx < rounds[0].length; mIdx++) {
      const match = rounds[0][mIdx];
      const topSlot = mIdx * 2;
      const botSlot = mIdx * 2 + 1;

      const cell1Y = PLAYERS_TOP + topSlot * CELL_H;
      const cell2Y = PLAYERS_TOP + botSlot * CELL_H;

      const p1Name = match.player1 ? getMemberName(match.player1) : 'BYE';
      const p2Name = match.player2 ? getMemberName(match.player2) : 'BYE';
      const p1Won = match.winner && match.winner === match.player1;
      const p2Won = match.winner && match.winner === match.player2;

      drawCell(doc, x, cell1Y, colW, CELL_H, p1Name, p1Won);
      drawCell(doc, x, cell2Y, colW, CELL_H, p2Name, p2Won);

      // Score label
      if (match.player1_score != null && match.player2_score != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(80, 80, 80);
        doc.text(
          `${match.player1_score}-${match.player2_score}`,
          x + colW - 1.5,
          cell1Y + CELL_H + CELL_H * 0.05,
          { align: 'right' }
        );
      }

      // Connector: bracket from cell 1 mid and cell 2 mid to next-round cell centre
      if (totalRounds > 1) {
        const connX = x + colW;
        const topY = cell1Y + CELL_H / 2;
        const botY = cell2Y + CELL_H / 2;
        const midY = (topY + botY) / 2;

        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.line(connX - 0.5, topY, connX - 0.5, botY);  // vertical bracket
        doc.line(connX - 0.5, midY, connX + 1, midY);    // horizontal to next col
      }
    }
  }

  // ── Draw later round cells ──────────────────────────────────────────────
  for (let rIdx = 1; rIdx < totalRounds; rIdx++) {
    const round = rounds[rIdx];
    const x = MARGIN + rIdx * colW;
    const centres = cellCentres[rIdx];

    for (let mIdx = 0; mIdx < round.length; mIdx++) {
      const match = round[mIdx];
      const centreY = centres[mIdx];
      const cellY = centreY - CELL_H / 2;

      const winnerEntry = match.winner || match.player1 || null;
      const winnerName = winnerEntry ? getMemberName(winnerEntry) : '';
      const isWinner = !!match.winner;

      drawCell(doc, x, cellY, colW, CELL_H, winnerName, isWinner, !isWinner);

      // Score
      if (match.player1_score != null && match.player2_score != null) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 100, 100);
        doc.text(
          `${match.player1_score}-${match.player2_score}`,
          x + colW - 1.5,
          cellY + CELL_H / 2 + 2,
          { align: 'right' }
        );
      }

      // Connector to next round
      if (rIdx < totalRounds - 1) {
        const connX = x + colW;
        const myMidY = centreY;
        const nextMatchIdx = Math.floor(mIdx / 2);
        const nextMidY = cellCentres[rIdx + 1][nextMatchIdx];

        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.3);
        doc.line(connX - 0.5, myMidY, connX - 0.5, nextMidY);
        doc.line(connX - 0.5, nextMidY, connX + 1, nextMidY);
      }
    }
  }

  // ── Outer border ────────────────────────────────────────────────────────
  doc.setDrawColor(60, 60, 60);
  doc.setLineWidth(0.6);
  doc.rect(MARGIN, BRACKET_TOP, CONTENT_W, BRACKET_H);

  // ── Footer ──────────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by BowlsTime`, PAGE_W / 2, PAGE_H - 3, { align: 'center' });

  const safeName = tournament.name.replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeName}_draw.pdf`);
}

function drawCell(doc, x, y, w, h, name, isWinner, isResult = false) {
  if (isWinner) {
    doc.setFillColor(230, 255, 235);
  } else if (isResult) {
    doc.setFillColor(248, 248, 255);
  } else {
    doc.setFillColor(255, 255, 255);
  }
  doc.rect(x, y, w, h, 'F');

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.25);
  doc.rect(x, y, w, h);

  if (!name) return;
  doc.setFont('helvetica', isWinner ? 'bold' : 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(isWinner ? 0 : 30, isWinner ? 120 : 30, 0);
  doc.text(name, x + 2, y + h / 2 + 2, { maxWidth: w - 4 });
  doc.setTextColor(0, 0, 0);
}