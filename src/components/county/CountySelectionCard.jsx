import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

export default function CountySelectionCard({ selection, team, members, isSelector, onEdit, onTogglePublish, onDelete }) {
  const nameFor = (email) => members.find(m => m.email === email)?.name || email;
  const players = selection.selected_players || [];
  const isPublished = selection.status === 'published';

  return (
    <Card>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">{team?.name || 'County Team'}</h3>
              <Badge className={isPublished ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}>
                {isPublished ? 'Published' : 'Draft'}
              </Badge>
            </div>
            {selection.match_name && <p className="text-sm text-gray-600 mt-0.5">{selection.match_name}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-500 mt-1 flex-wrap">
              {selection.match_date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(parseISO(selection.match_date), 'EEE d MMM yyyy')}
                </span>
              )}
              {selection.opponent && <span>vs {selection.opponent}</span>}
            </div>
          </div>
          {isSelector && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onEdit} title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={onTogglePublish} title={isPublished ? 'Unpublish' : 'Publish'}>
                {isPublished ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete} title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Users className="w-4 h-4 text-purple-600" />
            Selected Players ({players.length})
          </div>
          {players.length === 0 ? (
            <p className="text-sm text-gray-400">No players selected yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {players.map(email => (
                <Badge key={email} variant="outline" className="text-xs">{nameFor(email)}</Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}