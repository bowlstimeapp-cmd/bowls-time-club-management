import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Users,
  ShieldAlert,
  Loader2,
  Trash2
} from 'lucide-react';
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function PlatformAdmin() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    rink_count: 6,
    opening_time: '10:00',
    closing_time: '21:00',
    session_duration: 2,
    primary_admin_email: '',
    is_active: true,
    module_rink_booking: true,
    module_selection: true,
    module_competitions: true,
    module_leagues: true
  });

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['allClubs'],
    queryFn: () => base44.entities.Club.list('-created_date'),
  });

  const createClubMutation = useMutation({
    mutationFn: async (clubData) => {
      const club = await base44.entities.Club.create(clubData);
      // Auto-create admin membership for primary admin
      await base44.entities.ClubMembership.create({
        club_id: club.id,
        user_email: clubData.primary_admin_email,
        user_name: clubData.primary_admin_email,
        role: 'admin',
        status: 'approved'
      });
      return club;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allClubs'] });
      toast.success('Club created successfully');
      handleCloseDialog();
    },
  });

  const updateClubMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Club.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allClubs'] });
      toast.success('Club updated successfully');
      handleCloseDialog();
    },
  });

  const deleteClubMutation = useMutation({
    mutationFn: (id) => base44.entities.Club.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allClubs'] });
      toast.success('Club deleted');
    },
  });

  // Check if user is platform admin
  if (user && user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
            <ShieldAlert className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">Platform admin access required.</p>
          <Link to={createPageUrl('ClubSelector')}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Club Selection
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingClub(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      rink_count: 6,
      opening_time: '10:00',
      closing_time: '21:00',
      session_duration: 2,
      primary_admin_email: '',
      is_active: true,
      module_rink_booking: true,
      module_selection: true,
      module_competitions: true,
      module_leagues: true
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (club) => {
    setEditingClub(club);
    setFormData({
      name: club.name,
      slug: club.slug,
      description: club.description || '',
      rink_count: club.rink_count || 6,
      opening_time: club.opening_time || '10:00',
      closing_time: club.closing_time || '21:00',
      session_duration: club.session_duration || 2,
      primary_admin_email: club.primary_admin_email,
      is_active: club.is_active !== false,
      module_rink_booking: club.module_rink_booking !== false,
      module_selection: club.module_selection !== false,
      module_competitions: club.module_competitions !== false,
      module_leagues: club.module_leagues !== false
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingClub(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const slug = formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const data = { ...formData, slug };

    if (editingClub) {
      updateClubMutation.mutate({ id: editingClub.id, data });
    } else {
      createClubMutation.mutate(data);
    }
  };

  const generateSlug = (name) => {
    return name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">
              Platform Administration
            </h1>
            <p className="text-gray-600">Manage clubs and platform settings</p>
          </div>
          <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" />
            Add New Club
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <Building2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clubs.length}</p>
                <p className="text-sm text-gray-500">Total Clubs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clubs.filter(c => c.is_active !== false).length}</p>
                <p className="text-sm text-gray-500">Active Clubs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <Building2 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{clubs.filter(c => c.is_active === false).length}</p>
                <p className="text-sm text-gray-500">Inactive Clubs</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Club List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>All Clubs</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : clubs.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No clubs yet. Create your first club!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {clubs.map(club => (
                    <div 
                      key={club.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900">{club.name}</h3>
                            <Badge variant={club.is_active !== false ? "default" : "secondary"}>
                              {club.is_active !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-500">
                            {club.rink_count} rinks • Admin: {club.primary_admin_email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleOpenEdit(club)}
                        >
                          <Pencil className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteClubMutation.mutate(club.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingClub ? 'Edit Club' : 'Create New Club'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Club Name *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    })}
                    placeholder="e.g., Springfield Bowls Club"
                    required
                  />
                </div>
                <div className="col-span-2">
                  <Label>URL Slug</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    placeholder="springfield-bowls-club"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Primary Admin Email *</Label>
                  <Input
                    type="email"
                    value={formData.primary_admin_email}
                    onChange={(e) => setFormData({ ...formData, primary_admin_email: e.target.value })}
                    placeholder="admin@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This user will have admin rights for this club
                  </p>
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Brief description of the club..."
                    rows={2}
                  />
                </div>
                <div>
                  <Label>Number of Rinks</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={formData.rink_count}
                    onChange={(e) => setFormData({ ...formData, rink_count: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Session Duration (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={formData.session_duration}
                    onChange={(e) => setFormData({ ...formData, session_duration: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Opening Time</Label>
                  <Input
                    type="time"
                    value={formData.opening_time}
                    onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Closing Time</Label>
                  <Input
                    type="time"
                    value={formData.closing_time}
                    onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <Label>Club Active</Label>
                  <Switch
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
                
                <div className="col-span-2 pt-4 border-t">
                  <Label className="text-base font-medium mb-3 block">Enabled Modules</Label>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Rink Booking</Label>
                      <Switch
                        checked={formData.module_rink_booking}
                        onCheckedChange={(checked) => setFormData({ ...formData, module_rink_booking: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Match Selection</Label>
                      <Switch
                        checked={formData.module_selection}
                        onCheckedChange={(checked) => setFormData({ ...formData, module_selection: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Competitions</Label>
                      <Switch
                        checked={formData.module_competitions}
                        onCheckedChange={(checked) => setFormData({ ...formData, module_competitions: checked })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="font-normal">Leagues</Label>
                      <Switch
                        checked={formData.module_leagues}
                        onCheckedChange={(checked) => setFormData({ ...formData, module_leagues: checked })}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={createClubMutation.isPending || updateClubMutation.isPending}
                >
                  {(createClubMutation.isPending || updateClubMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingClub ? 'Save Changes' : 'Create Club'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}