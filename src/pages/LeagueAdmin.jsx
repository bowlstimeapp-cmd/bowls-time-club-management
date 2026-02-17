import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { 
  Plus, 
  Trophy, 
  Users, 
  Loader2, 
  ShieldAlert,
  Pencil,
  Trash2,
  UserCircle
} from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function LeagueAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [leagueDialogOpen, setLeagueDialogOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [editingLeague, setEditingLeague] = useState(null);
  const [editingTeam, setEditingTeam] = useState(null);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [deleteLeagueId, setDeleteLeagueId] = useState(null);
  const [deleteTeamId, setDeleteTeamId] = useState(null);

  const [leagueName, setLeagueName] = useState('');
  const [leagueDescription, setLeagueDescription] = useState('');
  const [leagueStatus, setLeagueStatus] = useState('draft');

  const [teamName, setTeamName] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: leagues = [], isLoading: leaguesLoading } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: teams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  // League mutations
  const createLeagueMutation = useMutation({
    mutationFn: (data) => base44.entities.League.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League created');
      resetLeagueForm();
    },
  });

  const updateLeagueMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.League.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League updated');
      resetLeagueForm();
    },
  });

  const deleteLeagueMutation = useMutation({
    mutationFn: (id) => base44.entities.League.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
      toast.success('League deleted');
      setDeleteLeagueId(null);
    },
  });

  // Team mutations
  const createTeamMutation = useMutation({
    mutationFn: (data) => base44.entities.LeagueTeam.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team created');
      resetTeamForm();
    },
  });

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeagueTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team updated');
      resetTeamForm();
    },
  });

  const deleteTeamMutation = useMutation({
    mutationFn: (id) => base44.entities.LeagueTeam.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team deleted');
      setDeleteTeamId(null);
    },
  });

  const resetLeagueForm = () => {
    setLeagueDialogOpen(false);
    setEditingLeague(null);
    setLeagueName('');
    setLeagueDescription('');
    setLeagueStatus('draft');
  };

  const resetTeamForm = () => {
    setTeamDialogOpen(false);
    setEditingTeam(null);
    setTeamName('');
    setCaptainEmail('');
  };

  const handleEditLeague = (league) => {
    setEditingLeague(league);
    setLeagueName(league.name);
    setLeagueDescription(league.description || '');
    setLeagueStatus(league.status || 'draft');
    setLeagueDialogOpen(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setSelectedLeague(leagues.find(l => l.id === team.league_id));
    setTeamName(team.name);
    setCaptainEmail(team.captain_email || '');
    setTeamDialogOpen(true);
  };

  const handleSaveLeague = () => {
    if (!leagueName.trim()) {
      toast.error('Please enter a league name');
      return;
    }

    const data = {
      club_id: clubId,
      name: leagueName.trim(),
      description: leagueDescription.trim(),
      status: leagueStatus,
    };

    if (editingLeague) {
      updateLeagueMutation.mutate({ id: editingLeague.id, data });
    } else {
      createLeagueMutation.mutate(data);
    }
  };

  const handleSaveTeam = () => {
    if (!teamName.trim()) {
      toast.error('Please enter a team name');
      return;
    }
    if (!selectedLeague) {
      toast.error('Please select a league');
      return;
    }

    const captain = members.find(m => m.user_email === captainEmail);
    const captainName = captain 
      ? (captain.first_name && captain.surname ? `${captain.first_name} ${captain.surname}` : captain.user_name || captain.user_email)
      : '';

    const data = {
      league_id: selectedLeague.id,
      club_id: clubId,
      name: teamName.trim(),
      captain_email: captainEmail || null,
      captain_name: captainName || null,
    };

    if (editingTeam) {
      updateTeamMutation.mutate({ id: editingTeam.id, data });
    } else {
      createTeamMutation.mutate(data);
    }
  };

  const openAddTeam = (league) => {
    setSelectedLeague(league);
    setTeamDialogOpen(true);
  };

  if (!clubId) return null;

  if (user && !isClubAdmin) {
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
          <p className="text-gray-600 mb-6">You need club admin privileges to manage leagues.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    active: 'bg-emerald-100 text-emerald-700',
    completed: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">League Management</h1>
              <p className="text-gray-600">{club?.name} • Manage leagues and teams</p>
            </div>
            <Button 
              onClick={() => setLeagueDialogOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              New League
            </Button>
          </div>
        </motion.div>

        {leaguesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : leagues.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No leagues yet</h3>
              <p className="text-gray-500 mb-4">Create your first league to get started</p>
              <Button onClick={() => setLeagueDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create League
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {leagues.map((league) => {
              const leagueTeams = teams.filter(t => t.league_id === league.id);
              return (
                <motion.div
                  key={league.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                          </div>
                          <div>
                            <CardTitle className="flex items-center gap-2">
                              {league.name}
                              <Badge className={statusColors[league.status || 'draft']}>
                                {league.status || 'draft'}
                              </Badge>
                            </CardTitle>
                            {league.description && (
                              <CardDescription>{league.description}</CardDescription>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditLeague(league)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteLeagueId(league.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-medium text-gray-700 flex items-center gap-2">
                          <Users className="w-4 h-4" />
                          Teams ({leagueTeams.length})
                        </h4>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openAddTeam(league)}
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add Team
                        </Button>
                      </div>

                      {leagueTeams.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No teams in this league yet
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {leagueTeams.map((team) => (
                            <div 
                              key={team.id}
                              className="border rounded-lg p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <h5 className="font-medium text-gray-900">{team.name}</h5>
                                  {team.captain_email ? (
                                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                      <UserCircle className="w-4 h-4" />
                                      {team.captain_name || team.captain_email}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 mt-1">No captain assigned</p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => handleEditTeam(team)}
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => setDeleteTeamId(team.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* League Dialog */}
        <Dialog open={leagueDialogOpen} onOpenChange={resetLeagueForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingLeague ? 'Edit League' : 'Create League'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>League Name *</Label>
                <Input
                  value={leagueName}
                  onChange={(e) => setLeagueName(e.target.value)}
                  placeholder="e.g., Winter League 2024"
                />
              </div>
              <div>
                <Label>Description</Label>
                <Input
                  value={leagueDescription}
                  onChange={(e) => setLeagueDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label>Status</Label>
                <Select value={leagueStatus} onValueChange={setLeagueStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetLeagueForm}>Cancel</Button>
              <Button 
                onClick={handleSaveLeague}
                disabled={createLeagueMutation.isPending || updateLeagueMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createLeagueMutation.isPending || updateLeagueMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingLeague ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Team Dialog */}
        <Dialog open={teamDialogOpen} onOpenChange={resetTeamForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTeam ? 'Edit Team' : `Add Team to ${selectedLeague?.name}`}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Team Name *</Label>
                <Input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g., Team A"
                />
              </div>
              <div>
                <Label>Team Captain</Label>
                <Select value={captainEmail} onValueChange={setCaptainEmail}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a captain (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>-- No Captain --</SelectItem>
                    {members.map((member) => (
                      <SelectItem key={member.user_email} value={member.user_email}>
                        {member.first_name && member.surname 
                          ? `${member.first_name} ${member.surname}`
                          : member.user_name || member.user_email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={resetTeamForm}>Cancel</Button>
              <Button 
                onClick={handleSaveTeam}
                disabled={createTeamMutation.isPending || updateTeamMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {(createTeamMutation.isPending || updateTeamMutation.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingTeam ? 'Update' : 'Add Team'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete League Confirmation */}
        <AlertDialog open={!!deleteLeagueId} onOpenChange={() => setDeleteLeagueId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete League?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this league and all its teams. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteLeagueMutation.mutate(deleteLeagueId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Team Confirmation */}
        <AlertDialog open={!!deleteTeamId} onOpenChange={() => setDeleteTeamId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Team?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this team. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTeamMutation.mutate(deleteTeamId)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}