import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, Save, Users, EyeOff, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import CompetitionFormDialog from '@/components/selection/CompetitionFormDialog';

export default function CompetitionAvailability() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showCompForm, setShowCompForm] = useState(false);
  const [editingComp, setEditingComp] = useState(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryCompId, setSummaryCompId] = useState('');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const m = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return m[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: clubComps = [] } = useQuery({
    queryKey: ['clubCompetitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: platformComps = [] } = useQuery({
    queryKey: ['platformCompetitions'],
    queryFn: async () => {
      const all = await base44.entities.Competition.list();
      return all.filter(c => !c.club_id);
    },
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: myInterest } = useQuery({
    queryKey: ['myCompetitionInterest', clubId, user?.email],
    queryFn: async () => {
      const interests = await base44.entities.CompetitionInterest.filter({ club_id: clubId, user_email: user.email });
      return interests[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: allInterests = [] } = useQuery({
    queryKey: ['allCompetitionInterests', clubId],
    queryFn: () => base44.entities.CompetitionInterest.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  useEffect(() => {
    if (myInterest) {
      setSelectedIds(myInterest.competition_ids || []);
    }
  }, [myInterest]);

  const excludedIds = club?.excluded_platform_competition_ids || [];
  const visiblePlatformComps = platformComps.filter(c => !excludedIds.includes(c.id));
  const hiddenPlatformComps = platformComps.filter(c => excludedIds.includes(c.id));
  const allCompetitions = [...clubComps, ...visiblePlatformComps];
  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const isSelectorOrAdmin = isClubAdmin || membership?.role === 'selector';

  const memberName = user?.first_name && user?.surname
    ? `${user.first_name} ${user.surname}`
    : user?.full_name || user?.email;

  const toggleCompetition = (compId) => {
    setSelectedIds(prev =>
      prev.includes(compId)
        ? prev.filter(id => id !== compId)
        : [...prev, compId]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      if (myInterest) {
        await base44.entities.CompetitionInterest.update(myInterest.id, {
          competition_ids: selectedIds,
          submitted_date: new Date().toISOString(),
        });
      } else {
        await base44.entities.CompetitionInterest.create({
          club_id: clubId,
          user_email: user.email,
          member_name: memberName,
          competition_ids: selectedIds,
          submitted_date: new Date().toISOString(),
        });
      }
      toast.success('Your competition preferences have been saved');
      queryClient.invalidateQueries({ queryKey: ['myCompetitionInterest', clubId, user?.email] });
      queryClient.invalidateQueries({ queryKey: ['allCompetitionInterests', clubId] });
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleCompSave = async (formData) => {
    try {
      if (editingComp) {
        await base44.entities.Competition.update(editingComp.id, formData);
        toast.success('Competition updated');
      } else {
        await base44.entities.Competition.create({ ...formData, club_id: clubId });
        toast.success('Competition created');
      }
      queryClient.invalidateQueries({ queryKey: ['clubCompetitions', clubId] });
      setShowCompForm(false);
      setEditingComp(null);
    } catch (error) {
      toast.error('Failed to save competition');
    }
  };

  const handleCompDelete = async (comp) => {
    if (!window.confirm(`Delete competition "${comp.name}"?`)) return;
    try {
      await base44.entities.Competition.delete(comp.id);
      toast.success('Competition deleted');
      queryClient.invalidateQueries({ queryKey: ['clubCompetitions', clubId] });
    } catch (error) {
      toast.error('Failed to delete competition');
    }
  };

  const handleTogglePlatformExclusion = async (comp, hide) => {
    const current = club?.excluded_platform_competition_ids || [];
    const updated = hide
      ? [...current, comp.id]
      : current.filter(id => id !== comp.id);
    try {
      await base44.functions.invoke('updateClubSettings', { clubId, updates: { excluded_platform_competition_ids: updated } });
      toast.success(hide ? 'Competition hidden from your club' : 'Competition restored');
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
    } catch (error) {
      toast.error('Failed to update');
    }
  };

  const summaryMembers = summaryCompId
    ? allInterests.filter(ci => (ci.competition_ids || []).includes(summaryCompId))
    : [];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Games I Want To Play In</h1>
          <p className="text-sm text-gray-500 mt-1">Select the competitions you'd like to be considered for</p>
        </div>
        {isSelectorOrAdmin && (
          <Button variant="outline" onClick={() => setShowSummary(true)}>
            <Users className="w-4 h-4 mr-2" />
            Summary
          </Button>
        )}
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Competition Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {allCompetitions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">No competitions available yet.</p>
          ) : allCompetitions.map(comp => (
            <div key={comp.id} className="flex items-center gap-3 py-2 border-b last:border-b-0">
              <Checkbox
                checked={selectedIds.includes(comp.id)}
                onCheckedChange={() => toggleCompetition(comp.id)}
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium">{comp.name}</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {comp.season && <Badge variant="outline" className="text-xs capitalize">{comp.season}</Badge>}
                  {comp.gender && comp.gender !== 'mixed' && <Badge variant="outline" className="text-xs capitalize">{comp.gender}</Badge>}
                  {comp.age_group && comp.age_group !== 'n/a' && <Badge variant="outline" className="text-xs uppercase">{comp.age_group}</Badge>}
                </div>
              </div>
              {isClubAdmin && (
                <div className="flex gap-1">
                  {comp.club_id && (
                    <>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingComp(comp); setShowCompForm(true); }}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500" onClick={() => handleCompDelete(comp)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </>
                  )}
                  {!comp.club_id && (
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-gray-500" onClick={() => handleTogglePlatformExclusion(comp, true)} title="Hide from your club">
                      <EyeOff className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
          <Button onClick={handleSubmit} disabled={saving} className="w-full mt-4">
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Submit Preferences
          </Button>
        </CardContent>
      </Card>

      {isClubAdmin && (
        <div className="mb-6">
          <Button onClick={() => { setEditingComp(null); setShowCompForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Competition
          </Button>
        </div>
      )}

      {isClubAdmin && hiddenPlatformComps.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm text-gray-500">Hidden Platform Competitions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {hiddenPlatformComps.map(comp => (
              <div key={comp.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                <span className="text-sm text-gray-500">{comp.name}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleTogglePlatformExclusion(comp, false)} title="Restore to your club">
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <CompetitionFormDialog
        open={showCompForm}
        onClose={() => { setShowCompForm(false); setEditingComp(null); }}
        competition={editingComp}
        onSaved={handleCompSave}
      />

      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Competition Interest Summary</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Select value={summaryCompId} onValueChange={setSummaryCompId}>
              <SelectTrigger><SelectValue placeholder="Select a competition" /></SelectTrigger>
              <SelectContent>
                {allCompetitions.map(comp => (
                  <SelectItem key={comp.id} value={comp.id}>{comp.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {summaryCompId && (
              <div>
                {summaryMembers.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No members have selected this competition yet.</p>
                ) : (
                  <>
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {summaryMembers.map(ci => (
                        <div key={ci.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50">
                          <span className="text-sm font-medium">{ci.member_name || ci.user_email}</span>
                          <span className="text-xs text-gray-500">{ci.user_email}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-sm font-medium mt-3 pt-3 border-t">
                      Total: {summaryMembers.length} member{summaryMembers.length !== 1 ? 's' : ''}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}