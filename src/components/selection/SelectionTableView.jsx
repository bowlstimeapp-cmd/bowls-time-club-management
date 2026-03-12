import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Eye, Pencil, ClipboardList, Trash2, CheckCircle, XCircle, Calendar, Clock, MoreVertical } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const competitionColors = {
  'Bramley': 'bg-emerald-100 text-emerald-800',
  'Wessex League': 'bg-blue-100 text-blue-800',
  'Denny': 'bg-purple-100 text-purple-800',
  'Top Club': 'bg-amber-100 text-amber-800',
};

export default function SelectionTableView({
  selections,
  isSelector,
  clubId,
  getMyAvailability,
  onSetAvailability,
  isSettingAvailability,
  onDelete,
}) {
  if (selections.length === 0) return null;

  return (
    <div className="border rounded-xl overflow-hidden bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Competition</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Match</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Time</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Players</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-600">Availability</th>
            <th className="text-right px-4 py-3 font-semibold text-gray-600">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {selections.map((selection) => {
            const myAvailability = getMyAvailability(selection.id);
            const playerCount = Object.values(selection.selections || {}).filter(Boolean).length;

            return (
              <tr key={selection.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    {format(parseISO(selection.match_date), 'd MMM yyyy')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={cn('text-xs', competitionColors[selection.competition] || 'bg-gray-100 text-gray-700')}>
                    {selection.competition}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                  {selection.match_name || <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden md:table-cell whitespace-nowrap">
                  {selection.match_start_time ? (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      {selection.match_start_time}
                      {selection.match_end_time && ` – ${selection.match_end_time}`}
                    </span>
                  ) : <span className="text-gray-400">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                  {playerCount} selected
                </td>
                <td className="px-4 py-3">
                  {selection.status === 'published' && onSetAvailability ? (
                    <div className="flex gap-1">
                      <button
                        onClick={() => onSetAvailability(selection.id, true)}
                        disabled={isSettingAvailability}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                          myAvailability === true
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-emerald-400 hover:text-emerald-600'
                        )}
                      >
                        <CheckCircle className="w-3 h-3" /> Yes
                      </button>
                      <button
                        onClick={() => onSetAvailability(selection.id, false)}
                        disabled={isSettingAvailability}
                        className={cn(
                          'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border transition-colors',
                          myAvailability === false
                            ? 'bg-red-600 text-white border-red-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-red-400 hover:text-red-600'
                        )}
                      >
                        <XCircle className="w-3 h-3" /> No
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={createPageUrl('SelectionView') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    {selection.status === 'published' && (
                      <Link to={createPageUrl('LiveScoring') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                          <ClipboardList className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    )}
                    {isSelector && (
                      <>
                        <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDelete?.(selection.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}