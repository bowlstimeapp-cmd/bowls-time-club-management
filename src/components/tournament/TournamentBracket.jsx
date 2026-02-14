import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from '@/lib/utils';

const getRoundName = (roundIndex, totalRounds) => {
  const remaining = totalRounds - roundIndex;
  if (remaining === 1) return 'Final';
  if (remaining === 2) return 'Semi-Finals';
  if (remaining === 3) return 'Quarter-Finals';
  return `Round ${roundIndex + 1}`;
};

export default function TournamentBracket({ bracket, getMemberName, onUpdateBracket, editable = false }) {
  if (!bracket || !bracket.rounds) {
    return null;
  }

  const handleSelectWinner = (roundIndex, matchIndex, playerEmail) => {
    if (!editable || !playerEmail) return;

    const newRounds = [...bracket.rounds];
    newRounds[roundIndex][matchIndex].winner = playerEmail;

    // Propagate to next round
    if (roundIndex < newRounds.length - 1) {
      const nextMatchIndex = Math.floor(matchIndex / 2);
      const isFirstPlayer = matchIndex % 2 === 0;
      
      if (isFirstPlayer) {
        newRounds[roundIndex + 1][nextMatchIndex].player1 = playerEmail;
      } else {
        newRounds[roundIndex + 1][nextMatchIndex].player2 = playerEmail;
      }
    }

    onUpdateBracket({ ...bracket, rounds: newRounds });
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
                  {round.map((match, matchIndex) => (
                    <div 
                      key={match.id}
                      className="bg-gray-50 rounded-lg border p-2 w-48"
                    >
                      <div
                        onClick={() => editable && handleSelectWinner(roundIndex, matchIndex, match.player1)}
                        className={cn(
                          "p-2 rounded text-sm truncate",
                          match.player1 ? "bg-white border" : "bg-gray-100 text-gray-400",
                          match.winner === match.player1 && "bg-emerald-100 border-emerald-300 font-medium",
                          editable && match.player1 && "cursor-pointer hover:bg-emerald-50"
                        )}
                      >
                        {match.player1 ? getMemberName(match.player1) : 'TBD'}
                      </div>
                      <div className="text-center text-xs text-gray-400 my-1">vs</div>
                      <div
                        onClick={() => editable && handleSelectWinner(roundIndex, matchIndex, match.player2)}
                        className={cn(
                          "p-2 rounded text-sm truncate",
                          match.player2 ? "bg-white border" : "bg-gray-100 text-gray-400",
                          match.winner === match.player2 && "bg-emerald-100 border-emerald-300 font-medium",
                          editable && match.player2 && "cursor-pointer hover:bg-emerald-50"
                        )}
                      >
                        {match.player2 ? getMemberName(match.player2) : 'TBD'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}