import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Phone, Mail, Award, Plus, Pencil, Trash2, ChevronUp, ChevronDown, User, Shield } from 'lucide-react';
import OfficerEditorDialog from '@/components/officers/OfficerEditorDialog';

function getMemberName(m) {
  const parts = [m.title, m.first_name, m.surname].filter(Boolean);
  return parts.length ? parts.join(' ') : (m.user_name || m.user_email);
}

export default function ClubOfficers() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: officers = [], isLoading } = useQuery({
    queryKey: ['clubOfficers', clubId],
    queryFn: async () => {
      const list = await base44.entities.ClubOfficer.filter({ club_id: clubId });
      return list.sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
    },
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['membersApproved', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved', member_status: 'active' }),
    enabled: !!clubId,
  });

  const isClubAdmin = (myMembership?.role === 'admin' && myMembership?.status === 'approved') || user?.role === 'admin';

  const memberByEmail = (email) => members.find(m => m.user_email === email);

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editingOfficer) {
        await base44.functions.invoke('updateClubData', { entity: 'ClubOfficer', action: 'update', clubId, id: editingOfficer.id, data });
      } else {
        await base44.functions.invoke('updateClubData', { entity: 'ClubOfficer', action: 'create', clubId, data: { ...data, display_order: officers.length } });
      }
      queryClient.invalidateQueries({ queryKey: ['clubOfficers', clubId] });
      setEditorOpen(false);
      setEditingOfficer(null);
    } catch (err) {
      console.error('Save officer failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await base44.functions.invoke('updateClubData', { entity: 'ClubOfficer', action: 'delete', clubId, id: deleteId });
      queryClient.invalidateQueries({ queryKey: ['clubOfficers', clubId] });
      setDeleteId(null);
    } catch (err) {
      console.error('Delete officer failed', err);
    } finally {
      setSaving(false);
    }
  };

  const handleMove = async (index, direction) => {
    const newOrder = [...officers];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= newOrder.length) return;
    [newOrder[index], newOrder[swapIndex]] = [newOrder[swapIndex], newOrder[index]];
    const reorderData = newOrder.map((o, i) => ({ id: o.id, display_order: i }));
    try {
      await base44.functions.invoke('updateClubData', { entity: 'ClubOfficer', action: 'reorder', clubId, data: reorderData });
      queryClient.invalidateQueries({ queryKey: ['clubOfficers', clubId] });
    } catch (err) {
      console.error('Reorder failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-6 h-6 text-emerald-600" />
              <h1 className="text-3xl font-bold text-slate-900">Club Officers</h1>
            </div>
            {club?.name && <p className="text-gray-500">{club.name}</p>}
          </div>
          {isClubAdmin && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={() => { setEditingOfficer(null); setEditorOpen(true); }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Officer
            </Button>
          )}
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}
          </div>
        ) : officers.length === 0 ? (
          <div className="text-center py-20">
            <Award className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No club officers have been added yet</p>
            {isClubAdmin && (
              <Button
                className="mt-4 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => { setEditingOfficer(null); setEditorOpen(true); }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Officer
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {officers.map((officer, index) => {
              const member = officer.member_email ? memberByEmail(officer.member_email) : null;
              return (
                <Card key={officer.id} className="relative overflow-hidden rounded-xl shadow-sm border-slate-200 group">
                  <div className="flex">
                    {/* Left image ~35% */}
                    <div className="w-1/3 flex-shrink-0 bg-slate-100 h-56 sm:h-64">
                      {officer.image_url ? (
                        <img src={officer.image_url} alt={officer.role_title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-12 h-12 text-slate-300" />
                        </div>
                      )}
                    </div>

                    {/* Right content ~65% */}
                    <div className="flex-1 p-4 flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{officer.role_title}</h3>
                        {isClubAdmin && (
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => handleMove(index, 'up')}
                              disabled={index === 0}
                              className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move up"
                            >
                              <ChevronUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMove(index, 'down')}
                              disabled={index === officers.length - 1}
                              className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
                              title="Move down"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingOfficer(officer); setEditorOpen(true); }}
                              className="p-1 rounded text-slate-300 hover:text-slate-600 hover:bg-slate-100"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteId(officer.id)}
                              className="p-1 rounded text-slate-300 hover:text-red-500 hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="h-px bg-slate-200 my-3" />

                      {member ? (
                        <div className="space-y-1.5 flex-1">
                          <p className="font-medium text-slate-800 text-sm">{getMemberName(member)}</p>
                          {member.phone && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <a href={`tel:${member.phone}`} className="hover:text-emerald-600 hover:underline truncate">{member.phone}</a>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-sm text-gray-500">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <a href={`mailto:${member.user_email}`} className="hover:text-emerald-600 hover:underline truncate">{member.user_email}</a>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center">
                          <p className="text-gray-400 italic text-sm">Position vacant</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Dialog */}
      <OfficerEditorDialog
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditingOfficer(null); }}
        onSave={handleSave}
        isLoading={saving}
        members={members}
        editing={editingOfficer}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this officer?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the officer card. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? 'Deleting…' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}