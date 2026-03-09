import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, Edit2 } from 'lucide-react';

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
}) {
  const [editingMatch, setEditingMatch] = useState(null); // { roundIndex, matchIndex }
  const [scoreInput, setScoreInput] = useState({ p1: '', p2: '' });

  if (!bracket || !bracket.rounds) return null;

  // ── Old editor behaviour (click to select winner) ──
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
      // Admin directly confirms score
      const winner = p1 >= p2 ? match.player1 : match.player2;
      newMatch.score_status = 'accepted';
      newMatch.winner = winner;
      newRounds[roundIndex][matchIndex] = newMatch;
      propagateWinner(newRounds, roundIndex, matchIndex, winner);
    } else {
      // Competitor submits for admin approval
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
    // Open admin score entry immediately
    startEditing(roundIndex, matchIndex, reset);
  };

  const isEditing = (ri, mi) => editingMatch?.roundIndex === ri && editingMatch?.matchIndex === mi;

  const canEnterScore = (match) => {
    if (!match.player1 || !match.player2) return false;
    if (match.score_status === 'accepted') return false;
    if (match.score_status === 'pending') return false; // wait for admin action
    if (isAdmin) return true;
    if (!scoringMode || !userEmail) return false;
    return match.player1 === userEmail || match.player2 === userEmail;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tournament Bracket</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex gap-8 min-w-max pb-4">
            {bracket.rounds.map((round, roundIndex) => (
              <div key={roundIndex} className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-gray-600 text-center">
                  {getRoundName(roundIndex, bracket.rounds.length)}
                </h3>
                <div
                  className="flex flex-col justify-around flex-1"
                  style={{ gap: `${Math.pow(2, roundIndex) * 16}px` }}
                >
                  {round.map((match, matchIndex) => {
                    const editing = isEditing(roundIndex, matchIndex);
                    const isPending = match.score_status === 'pending';
                    const isAccepted = match.score_status === 'accepted';

                    return (
                      <div key={match.id} className="bg-gray-50 rounded-lg border p-2 w-52">
                        {/* Player 1 row */}
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

                        <div className="text-center text-xs text-gray-400 my-1">vs</div>

                        {/* Player 2 row */}
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
                              <Badge variant="outline" className="w-full justify-center text-emerald-600 border-emerald-200 bg-emerald-50 text-xs py-1">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Confirmed
                              </Badge>
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
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}