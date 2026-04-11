import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Medal } from 'lucide-react';

export default function PlayerAccolades({ clubId, userEmail }) {
  const { data: assignments = [] } = useQuery({
    queryKey: ['myAccoladeAssignments', clubId, userEmail],
    queryFn: () => base44.entities.ClubAccoladeAssignment.filter({ club_id: clubId, user_email: userEmail }),
    enabled: !!clubId && !!userEmail,
  });

  const { data: accolades = [] } = useQuery({
    queryKey: ['clubAccolades', clubId],
    queryFn: () => base44.entities.ClubAccolade.filter({ club_id: clubId }),
    enabled: !!clubId && assignments.length > 0,
  });

  if (assignments.length === 0) return null;

  // Group assignments by accolade_id and count
  const grouped = {};
  assignments.forEach(a => {
    grouped[a.accolade_id] = (grouped[a.accolade_id] || 0) + 1;
  });

  const badgeEntries = Object.entries(grouped).map(([accoladeId, count]) => {
    const accolade = accolades.find(a => a.id === accoladeId);
    return accolade ? { accolade, count } : null;
  }).filter(Boolean);

  if (badgeEntries.length === 0) return null;

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Medal className="w-5 h-5 text-amber-500" />
          Accolades
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          {badgeEntries.map(({ accolade, count }) => (
            <div
              key={accolade.id}
              className="flex flex-col items-center gap-1 p-3 bg-gradient-to-b from-amber-50 to-yellow-50 border border-amber-200 rounded-xl min-w-[80px] text-center shadow-sm"
              title={accolade.description || accolade.name}
            >
              <span className="text-3xl">{accolade.emoji || '🏆'}</span>
              <span className="text-xs font-semibold text-amber-900 leading-tight">{accolade.name}</span>
              {count > 1 && (
                <span className="text-xs font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">
                  {count}x
                </span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}