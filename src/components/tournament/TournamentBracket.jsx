import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Edit2, Calendar } from 'lucide-react';

const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi-Finals';
  if (remaining === 3) return 'Quarter-Finals';
  return `Round ${roundIndex + 1}`;
};

export default function TournamentBracket({
  bracket,
  getMemberName,
  onUpdateBracket,
  editable = false,
  isAdmin = false,
  userEmail = null,
  scoringMode = false,
  members = [],
}) {
  const [editingMatch, setEditingMatch] = useState(null);
  const [scoreInput, setScoreInput] = useState({ p1: '', p2: '' });
  const [hovered, setHovered] = useState(null); // { rIdx, mIdx, side, rect }

  if (!bracket || !bracket.rounds) return null;

  // Get contact details for a pipe-separated entry (supports singles & teams)
  const getContactsForEntry = (entry) => {
    if (!entry) return [];
    return entry.split('|').map(email => {
      const m = members.find(mem => mem.user_email === email);
      return { name: m?.user_name || email, email, phone: m?.phone || null };
    });
  };

  // Should we show contact tooltip for a given side of a given match?
  const shouldShowContact = (roundIndex, matchIndex, side, match) => {
    if (!hovered) return false;
    if (hovered.rIdx !== roundIndex || hovered.mIdx !== matchIndex || hovered.side !== side) return false;
    if (!match[side]) return false;
    if (members.length === 0) return false;
    if (isAdmin) return true;
    if (!userEmail) return false;
    // User can only see OPPONENT's contacts — they must be in the other side
    const opponentSide = side === 'player1' ? 'player2' : 'player1';
    const opponentEntry = match[opponentSide];
    if (!opponentEntry) return false;
    return opponentEntry.split('|').includes(userEmail);
  };

  const setRoundDate = (roundName, date) => {
    const newDates = { ...(bracket.round_dates || {}) };
    if (date) {
      newDates[roundName] = date;
    } else {
      delete newDates[roundName];
    }
    onUpdateBracket({ ...bracket, round_dates: newDates });
  };

  // ── Winner selection (editor mode) ──
  const handleSelectWinner = (roundIndex, matchIndex, playerEmail) => {
    if (!editable || !playerEmail) return;
    const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
    newRounds[roundIndex][matchIndex].winner = playerEmail;
    if (roundIndex < newRounds.length - 1) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      if (matchIndex % 2 === 0) {
        newRounds[roundIndex + 1][nextMatchIndex].player1 = playerEmail;
      } else {
        newRounds[roundIndex + 1][nextMatchIndex].player2 = playerEmail;
      }
    }
    onUpdateBracket({ ...bracket, rounds: newRounds });
  };

  // ── Score entry helpers ──
  const startEditing = (roundIndex, matchIndex, match) => {
    setEditingMatch({ roundIndex, matchIndex });
    setScoreInput({
      p1: match.player1_score != null ? String(match.player1_score) : '',
      p2: match.player2_score != null ? String(match.player2_score) : '',
    });
  };

  const cancelEditing = () => {
    setEditingMatch(null);
    setScoreInput({ p1: '', p2: '' });
  };

  const propagateWinner = (rounds, roundIndex, matchIndex, winner) => {
    if (roundIndex < rounds.length - 1) {
      const next = Math.floor(matchIndex / 2);
      if (matchIndex % 2 === 0) {
        rounds[roundIndex + 1][next] = { ...rounds[roundIndex + 1][next], player1: winner };
      } else {
        rounds[roundIndex + 1][next] = { ...rounds[roundIndex + 1][next], player2: winner };
      }
    }
  };

  const submitScore = (roundIndex, matchIndex, match) => {
    const p1 = parseInt(scoreInput.p1);
    const p2 = parseInt(scoreInput.p2);
    if (isNaN(p1) || isNaN(p2)) return;

    const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
    const newMatch = { ...newRounds[roundIndex][matchIndex], player1_score: p1, player2_score: p2 };

    if (isAdmin) {
      const winner = p1 >= p2 ? match.player1 : match.player2;
      newMatch.score_status = 'accepted';
      newMatch.winner = winner;
      newRounds[roundIndex][matchIndex] = newMatch;
      propagateWinner(newRounds, roundIndex, matchIndex, winner);
    } else {
      newMatch.score_status = 'pending';
      newMatch.score_submitted_by = userEmail;
      newRounds[roundIndex][matchIndex] = newMatch;
    }

    onUpdateBracket({ ...bracket, rounds: newRounds });
    cancelEditing();
  };

  const acceptScore = (roundIndex, matchIndex, match) => {
    const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
    const winner = match.player1_score >= match.player2_score ? match.player1 : match.player2;
    newRounds[roundIndex][matchIndex] = { ...match, score_status: 'accepted', winner };
    propagateWinner(newRounds, roundIndex, matchIndex, winner);
    onUpdateBracket({ ...bracket, rounds: newRounds });
  };

  const rejectScore = (roundIndex, matchIndex, match) => {
    const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
    const reset = { ...match, score_status: null, player1_score: null, player2_score: null, score_submitted_by: null };
    newRounds[roundIndex][matchIndex] = reset;
    onUpdateBracket({ ...bracket, rounds: newRounds });
    startEditing(roundIndex, matchIndex, reset);
  };

  const isEditing = (ri, mi) => editingMatch?.roundIndex === ri && editingMatch?.matchIndex === mi;

  const canEnterScore = (match) => {
    if (!match.player1 || !match.player2) return false;
    if (isAdmin) return match.score_status !== 'pending';
    if (match.score_status === 'accepted') return false;
    if (match.score_status === 'pending') return false;
    if (!scoringMode || !userEmail) return false;
    const inPlayer1 = match.player1.split('|').includes(userEmail);
    const inPlayer2 = match.player2.split('|').includes(userEmail);
    return inPlayer1 || inPlayer2;
  };

  const showDateControls = editable || isAdmin;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Bracket</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-8 min-w-max pb-4">
            {bracket.rounds.map((round, roundIndex) => {
              const roundName = getRoundName(roundIndex, bracket.rounds.length);
              const roundDate = bracket.round_dates?.[roundName];

              return (
                <div key={roundIndex} className="flex flex-col gap-4">
                  {/* Round header with play-by date */}
                  <div className="text-center min-w-[224px]">
                    <h3 className="text-sm font-semibold text-gray-600">{roundName}</h3>
                    {showDateControls ? (
                      <div className="flex items-center gap-1 mt-1 justify-center">
                        <Calendar className="w-3 h-3 text-gray-400 flex-shrink-0" />
                        <input
                          type="date"
                          value={roundDate || ''}
                          onChange={(e) => setRoundDate(roundName, e.target.value)}
                          className="text-xs border rounded px-1.5 py-0.5 text-gray-600 bg-white"
                        />
                      </div>
                    ) : roundDate ? (
                      <p className="text-xs text-emerald-600 font-medium mt-1">
                        Play by: {new Date(roundDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    ) : null}
                  </div>

                  <div
                    className="flex flex-col justify-around flex-1"
                    style={{ gap: `${Math.pow(2, roundIndex) * 16}px` }}
                  >
                    {round.map((match, matchIndex) => {
                      const editing = isEditing(roundIndex, matchIndex);
                      const isPending = match.score_status === 'pending';
                      const isAccepted = match.score_status === 'accepted';

                      return (
                        <div key={match.id} className="bg-gray-50 rounded-lg border p-2 w-56">
                          {/* Player 1 row */}
                          <div
                            className="relative"
                            onMouseEnter={() => setHovered({ rIdx: roundIndex, mIdx: matchIndex, side: 'player1' })}
                            onMouseLeave={() => setHovered(null)}
                          >
                            <div
                              onClick={() => !scoringMode && editable && handleSelectWinner(roundIndex, matchIndex, match.player1)}
                              className={cn(
                                "p-2 rounded text-sm flex items-center justify-between gap-1",
                                match.player1 ? "bg-white border" : "bg-gray-100 text-gray-400",
                                isAccepted && match.winner === match.player1 && "bg-emerald-100 border-emerald-300 font-semibold",
                                !scoringMode && editable && match.player1 && "cursor-pointer hover:bg-emerald-50"
                              )}
                            >
                              <span className="truncate text-xs">{match.player1 ? getMemberName(match.player1) : 'TBD'}</span>
                              {!editing && (isPending || isAccepted) && match.player1_score != null && (
                                <span className="font-bold text-gray-700 flex-shrink-0 ml-1">{match.player1_score}</span>
                              )}
                              {editing && (
                                <Input
                                  type="number" min="0"
                                  value={scoreInput.p1}
                                  onChange={e => setScoreInput(s => ({ ...s, p1: e.target.value }))}
                                  className="w-14 h-6 text-xs px-1 flex-shrink-0"
                                  onClick={e => e.stopPropagation()}
                                />
                              )}
                            </div>
                            {/* Contact tooltip for player 1 */}
                            {shouldShowContact(roundIndex, matchIndex, 'player1', match) && (
                              <ContactTooltip contacts={getContactsForEntry(match.player1)} />
                            )}
                          </div>

                          <div className="text-center text-xs text-gray-400 my-1">vs</div>

                          {/* Player 2 row */}
                          <div
                            className="relative"
                            onMouseEnter={() => setHovered({ rIdx: roundIndex, mIdx: matchIndex, side: 'player2' })}
                            onMouseLeave={() => setHovered(null)}
                          >
                            <div
                              onClick={() => !scoringMode && editable && handleSelectWinner(roundIndex, matchIndex, match.player2)}
                              className={cn(
                                "p-2 rounded text-sm flex items-center justify-between gap-1",
                                match.player2 ? "bg-white border" : "bg-gray-100 text-gray-400",
                                isAccepted && match.winner === match.player2 && "bg-emerald-100 border-emerald-300 font-semibold",
                                !scoringMode && editable && match.player2 && "cursor-pointer hover:bg-emerald-50"
                              )}
                            >
                              <span className="truncate text-xs">{match.player2 ? getMemberName(match.player2) : 'TBD'}</span>
                              {!editing && (isPending || isAccepted) && match.player2_score != null && (
                                <span className="font-bold text-gray-700 flex-shrink-0 ml-1">{match.player2_score}</span>
                              )}
                              {editing && (
                                <Input
                                  type="number" min="0"
                                  value={scoreInput.p2}
                                  onChange={e => setScoreInput(s => ({ ...s, p2: e.target.value }))}
                                  className="w-14 h-6 text-xs px-1 flex-shrink-0"
                                  onClick={e => e.stopPropagation()}
                                />
                              )}
                            </div>
                            {/* Contact tooltip for player 2 */}
                            {shouldShowContact(roundIndex, matchIndex, 'player2', match) && (
                              <ContactTooltip contacts={getContactsForEntry(match.player2)} />
                            )}
                          </div>

                          {/* Scoring mode actions */}
                          {scoringMode && (
                            <div className="mt-2 space-y-1">
                              {editing ? (
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
                                    onClick={() => submitScore(roundIndex, matchIndex, match)}
                                    disabled={scoreInput.p1 === '' || scoreInput.p2 === ''}
                                  >
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" className="h-7 text-xs px-2" onClick={cancelEditing}>
                                    ✕
                                  </Button>
                                </div>
                              ) : isPending && isAdmin ? (
                                <>
                                  <div className="text-xs text-center text-gray-500 mb-1">
                                    {match.player1_score} – {match.player2_score}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button size="sm" className="flex-1 h-7 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => acceptScore(roundIndex, matchIndex, match)}>
                                      ✓ Accept
                                    </Button>
                                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50" onClick={() => rejectScore(roundIndex, matchIndex, match)}>
                                      ✗ Reject
                                    </Button>
                                  </div>
                                </>
                              ) : isPending ? (
                                <Badge variant="outline" className="w-full justify-center text-amber-600 border-amber-200 bg-amber-50 text-xs py-1">
                                  <Clock className="w-3 h-3 mr-1" />
                                  Awaiting approval
                                </Badge>
                              ) : isAccepted ? (
                                <>
                                  <Badge variant="outline" className="w-full justify-center text-emerald-600 border-emerald-200 bg-emerald-50 text-xs py-1">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Confirmed
                                  </Badge>
                                  {isAdmin && (
                                    <Button size="sm" variant="outline" className="w-full h-7 text-xs mt-1" onClick={() => startEditing(roundIndex, matchIndex, match)}>
                                      <Edit2 className="w-3 h-3 mr-1" />
                                      Edit Score
                                    </Button>
                                  )}
                                </>
                              ) : canEnterScore(match) ? (
                                <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => startEditing(roundIndex, matchIndex, match)}>
                                  <Edit2 className="w-3 h-3 mr-1" />
                                  {isAdmin ? 'Enter Score' : 'Submit Score'}
                                </Button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContactTooltip({ contacts }) {
  if (!contacts || contacts.length === 0) return null;
  return (
    <div className="absolute z-50 left-full top-0 ml-2 bg-white border border-gray-200 rounded-lg shadow-xl p-2.5 w-48 text-xs pointer-events-none">
      {contacts.map((c, i) => (
        <div key={i} className={i > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}>
          <p className="font-semibold text-gray-800">{c.name}</p>
          {c.phone && <p className="text-gray-600 mt-0.5">📞 {c.phone}</p>}
          <p className="text-gray-600 mt-0.5">✉ {c.email}</p>
        </div>
      ))}
    </div>
  );
}