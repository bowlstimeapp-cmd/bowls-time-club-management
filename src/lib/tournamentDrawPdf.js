import { jsPDF } from 'jspdf';

const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi Final';
  if (remaining === 3) return 'Qtr Final';
  return `Round ${roundIndex + 1}`;
};

/**
 * Generate a knockout draw PDF matching the Southampton template.
 * @param {object} tournament  - ClubTournament record
 * @param {string} clubName    - Club display name
 * @param {function} getMemberName - (entry: string) => string
 */
export function generateTournamentDrawPdf(tournament, clubName, getMemberName) {
  const bracket = tournament.bracket;
  if (!bracket?.rounds?.length) return;

  const rounds = bracket.rounds;
  const totalRounds = rounds.length;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 10;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  // ── Header ──────────────────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(clubName.toUpperCase(), PAGE_W / 2, MARGIN + 6, { align: 'center' });

  doc.setFontSize(11);
  const compLabel = `COMPETITION: ${tournament.name}`;
  doc.text(compLabel, PAGE_W / 2, MARGIN + 13, { align: 'center' });

  const headerBottom = MARGIN + 18;

  // ── Column layout ────────────────────────────────────────────────────
  // We have totalRounds + 1 columns (first col = initial players, rest = R1..Final)
  // But template shows: first player column (seeded), then R1 results column, ... Final column
  // We'll have totalRounds columns for the bracket rounds, each with a header section and player slots.

  const colCount = totalRounds;
  const colW = CONTENT_W / colCount;

  const ROW_H = 6; // height per player row
  const HEADER_H = 14; // height for round header (name + challenge-by + play-by)

  // First round has the most matches — drives total height
  const firstRoundMatches = rounds[0].length;
  // Each match needs 2 player rows + a small gap
  const MATCH_H = ROW_H * 2 + 2;
  const BRACKET_H = PAGE_H - headerBottom - MARGIN - 4;

  // ── Draw round columns ───────────────────────────────────────────────
  for (let rIdx = 0; rIdx < totalRounds; rIdx++) {
    const roundName = getRoundName(rIdx, totalRounds);
    const roundDate = bracket.round_dates?.[roundName];
    const x = MARGIN + rIdx * colW;
    const round = rounds[rIdx];
    const matchCount = round.length;

    // Column header box
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setDrawColor(150, 150, 150);
    doc.rect(x, headerBottom, colW, HEADER_H);

    doc.setTextColor(0, 0, 0);
    doc.text(roundName, x + colW / 2, headerBottom + 4, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text('Challenge by:', x + 2, headerBottom + 8);
    doc.text('Play by:', x + 2, headerBottom + 12);

    // Add dates if present
    if (roundDate) {
      const d = new Date(roundDate + 'T00:00:00');
      const label = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      doc.text(label, x + colW / 2 + 5, headerBottom + 12, { align: 'left' });
    }

    // Players area
    const playersTop = headerBottom + HEADER_H;
    const playersH = BRACKET_H - HEADER_H;

    // Slot height per match in this round (evenly spaced)
    const slotH = playersH / matchCount;

    for (let mIdx = 0; mIdx < matchCount; mIdx++) {
      const match = round[mIdx];
      const slotTop = playersTop + mIdx * slotH;
      const slotMid = slotTop + slotH / 2;

      const p1Name = match.player1 ? getMemberName(match.player1) : '';
      const p2Name = match.player2 ? getMemberName(match.player2) : '';

      const isWinner = (name, playerKey) => match.winner && match.winner === match[playerKey];

      const p1Y = slotMid - ROW_H * 0.6;
      const p2Y = slotMid + ROW_H * 0.6;

      // Draw player 1 row
      doc.setDrawColor(180, 180, 180);
      doc.line(x, p1Y, x + colW - 1, p1Y);
      doc.setFont('helvetica', match.winner === match.player1 ? 'bold' : 'normal');
      doc.setFontSize(7);
      doc.setTextColor(match.winner === match.player1 ? 0 : 50, match.winner === match.player1 ? 100 : 50, 0);
      doc.text(p1Name, x + 2, p1Y - 1, { maxWidth: colW - 4 });

      // Draw player 2 row
      doc.line(x, p2Y, x + colW - 1, p2Y);
      doc.setFont('helvetica', match.winner === match.player2 ? 'bold' : 'normal');
      doc.setTextColor(match.winner === match.player2 ? 0 : 50, match.winner === match.player2 ? 100 : 50, 0);
      doc.text(p2Name, x + 2, p2Y - 1, { maxWidth: colW - 4 });

      // Score if available
      if (match.player1_score != null && match.player2_score != null) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(0, 0, 0);
        doc.text(`${match.player1_score} - ${match.player2_score}`, x + colW - 2, slotMid, { align: 'right' });
      }

      // Connector bracket line to next round (right edge of this match to middle of next match)
      if (rIdx < totalRounds - 1) {
        const nextMatchIdx = Math.floor(mIdx / 2);
        const nextSlotH = playersH / (matchCount / 2);
        const nextSlotMid = playersTop + nextMatchIdx * nextSlotH + nextSlotH / 2;

        doc.setDrawColor(180, 180, 180);
        doc.setLineWidth(0.3);

        // Horizontal from current slot mid to right edge
        doc.line(x + colW - 1, slotMid, x + colW - 1, slotMid);

        // Bracket: top pair goes up, bottom pair goes down to meet at nextSlotMid
        if (mIdx % 2 === 0) {
          // Top of pair — draw down to nextSlotMid
          doc.line(x + colW - 1, slotMid, x + colW - 1, nextSlotMid);
        } else {
          // Bottom of pair — draw up to nextSlotMid
          doc.line(x + colW - 1, slotMid, x + colW - 1, nextSlotMid);
        }
      }

      doc.setTextColor(0, 0, 0);
      doc.setLineWidth(0.1);
    }
  }

  // Outer border
  doc.setDrawColor(100, 100, 100);
  doc.setLineWidth(0.5);
  doc.rect(MARGIN, headerBottom, CONTENT_W, BRACKET_H);

  // Column dividers
  doc.setLineWidth(0.2);
  for (let c = 1; c < colCount; c++) {
    const cx = MARGIN + c * colW;
    doc.line(cx, headerBottom, cx, headerBottom + BRACKET_H);
  }

  // Footer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generated by BowlsTime • ${new Date().toLocaleDateString('en-GB')}`, PAGE_W / 2, PAGE_H - 3, { align: 'center' });

  const safeName = tournament.name.replace(/[^a-z0-9]/gi, '_');
  doc.save(`${safeName}_draw.pdf`);
}