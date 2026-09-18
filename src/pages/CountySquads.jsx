import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import CountySquadCard from '@/components/county/CountySquadCard';
import CountySquadEditor from '@/components/county/CountySquadEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function CountySquads() {
  const [params] = useSearchParams();
  const countyId = params.get('countyId');
  const qc = useQueryClient();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: countyMembership } = useQuery({
    queryKey: ['myCountyMembership', countyId, user?.email],
    queryFn: async () => { const r = await base44.entities.CountyMembership.filter({ county_id: countyId, user_email: user.email, status: 'approved' }); return r[0]; },
    enabled: !!countyId && !!user?.email,
  });
  const isPlatformAdmin = user?.role === 'admin';
  const canManage = isPlatformAdmin || ['admin', 'secretary'].includes(countyMembership?.role);

  const { data: squads = [], isLoading } = useQuery({
    queryKey: ['countySquads', countyId],
    queryFn: () => base44.entities.CountySquad.filter({ county_id: countyId }),
    enabled: !!countyId,
  });
  const { data: affData } = useQuery({
    queryKey: ['countyAffiliated', countyId],
    queryFn: async () => { const res = await base44.functions.invoke('getCountyAffiliatedMembers', { countyId }); return res.data; },
    enabled: !!countyId,
  });

  const members = affData?.approved || [];

  const refresh = () => qc.invalidateQueries({ queryKey: ['countySquads', countyId] });

  const saveSquad = useMutation({
    mutationFn: ({ squadId, data }) => base44.functions.invoke('updateCountySquad', { countyId, squadId, data }),
    onSuccess: () => { refresh(); setEditorOpen(false); setEditing(null); toast.success('Squad saved'); },
    onError: e => toast.error(e?.message || 'Failed to save squad'),
  });
  const deleteSquad = useMutation({
    mutationFn: (squadId) => base44.functions.invoke('updateCountySquad', { countyId, squadId, delete: true }),
    onSuccess: () => { refresh(); toast.success('Squad deleted'); },
    onError: e => toast.error(e?.message || 'Failed to delete squad'),
  });

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold">County Squads</h1>
          </div>
          {canManage && (
            <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> New Squad
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : squads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">No squads yet</h3>
              <p className="text-gray-500">
                {canManage
                  ? 'Create a squad to group players, then pick from it when making selections.'
                  : 'Squads created by the county will appear here.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {squads.map(s => (
              <CountySquadCard
                key={s.id}
                squad={s}
                members={members}
                canManage={canManage}
                onEdit={() => { setEditing(s); setEditorOpen(true); }}
                onDelete={() => deleteSquad.mutate(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CountySquadEditor
        open={editorOpen}
        onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditing(null); }}
        squad={editing}
        members={members}
        saving={saveSquad.isPending}
        onSave={({ squadId, data }) => saveSquad.mutate({ squadId, data })}
      />
    </>
  );
}