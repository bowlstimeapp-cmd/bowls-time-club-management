import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { toast } from "sonner";

export default function ManageClubAdminsDialog({ open, onClose, club }) {
  const queryClient = useQueryClient();
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminFirstName, setNewAdminFirstName] = useState('');
  const [newAdminSurname, setNewAdminSurname] = useState('');

  const { data: clubAdmins = [] } = useQuery({
    queryKey: ['clubAdmins', club?.id],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: club.id, 
      role: 'admin',
      status: 'approved'
    }),
    enabled: !!club?.id && open,
  });

  const addAdminMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ClubMembership.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['clubMembers'] });
      toast.success('Admin added successfully');
      setNewAdminEmail('');
      setNewAdminFirstName('');
      setNewAdminSurname('');
    },
  });

  const removeAdminMutation = useMutation({
    mutationFn: (membershipId) => base44.entities.ClubMembership.delete(membershipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubAdmins'] });
      queryClient.invalidateQueries({ queryKey: ['clubMembers'] });
      toast.success('Admin removed');
    },
  });

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim() || !newAdminFirstName.trim() || !newAdminSurname.trim()) {
      toast.error('Please enter email, first name, and surname');
      return;
    }

    // Check if already exists
    const existingMemberships = await base44.entities.ClubMembership.filter({
      club_id: club.id,
      user_email: newAdminEmail.trim()
    });

    if (existingMemberships.length > 0) {
      toast.error('This user is already a member of the club');
      return;
    }

    addAdminMutation.mutate({
      club_id: club.id,
      user_email: newAdminEmail.trim(),
      user_name: `${newAdminFirstName.trim()} ${newAdminSurname.trim()}`,
      first_name: newAdminFirstName.trim(),
      surname: newAdminSurname.trim(),
      role: 'admin',
      status: 'approved'
    });
  };

  if (!club) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Manage Club Admins - {club.name}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Admin */}
          <div className="border rounded-lg p-4 space-y-3">
            <Label className="font-medium">Add New Admin</Label>
            <div className="grid grid-cols-1 gap-2">
              <div>
                <Label className="text-xs">Email</Label>
                <Input
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">First Name</Label>
                  <Input
                    value={newAdminFirstName}
                    onChange={(e) => setNewAdminFirstName(e.target.value)}
                    placeholder="John"
                  />
                </div>
                <div>
                  <Label className="text-xs">Surname</Label>
                  <Input
                    value={newAdminSurname}
                    onChange={(e) => setNewAdminSurname(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
            </div>
            <Button 
              onClick={handleAddAdmin}
              disabled={addAdminMutation.isPending}
              className="w-full"
            >
              {addAdminMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add Admin
            </Button>
          </div>

          {/* Current Admins */}
          <div>
            <Label className="font-medium mb-3 block">Current Admins ({clubAdmins.length})</Label>
            {clubAdmins.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No admins found</p>
            ) : (
              <div className="space-y-2">
                {clubAdmins.map(admin => (
                  <div key={admin.id} className="border rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="font-medium text-sm">
                          {admin.first_name && admin.surname 
                            ? `${admin.first_name} ${admin.surname}`
                            : admin.user_name || admin.user_email}
                        </span>
                        {admin.user_email === club.primary_admin_email && (
                          <Badge variant="outline" className="text-xs">Primary</Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{admin.user_email}</div>
                    </div>
                    {admin.user_email !== club.primary_admin_email && (
                      <button
                        onClick={() => removeAdminMutation.mutate(admin.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={removeAdminMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="bg-emerald-600 hover:bg-emerald-700">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}