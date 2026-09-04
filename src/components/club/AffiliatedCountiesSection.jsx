import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Building2, Loader2, Trash2, Plus, Send } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliatedCountiesSection({ clubId, isClubAdmin }) {
  const qc = useQueryClient();
  const [selectedCountyId, setSelectedCountyId] = useState('');

  // Approved affiliations for this club
  const { data: affiliations = [] } = useQuery({
    queryKey: ['clubCountyAffiliations', clubId],
    queryFn: () => base44.entities.ClubCountyAffiliation.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  // All counties (for the request dropdown)
  const { data: counties = [] } = useQuery({
    queryKey: ['allCounties'],
    queryFn: () => base44.entities.County.filter({ is_active: true }),
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['clubCountyAffiliations', clubId] });

  const requestMutation = useMutation({
    mutationFn: ({ club_id, county_id }) => base44.functions.invoke('requestClubAffiliation', { club_id, county_id }),
    onSuccess: () => {
      refresh();
      toast.success('County affiliation requested');
      setSelectedCountyId('');
    },
    onError: (e) => toast.error(e?.message || 'Failed to request affiliation'),
  });

  const removeMutation = useMutation({
    mutationFn: ({ affiliationId }) => base44.functions.invoke('removeClubAffiliation', { affiliationId }),
    onSuccess: () => {
      refresh();
      toast.success('Affiliation removed');
    },
    onError: (e) => toast.error(e?.message || 'Failed to remove affiliation'),
  });

  const approved = affiliations.filter(a => a.status === 'approved');
  const pending = affiliations.filter(a => a.status === 'pending');
  const countyName = (id) => counties.find(c => c.id === id)?.name || 'Unknown county';

  const availableCounties = counties.filter(c => !affiliations.some(a => a.county_id === c.id));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Affiliated Counties</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {approved.length === 0 && pending.length === 0 && (
            <p className="text-sm text-gray-400">No county affiliations yet.</p>
          )}
          {approved.map(a => (
            <div key={a.id} className="flex items-center justify-between border rounded-xl p-3 bg-white">
              <div>
                <p className="font-medium">{countyName(a.county_id)}</p>
                <Badge className="bg-emerald-100 text-emerald-700 mt-1">Approved</Badge>
              </div>
              {isClubAdmin && (
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeMutation.mutate({ affiliationId: a.id })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          {pending.map(a => (
            <div key={a.id} className="flex items-center justify-between border rounded-xl p-3 bg-amber-50">
              <div>
                <p className="font-medium">{countyName(a.county_id)}</p>
                <Badge className="bg-amber-100 text-amber-700 mt-1">Pending approval</Badge>
              </div>
              {isClubAdmin && (
                <Button size="sm" variant="ghost" className="text-red-500" onClick={() => removeMutation.mutate({ affiliationId: a.id })}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {isClubAdmin && availableCounties.length > 0 && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Request affiliation</p>
            <div className="flex gap-2">
              <Select value={selectedCountyId} onValueChange={setSelectedCountyId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Select a county…" /></SelectTrigger>
                <SelectContent>
                  {availableCounties.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
                disabled={!selectedCountyId || requestMutation.isPending}
                onClick={() => requestMutation.mutate({ club_id: clubId, county_id: selectedCountyId })}
              >
                {requestMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4 mr-1" />Request</>}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}