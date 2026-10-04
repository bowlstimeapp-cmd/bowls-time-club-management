import React from 'react';
import { getScoringRules } from '@/lib/leagueScoring';

/**
 * Shared league standings table, used by the League Table dialog and My Team.
 * Renders the output of calculateLeagueTable. For sets leagues the Draw
 * column is hidden (a sets game can never be drawn).
 *
 * Props:
 *   table           – output of calculateLeagueTable(league, teams, fixtures)
 *   league          – the league (used for is_sets + scoring rules)
 *   highlightTeamId – id of a team whose row should be highlighted (My Team)
 *   compact         – smaller sizing for the My Team view
 *   showRules       – render getScoringRules(league) under the table
 */
export default function LeagueStandingsTable({ table, league, highlightTeamId, compact = false, showRules = true }) {
  const isSets = !!league?.is_sets;
  const cell = compact ? 'p-1.5' : 'p-2';
  const textSize = compact ? 'text-xs' : 'text-sm';
  const rules = showRules ? getScoringRules(league || {}) : [];

  return (
    <div>
      <div className="overflow-x-auto">
        <table className={`w-full border-collapse ${textSize}`}>
          <thead>
            <tr>
              <th className={`border bg-gray-50 text-center ${cell}`}>Pos</th>
              <th className={`border bg-gray-50 text-left ${cell}`}>Team</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>P</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>W</th>
              {!isSets && <th className={`border bg-gray-50 text-center ${cell}`}>D</th>}
              <th className={`border bg-gray-50 text-center ${cell}`}>L</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>PF</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>PA</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>+/-</th>
              <th className={`border bg-gray-50 text-center ${cell}`}>Pts</th>
            </tr>
          </thead>
          <tbody>
            {(table || []).map((entry, idx) => (
              <tr
                key={entry.team.id}
                className={entry.team.id === highlightTeamId ? 'bg-emerald-50' : (idx % 2 === 1 ? 'bg-gray-50' : '')}
              >
                <td className={`border text-center font-medium ${cell}`}>{idx + 1}</td>
                <td className={`border font-medium ${cell}`}>{entry.team.name}</td>
                <td className={`border text-center ${cell}`}>{entry.played}</td>
                <td className={`border text-center ${cell}`}>{entry.won}</td>
                {!isSets && <td className={`border text-center ${cell}`}>{entry.drawn}</td>}
                <td className={`border text-center ${cell}`}>{entry.lost}</td>
                <td className={`border text-center ${cell}`}>{entry.pointsFor}</td>
                <td className={`border text-center ${cell}`}>{entry.pointsAgainst}</td>
                <td className={`border text-center ${cell}`}>{entry.pointsDiff > 0 ? '+' : ''}{entry.pointsDiff}</td>
                <td className={`border text-center font-bold ${cell}`}>{entry.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rules.length > 0 && (
        <div className={`mt-4 p-3 bg-gray-50 rounded-lg border ${compact ? 'text-xs' : 'text-sm'} text-gray-600`}>
          <p className="font-semibold text-gray-700 mb-1">Scoring Rules:</p>
          <ul className="space-y-0.5">
            {rules.map((rule, i) => <li key={i}>• {rule}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}