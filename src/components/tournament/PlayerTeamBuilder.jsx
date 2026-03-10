import React from 'react';
import { X } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export default function PlayerTeamBuilder({ players, teamSize, getMemberName, teams, onChange }) {
  const assignedEmails = new Set(teams.flat());
  const unassigned = players.filter(p => !assignedEmails.has(p));

  const addPlayer = (email) => {
    const newTeams = teams.map(t => [...t]);
    for (let i = 0; i < newTeams.length; i++) {
      if (newTeams[i].length < teamSize) {
        newTeams[i].push(email);
        onChange(newTeams);
        return;
      }
    }
    onChange([...newTeams, [email]]);
  };

  const removePlayer = (teamIdx, email) => {
    const newTeams = teams.map(t => [...t]);
    newTeams[teamIdx] = newTeams[teamIdx].filter(e => e !== email);
    onChange(newTeams.filter(t => t.length > 0));
  };

  return (
    <div className="space-y-3 border rounded-lg p-3 bg-gray-50">
      {unassigned.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Click to add to teams:</p>
          <div className="flex flex-wrap gap-1">
            {unassigned.map(email => (
              <button
                key={email}
                type="button"
                onClick={() => addPlayer(email)}
                className="text-xs px-2 py-1 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 text-blue-800 transition-colors"
              >
                + {getMemberName(email)}
              </button>
            ))}
          </div>
        </div>
      )}

      {teams.length > 0 && (
        <div className="space-y-2 max-h-52 overflow-y-auto">
          {teams.map((team, idx) => (
            <div
              key={idx}
              className={`border rounded-lg p-2 ${team.length === teamSize ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-gray-600">Team {idx + 1}</span>
                <Badge
                  variant="outline"
                  className={`text-xs ${team.length === teamSize ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-gray-300 text-gray-500'}`}
                >
                  {team.length}/{teamSize}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {team.map(email => (
                  <div key={email} className="flex items-center gap-1 text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                    <span>{getMemberName(email)}</span>
                    <button
                      type="button"
                      onClick={() => removePlayer(idx, email)}
                      className="text-red-400 hover:text-red-600 ml-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {Array.from({ length: teamSize - team.length }).map((_, i) => (
                  <div key={i} className="text-xs border border-dashed border-gray-300 rounded px-2 py-0.5 text-gray-300">
                    empty
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {teams.length === 0 && unassigned.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">Select players above to build teams</p>
      )}
    </div>
  );
}