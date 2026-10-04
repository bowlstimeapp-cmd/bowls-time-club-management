import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown } from 'lucide-react';
import { Plus, List, Pencil, Trash2, UserCircle } from 'lucide-react';

/**
 * Collapsible Teams section for a league card in League Admin.
 * Default-collapsed in the single-league focus view (defaultOpen=false),
 * open in the "See all" list (defaultOpen=true).
 */
export default function LeagueTeamsSection({ leagueTeams, defaultOpen = true, onAddTeam, onViewFixtures, onEditTeam, onDeleteTeam }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="font-medium text-gray-700 flex items-center gap-2 hover:text-gray-900"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${open ? '' : '-rotate-90'}`} />
          Teams ({leagueTeams.length})
        </button>
        <Button
          variant="outline"
          size="sm"
          onClick={onAddTeam}
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Team
        </Button>
      </div>

      {open && (
        leagueTeams.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">
            No teams in this league yet
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leagueTeams.map((team) => (
              <div
                key={team.id}
                className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">{team.name}</h5>
                    {team.captain_email ? (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <UserCircle className="w-4 h-4" />
                        {team.captain_name || team.captain_email}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 mt-1">No captain assigned</p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onViewFixtures(team)}
                      title="View team fixtures"
                    >
                      <List className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => onEditTeam(team)}
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                      onClick={() => onDeleteTeam(team.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}