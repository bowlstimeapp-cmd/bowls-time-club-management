import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import CountyNav from '@/components/county/CountyNav';
import CountySelectionCard from '@/components/county/CountySelectionCard';
import CountySelectionEditor from '@/components/county/CountySelectionEditor';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Plus, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';

export default function CountySelections() {
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
  const isSelector = isPlatformAdmin || ['admin', 'secretary', 'selector'].includes(countyMembership?.role);

  const { data: selections = [], isLoading } = useQuery({
    queryKey: ['countySelections', countyId],
    queryFn: () => base44.entities.CountySelection.filter({ county_id: countyId }),
    enabled: !!countyId,
  });
  const { data: teams = [] } = useQuery({
    queryKey: ['countyTeams', countyId],
    queryFn: () => base44.entities.CountyTeam.filter({ county_id: countyId }),
    enabled: !!countyId,
  });
  const { data: squads = [] } = useQuery({
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
  const repTeams = teams.filter(t => t.team_type === 'representative');

  const refresh = () => qc.invalidateQueries({ queryKey: ['countySelections', countyId] });

  const saveSelection = useMutation({
    mutationFn: ({ selectionId, data }) => base44.functions.invoke('updateCountySelection', { countyId, selectionId, data }),
    onSuccess: () => { refresh(); setEditorOpen(false); setEditing(null); toast.success('Selection saved'); },
    onError: e => toast.error(e?.message || 'Failed to save selection'),
  });
  const togglePublish = useMutation({
    mutationFn: ({ selectionId, status }) => base44.functions.invoke('updateCountySelection', { countyId, selectionId, data: { status } }),
    onSuccess: () => { refresh(); toast.success('Selection updated'); },
    onError: e => toast.error(e?.message || 'Failed to update selection'),
  });
  const deleteSelection = useMutation({
    mutationFn: (selectionId) => base44.functions.invoke('updateCountySelection', { countyId, selectionId, delete: true }),
    onSuccess: () => { refresh(); toast.success('Selection deleted'); },
    onError: e => toast.error(e?.message || 'Failed to delete selection'),
  });

  if (!countyId) return <div className="p-8 text-center text-gray-500">No county selected.</div>;

  const visible = isSelector ? selections : selections.filter(s => s.status === 'published');
  const sorted = [...visible].sort((a, b) => (b.match_date || '').localeCompare(a.match_date || ''));

  return (
    <>
      <CountyNav />
      <div className="max-w-4xl mx-auto p-4 sm:p-8 space-y-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-purple-600" />
            <h1 className="text-xl font-bold">County Selection</h1>
          </div>
          {isSelector && (
            <Button size="sm" onClick={() => { setEditing(null); setEditorOpen(true); }} disabled={repTeams.length === 0}>
              <Plus className="w-4 h-4 mr-1" /> New Selection
            </Button>
          )}
        </div>

        {isSelector && repTeams.length === 0 && (
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            You need a representative team before creating selections. Add one on the county settings page.
          </p>
        )}

        {isLoading ? (
          <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
        ) : sorted.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-1">
                {isSelector ? 'No selections yet' : 'No published selections'}
              </h3>
              <p className="text-gray-500">
                {isSelector ? 'Create a selection to pick players for a representative team.' : 'Check back later for team selections.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sorted.map(s => (
              <CountySelectionCard
                key={s.id}
                selection={s}
                team={teams.find(t => t.id === s.county_team_id)}
                members={members}
                isSelector={isSelector}
                onEdit={() => { setEditing(s); setEditorOpen(true); }}
                onTogglePublish={() => togglePublish.mutate({ selectionId: s.id, status: s.status === 'published' ? 'draft' : 'published' })}
                onDelete={() => deleteSelection.mutate(s.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CountySelectionEditor
        open={editorOpen}
        onOpenChange={(open) => { setEditorOpen(open); if (!open) setEditing(null); }}
        selection={editing}
        teams={repTeams}
        squads={squads}
        members={members}
        saving={saveSelection.isPending}
        onSave={({ selectionId, data }) => saveSelection.mutate({ selectionId, data })}
      />
    </>
  );
}