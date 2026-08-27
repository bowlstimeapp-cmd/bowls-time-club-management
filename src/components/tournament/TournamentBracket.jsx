import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from '@/lib/utils';
import { isAno } from '@/lib/tournamentAno';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, Clock, Edit2, Calendar, Upload, Eye, Loader2, UserPlus } from 'lucide-react';
import ScorecardImageModal from './ScorecardImageModal';

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
  const fileInputRef = useRef(null);
  const [uploadTarget, setUploadTarget] = useState(null);
  const [uploadingMatch, setUploadingMatch] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [walkoverMatch, setWalkoverMatch] = useState(null);
  const [replacingAno, setReplacingAno] = useState(null); // { roundIndex, matchIndex, side, anoInstance }
  const [replaceSearch, setReplaceSearch] = useState('');

  if (!bracket || !bracket.rounds) return null;

  // Get contact details for a pipe-separated entry (supports singles & teams, skips ANO)
  const getContactsForEntry = (entry) => {
    if (!entry) return [];
    return entry.split('|').filter(email => !isAno(email)).map(email => {
      const m = members.find(mem => mem.user_email === email);
      return { name: m?.user_name || email, email, phone: m?.phone || null };
    });
  };

  // Render an entry's parts; ANO parts are clickable (admin) to trigger replacement
  const renderEntryParts = (entry, roundIndex, matchIndex, side) => {
    if (!entry) return <span className="truncate text-xs text-gray-400">TBD</span>;
    const parts = entry.split('|');
    return (
      <span className="flex items-center gap-0.5 flex-wrap min-w-0">
        {parts.map((part, i) => {
          return (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-gray-300 px-0.5">/</span>}
              {isAno(part) ? (
                <span
                  className={cn(
                    "px-1 rounded text-[10px] font-medium border text-amber-700 bg-amber-100 border-amber-300",
                    isAdmin && "cursor-pointer hover:bg-amber-200"
                  )}
                  onClick={isAdmin ? (e) => { e.stopPropagation(); setReplacingAno({ roundIndex, matchIndex, side, anoInstance: part }); } : undefined}
                >
                  ANO
                </span>
              ) : (
                <span className="truncate text-xs">{getMemberName(part)}</span>
              )}
            </React.Fragment>
          );
        })}
      </span>
    );
  };

  // Replace a single ANO instance in an entry with a real member, propagating across the bracket
  const handleReplaceAno = (newEmail) => {
    if (!replacingAno) return;
    const { roundIndex, matchIndex, side, anoInstance } = replacingAno;
    const entry = bracket.rounds[roundIndex]?.[matchIndex]?.[side];
    if (!entry) { setReplacingAno(null); return; }
    const parts = entry.split('|');
    const idx = parts.indexOf(anoInstance);
    if (idx === -1) { setReplacingAno(null); return; }
    parts[idx] = newEmail;
    const newEntry = parts.join('|');
    const newRounds = bracket.rounds.map(r => r.map(m => {
      const updated = { ...m };
      if (m.player1 === entry) updated.player1 = newEntry;
      if (m.player2 === entry) updated.player2 = newEntry;
      if (m.winner === entry) updated.winner = newEntry;
      return updated;
    }));
    onUpdateBracket({ ...bracket, rounds: newRounds });
    setReplacingAno(null);
    setReplaceSearch('');
    toast.success('ANO replaced');
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
    setWalkoverMatch(null);
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

  const submitWalkover = (roundIndex, matchIndex, match, winnerSide) => {
    const winner = winnerSide === 'player1' ? match.player1 : match.player2;
    const p1Score = winnerSide === 'player1' ? 1 : 0;
    const p2Score = winnerSide === 'player1' ? 0 : 1;

    const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
    const newMatch = {
      ...newRounds[roundIndex][matchIndex],
      player1_score: p1Score,
      player2_score: p2Score,
      is_walkover: true,
      winner,
    };

    if (isAdmin) {
      newMatch.score_status = 'accepted';
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

  const canUploadScorecard = (match) => {
    if (!scoringMode || !userEmail) return false;
    if (!match.player1 || !match.player2) return false;
    const inPlayer1 = match.player1.split('|').includes(userEmail);
    const inPlayer2 = match.player2.split('|').includes(userEmail);
    return inPlayer1 || inPlayer2;
  };

  const isUploading = (ri, mi) => uploadingMatch?.roundIndex === ri && uploadingMatch?.matchIndex === mi;

  const triggerUpload = (roundIndex, matchIndex, match) => {
    setUploadTarget({ roundIndex, matchIndex, match });
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    const target = uploadTarget;
    if (file && target) {
      setUploadingMatch({ roundIndex: target.roundIndex, matchIndex: target.matchIndex });
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        const newRounds = bracket.rounds.map(r => r.map(m => ({ ...m })));
        newRounds[target.roundIndex][target.matchIndex] = { ...target.match, scorecard_image_url: file_url };
        onUpdateBracket({ ...bracket, rounds: newRounds });
        toast.success('Scorecard uploaded');
      } catch (err) {
        toast.error('Failed to upload scorecard');
      } finally {
        setUploadingMatch(null);
      }
    }
    e.target.value = '';
    setUploadTarget(null);
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
                           onMouseEnter={(e) => setHovered({ rIdx: roundIndex, mIdx: matchIndex, side: 'player1', rect: e.currentTarget.getBoundingClientRect() })}
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
                              {renderEntryParts(match.player1, roundIndex, matchIndex, 'player1')}
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
                              <ContactTooltip contacts={getContactsForEntry(match.player1)} rect={hovered?.rect} />
                            )}
                          </div>

                          <div className="relative flex items-center text-xs text-gray-400 my-1">
                            <span className="flex-1 text-center">vs</span>
                            {match.is_walkover && (
                              <span className="absolute right-0 text-blue-600 font-bold bg-blue-100 border border-blue-300 px-1 rounded text-[10px]">WO</span>
                            )}
                          </div>

                          {/* Player 2 row */}
                          <div
                            className="relative"
                            onMouseEnter={(e) => setHovered({ rIdx: roundIndex, mIdx: matchIndex, side: 'player2', rect: e.currentTarget.getBoundingClientRect() })}
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
                              {renderEntryParts(match.player2, roundIndex, matchIndex, 'player2')}
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
                              <ContactTooltip contacts={getContactsForEntry(match.player2)} rect={hovered?.rect} />
                            )}
                          </div>

                          {/* Scoring mode actions */}
                          {scoringMode && (
                            <div className="mt-2 space-y-1">
                              {editing ? (
                                <div className="space-y-1">
                                  {walkoverMatch?.roundIndex === roundIndex && walkoverMatch?.matchIndex === matchIndex ? (
                                    <div className="border border-blue-200 rounded p-2 space-y-1 bg-blue-50">
                                      <p className="text-xs text-center text-gray-600">Select the winner</p>
                                      <Button size="sm" variant="outline" className="w-full h-7 text-xs justify-start truncate" onClick={() => submitWalkover(roundIndex, matchIndex, match, 'player1')}>
                                        {getMemberName(match.player1)}
                                      </Button>
                                      <Button size="sm" variant="outline" className="w-full h-7 text-xs justify-start truncate" onClick={() => submitWalkover(roundIndex, matchIndex, match, 'player2')}>
                                        {getMemberName(match.player2)}
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button size="sm" variant="outline" className="w-full h-7 text-xs text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => setWalkoverMatch({ roundIndex, matchIndex })}>
                                      Walkover
                                    </Button>
                                  )}
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
                              {/* Scorecard image upload / view */}
                              {(canUploadScorecard(match) || match.scorecard_image_url) && (
                                <div className="flex gap-1">
                                  {match.scorecard_image_url && (
                                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => setViewingImage({ url: match.scorecard_image_url, title: `${getMemberName(match.player1)} vs ${getMemberName(match.player2)}` })}>
                                      <Eye className="w-3 h-3 mr-1" />
                                      View Scorecard
                                    </Button>
                                  )}
                                  {canUploadScorecard(match) && (
                                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => triggerUpload(roundIndex, matchIndex, match)} disabled={isUploading(roundIndex, matchIndex)}>
                                      {isUploading(roundIndex, matchIndex) ? (
                                        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Uploading</>
                                      ) : (
                                        <><Upload className="w-3 h-3 mr-1" /> {match.scorecard_image_url ? 'Change' : 'Upload Scorecard'}</>
                                      )}
                                    </Button>
                                  )}
                                </div>
                              )}
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
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <ScorecardImageModal imageUrl={viewingImage?.url} title={viewingImage?.title} onClose={() => setViewingImage(null)} />

      {/* ANO replacement dialog */}
      <Dialog open={!!replacingAno} onOpenChange={(open) => { if (!open) { setReplacingAno(null); setReplaceSearch(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="w-4 h-4 text-amber-500" /> Replace ANO</DialogTitle>
            <DialogDescription>Select a member to fill this placeholder slot in the draw.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search members..."
            value={replaceSearch}
            onChange={(e) => setReplaceSearch(e.target.value)}
            className="text-sm"
            autoFocus
          />
          <div className="max-h-64 overflow-y-auto space-y-1">
            {(() => {
              if (!replacingAno) return null;
              const entry = bracket.rounds[replacingAno.roundIndex]?.[replacingAno.matchIndex]?.[replacingAno.side] || '';
              const entryEmails = entry.split('|').filter(e => !isAno(e));
              const filtered = members.filter(m => {
                if (entryEmails.includes(m.user_email)) return false;
                if (!replaceSearch) return true;
                const name = m.user_name || m.user_email || '';
                return name.toLowerCase().includes(replaceSearch.toLowerCase());
              });
              if (filtered.length === 0) {
                return <p className="text-sm text-gray-400 text-center py-6">No members available</p>;
              }
              return filtered.map(m => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleReplaceAno(m.user_email)}
                  className="w-full text-left p-2 hover:bg-emerald-50 rounded text-sm flex items-center gap-2"
                >
                  <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-medium text-emerald-700">
                    {(m.user_name || m.user_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate">{m.user_name || m.user_email}</span>
                </button>
              ));
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function ContactTooltip({ contacts, rect }) {
  if (!contacts || contacts.length === 0 || !rect) return null;
  const style = {
    position: 'fixed',
    top: rect.top,
    left: rect.right + 8,
    zIndex: 9999,
  };
  return (
    <div style={style} className="bg-white border border-gray-200 rounded-lg shadow-xl p-2.5 w-48 text-xs pointer-events-none">
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