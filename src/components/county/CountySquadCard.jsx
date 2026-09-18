import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

export default function CountySquadCard({ squad, members, canManage, onEdit, onDelete }) {
  const nameFor = (email) => members.find(m => m.email === email)?.name || email;
  const players = squad.players || [];

  return (
    <Card>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{squad.name}</h3>
              <Badge variant="outline">{players.length} players</Badge>
            </div>
            {squad.description && <p className="text-sm text-gray-600 mt-0.5">{squad.description}</p>}
          </div>
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={onEdit} title="Edit">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 hover:bg-red-50" onClick={onDelete} title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          {players.length === 0 ? (
            <p className="text-sm text-gray-400">No players in this squad yet.</p>
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