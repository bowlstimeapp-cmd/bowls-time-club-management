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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Building2, 
  Plus, 
  Pencil, 
  Users,
  ShieldAlert,
  Loader2,
  Trash2,
  ShieldCheck,
  Trophy,
  MessageSquare,
  BookOpen,
  UserX,
  CheckCircle,
  Clock,
  UsersRound,
  Mail,
  MoreVertical,
  ChevronDown
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Link, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import ManageClubAdminsDialog from '@/components/admin/ManageClubAdminsDialog';
import MarketingPDFGenerator from '@/components/admin/MarketingPDFGenerator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PlatformAdmin() {
  const [searchParams] = useSearchParams();
  const manageAdminsClubId = searchParams.get('manageAdmins');
  
  const [user, setUser] = useState(null);
  const [emailLogFilter, setEmailLogFilter] = useState('');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [feedbackResponse, setFeedbackResponse] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClub, setEditingClub] = useState(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [resetClub, setResetClub] = useState(null);
  const [resetting, setResetting] = useState(false);
  const [manageAdminsDialogOpen, setManageAdminsDialogOpen] = useState(false);
  const [managingAdminsClub, setManagingAdminsClub] = useState(null);
  const [competitionModalOpen, setCompetitionModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    players_per_rink: 4,
    home_rinks: 2,
    away_rinks: 0,
    season: ''
  });
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    season: 'indoor',
    rink_count: 6,
    opening_time: '10:00',
    closing_time: '21:00',
    session_duration: 2,
    primary_admin_email: '',
    admin_first_name: '',
    admin_surname: '',
    is_active: true,
    module_rink_booking: true,
    module_selection: true,
    module_competitions: true,
    module_leagues: true,
    module_sms_notifications: false
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

  const { data: feedbacks = [], isLoading: feedbacksLoading } = useQuery({
    queryKey: ['allFeedback'],
    queryFn: () => base44.entities.Feedback.list('-created_date'),
  });

  const { data: platformCompetitions = [] } = useQuery({
    queryKey: ['platformCompetitions'],
    queryFn: async () => {
      const allComps = await base44.entities.Competition.list();
      return allComps.filter(c => !c.club_id);
    },
  });

  const { data: deletionRequests = [], isLoading: deletionRequestsLoading } = useQuery({
    queryKey: ['deletionRequests'],
    queryFn: () => base44.entities.DeletionRequest.list('-requested_date'),
  });

  const { data: emailLogs = [], isLoading: emailLogsLoading } = useQuery({
    queryKey: ['emailLogs'],
    queryFn: () => base44.entities.EmailLog.list('-created_date', 200),
  });

  useEffect(() => {
    if (manageAdminsClubId && clubs.length > 0) {
      const club = clubs.find(c => c.id === manageAdminsClubId);
      if (club) {
        setManagingAdminsClub(club);
        setManageAdminsDialogOpen(true);
      }
    }
  }, [manageAdminsClubId, clubs]);

  const createClubMutation = useMutation({
    mutationFn: async (clubData) => {
      const { admin_first_name, admin_surname, ...clubFields } = clubData;
      const club = await base44.entities.Club.create(clubFields);
      const adminName = admin_first_name && admin_surname 
        ? `${admin_first_name} ${admin_surname}` 
        : clubData.primary_admin_email;
      await base44.entities.ClubMembership.create({
        club_id: club.id,
        user_email: clubData.primary_admin_email,
        user_name: adminName,
        first_name: admin_first_name || '',
        surname: admin_surname || '',
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

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Feedback.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allFeedback'] });
      toast.success('Feedback updated');
    },
  });

  const createCompetitionMutation = useMutation({
    mutationFn: (data) => base44.entities.Competition.create({ ...data, club_id: null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformCompetitions'] });
      toast.success('Platform competition created');
      setCompetitionModalOpen(false);
      resetCompetitionForm();
    },
  });

  const updateCompetitionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Competition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformCompetitions'] });
      toast.success('Competition updated');
      setCompetitionModalOpen(false);
      setEditingCompetition(null);
      resetCompetitionForm();
    },
  });

  const deleteCompetitionMutation = useMutation({
    mutationFn: (id) => base44.entities.Competition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformCompetitions'] });
      toast.success('Competition deleted');
    },
  });

  const updateDeletionRequestMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeletionRequest.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletionRequests'] });
      toast.success('Deletion request updated');
    },
  });

  const dismissDeletionRequestMutation = useMutation({
    mutationFn: (id) => base44.entities.DeletionRequest.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deletionRequests'] });
      toast.success('Request dismissed');
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
            <Button className="bg-emerald-600 hover:bg-emerald-700">Go to Club Selection</Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleOpenCreate = () => {
    setEditingClub(null);
    setFormData({
      name: '', slug: '', description: '', season: 'indoor', rink_count: 6,
      opening_time: '10:00', closing_time: '21:00', session_duration: 2,
      primary_admin_email: '', admin_first_name: '', admin_surname: '',
      is_active: true, module_rink_booking: true, module_selection: true,
      module_competitions: true, module_leagues: true, module_sms_notifications: false,
      module_homepage: false, module_function_rooms: false, module_custom_branding: false
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (club) => {
    setEditingClub(club);
    setFormData({
      name: club.name, slug: club.slug, description: club.description || '',
      season: club.season || 'indoor', rink_count: club.rink_count || 6,
      opening_time: club.opening_time || '10:00', closing_time: club.closing_time || '21:00',
      session_duration: club.session_duration || 2, primary_admin_email: club.primary_admin_email,
      admin_first_name: '', admin_surname: '', is_active: club.is_active !== false,
      module_rink_booking: club.module_rink_booking !== false,
      module_selection: club.module_selection !== false,
      module_competitions: club.module_competitions !== false,
      module_leagues: club.module_leagues !== false,
      module_sms_notifications: club.module_sms_notifications || false,
      module_homepage: club.module_homepage || false,
      module_function_rooms: club.module_function_rooms || false,
      module_custom_branding: club.module_custom_branding || false
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

  const generateSlug = (name) => name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const resetCompetitionForm = () => {
    setCompetitionForm({ name: '', players_per_rink: 4, home_rinks: 2, away_rinks: 0, season: 'indoor' });
  };

  const handleEditCompetition = (competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      name: competition.name, players_per_rink: competition.players_per_rink,
      home_rinks: competition.home_rinks, away_rinks: competition.away_rinks || 0,
      season: competition.season || 'indoor'
    });
    setCompetitionModalOpen(true);
  };

  const handleSaveCompetition = () => {
    if (!competitionForm.name.trim()) { toast.error('Please enter a competition name'); return; }
    if (editingCompetition) {
      updateCompetitionMutation.mutate({ id: editingCompetition.id, data: competitionForm });
    } else {
      createCompetitionMutation.mutate(competitionForm);
    }
  };

  const handleResetClubData = async () => {
    if (!resetClub) return;
    setResetting(true);
    const clubId = resetClub.id;
    try {
      // Fetch all related records in parallel
      const [competitions, selections, leagues, leagueTeams] = await Promise.all([
        base44.entities.Competition.filter({ club_id: clubId }),
        base44.entities.TeamSelection.filter({ club_id: clubId }),
        base44.entities.League.filter({ club_id: clubId }),
        base44.entities.LeagueTeam.filter({ club_id: clubId }),
      ]);

      // Delete everything in parallel
      await Promise.all([
        ...competitions.map(c => base44.entities.Competition.delete(c.id)),
        ...selections.map(s => base44.entities.TeamSelection.delete(s.id)),
        ...leagueTeams.map(t => base44.entities.LeagueTeam.delete(t.id)),
        ...leagues.map(l => base44.entities.League.delete(l.id)),
      ]);

      toast.success(`Reset complete: removed ${competitions.length} competitions, ${selections.length} selections, ${leagues.length} leagues and ${leagueTeams.length} team entries.`);
    } catch (err) {
      toast.error('Reset failed: ' + err.message);
    }
    setResetting(false);
    setResetConfirmOpen(false);
    setResetClub(null);
  };

  const pendingDeletions = deletionRequests.filter(r => r.status === 'pending');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Platform Administration</h1>
            <p className="text-gray-600">Manage clubs and platform settings</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Desktop: show all buttons */}
            <div className="hidden sm:flex gap-2 flex-wrap">
              <MarketingPDFGenerator />
              <Link to={createPageUrl('ProspectCRM')}>
                <Button variant="outline" className="border-purple-600 text-purple-600 hover:bg-purple-50">
                  <Users className="w-4 h-4 mr-2" />Prospect CRM
                </Button>
              </Link>
              <Link to={createPageUrl('PlatformUsers')}>
                <Button variant="outline" className="border-blue-600 text-blue-600 hover:bg-blue-50">
                  <UsersRound className="w-4 h-4 mr-2" />All Users
                </Button>
              </Link>
              <Link to={createPageUrl('UserGuides')}>
                <Button variant="outline" className="border-emerald-600 text-emerald-600 hover:bg-emerald-50">
                  <BookOpen className="w-4 h-4 mr-2" />User Guides
                </Button>
              </Link>
            </div>
            {/* Mobile: dropdown for secondary actions */}
            <div className="sm:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="w-4 h-4 mr-1" />More
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild><Link to={createPageUrl('ProspectCRM')} className="cursor-pointer"><Users className="w-4 h-4 mr-2" />Prospect CRM</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('PlatformUsers')} className="cursor-pointer"><UsersRound className="w-4 h-4 mr-2" />All Users</Link></DropdownMenuItem>
                  <DropdownMenuItem asChild><Link to={createPageUrl('UserGuides')} className="cursor-pointer"><BookOpen className="w-4 h-4 mr-2" />User Guides</Link></DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-700" size="sm">
              <Plus className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Add New Club</span>
              <span className="sm:hidden">Add Club</span>
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8"
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
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <UserX className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingDeletions.length}</p>
                <p className="text-sm text-gray-500">Pending Deletions</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="clubs" className="w-full">
            <div className="overflow-x-auto mb-6">
              <TabsList className="inline-flex w-auto min-w-full sm:grid sm:grid-cols-5">
                <TabsTrigger value="clubs" className="whitespace-nowrap">Clubs</TabsTrigger>
                <TabsTrigger value="competitions" className="whitespace-nowrap">Competitions</TabsTrigger>
                <TabsTrigger value="feedback" className="whitespace-nowrap">Feedback ({feedbacks.length})</TabsTrigger>
                <TabsTrigger value="deletions" className="relative whitespace-nowrap">
                  <span className="hidden sm:inline">Account Deletions</span>
                  <span className="sm:hidden">Deletions</span>
                  {pendingDeletions.length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                      {pendingDeletions.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="emails" className="whitespace-nowrap">Sent Emails</TabsTrigger>
              </TabsList>
            </div>

            {/* ── CLUBS ── */}
            <TabsContent value="clubs">
              <Card>
                <CardHeader><CardTitle>All Clubs</CardTitle></CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                  ) : clubs.length === 0 ? (
                    <div className="text-center py-12">
                      <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No clubs yet. Create your first club!</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {clubs.map(club => (
                        <div key={club.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-gray-900 truncate">{club.name}</h3>
                                <Badge variant={club.is_active !== false ? "default" : "secondary"} className="flex-shrink-0">
                                  {club.is_active !== false ? 'Active' : 'Inactive'}
                                </Badge>
                              </div>
                              <p className="text-xs text-gray-500 truncate">{club.rink_count} rinks • {club.primary_admin_email}</p>
                            </div>
                          </div>
                          {/* Desktop actions */}
                          <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                            <Button variant="outline" size="sm" onClick={() => { setManagingAdminsClub(club); setManageAdminsDialogOpen(true); }}>
                              <ShieldCheck className="w-4 h-4 mr-1" />Admins
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleOpenEdit(club)}>
                              <Pencil className="w-4 h-4 mr-1" />Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteClubMutation.mutate(club.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          {/* Mobile dropdown */}
                          <div className="sm:hidden flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm"><MoreVertical className="w-4 h-4" /></Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => { setManagingAdminsClub(club); setManageAdminsDialogOpen(true); }}>
                                  <ShieldCheck className="w-4 h-4 mr-2" />Admins
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenEdit(club)}>
                                  <Pencil className="w-4 h-4 mr-2" />Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteClubMutation.mutate(club.id)} className="text-red-600">
                                  <Trash2 className="w-4 h-4 mr-2" />Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── COMPETITIONS ── */}
            <TabsContent value="competitions">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Platform Competitions</CardTitle>
                    <Button size="sm" onClick={() => { resetCompetitionForm(); setEditingCompetition(null); setCompetitionModalOpen(true); }} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-2" />Add Competition
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {platformCompetitions.length === 0 ? (
                    <div className="text-center py-12">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No platform-wide competitions defined yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {platformCompetitions.map(comp => (
                        <div key={comp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div>
                            <p className="font-medium text-lg">{comp.name}</p>
                            <div className="flex gap-4 mt-1 text-sm text-gray-600">
                              <span>{comp.players_per_rink} players per rink</span>
                              <span>•</span>
                              <span>{comp.home_rinks} home rink{comp.home_rinks !== 1 ? 's' : ''}</span>
                              <span>•</span>
                              <span>{comp.away_rinks || 0} away rink{comp.away_rinks !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleEditCompetition(comp)}>
                              <Pencil className="w-4 h-4 mr-1" />Edit
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => deleteCompetitionMutation.mutate(comp.id)} className="text-red-600 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── FEEDBACK ── */}
            <TabsContent value="feedback">
              <Card>
                <CardHeader><CardTitle>User Feedback</CardTitle></CardHeader>
                <CardContent>
                  {feedbacksLoading ? (
                    <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                  ) : feedbacks.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No feedback submitted yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Category</th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Title</th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">User</th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Status</th>
                            <th className="text-left py-3 px-2 text-sm font-medium text-gray-500">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {feedbacks.map(feedback => (
                            <tr key={feedback.id} className="border-b last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedFeedback(feedback)}>
                              <td className="py-3 px-2">
                                <Badge variant={feedback.category === 'bug' ? 'destructive' : feedback.category === 'feature' ? 'default' : 'secondary'}>
                                  {feedback.category}
                                </Badge>
                              </td>
                              <td className="py-3 px-2 font-medium">{feedback.title}</td>
                              <td className="py-3 px-2 text-sm">
                                <div>{feedback.user_name}</div>
                                <div className="text-xs text-gray-500">{feedback.user_email}</div>
                              </td>
                              <td className="py-3 px-2" onClick={e => e.stopPropagation()}>
                                <Select value={feedback.status || 'new_feedback'} onValueChange={(value) => updateFeedbackMutation.mutate({ id: feedback.id, data: { status: value } })}>
                                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="new_feedback">New Feedback</SelectItem>
                                    <SelectItem value="reviewed">Reviewed</SelectItem>
                                    <SelectItem value="implemented">Implemented</SelectItem>
                                    <SelectItem value="abandoned">Abandoned</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-2 text-sm text-gray-500">{new Date(feedback.created_date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── SENT EMAILS ── */}
            <TabsContent value="emails">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-500" />
                      Sent Emails Log
                    </CardTitle>
                    <Input
                      placeholder="Filter by email or club..."
                      value={emailLogFilter}
                      onChange={e => setEmailLogFilter(e.target.value)}
                      className="w-64"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {emailLogsLoading ? (
                    <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
                  ) : emailLogs.length === 0 ? (
                    <div className="text-center py-12">
                      <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No emails logged yet. Emails will appear here when selections are published.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-2 px-2 font-medium text-gray-500">Date</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-500">Club</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-500">Recipient</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-500">Match</th>
                            <th className="text-left py-2 px-2 font-medium text-gray-500">Sent By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {emailLogs
                            .filter(log => {
                              if (!emailLogFilter) return true;
                              const f = emailLogFilter.toLowerCase();
                              return (
                                log.to_email?.toLowerCase().includes(f) ||
                                log.club_name?.toLowerCase().includes(f) ||
                                log.to_name?.toLowerCase().includes(f) ||
                                log.related_label?.toLowerCase().includes(f)
                              );
                            })
                            .map(log => (
                              <tr key={log.id} className="border-b last:border-0 hover:bg-gray-50">
                                <td className="py-2 px-2 text-gray-500 whitespace-nowrap">
                                  {new Date(log.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  <div className="text-xs text-gray-400">{new Date(log.created_date).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</div>
                                </td>
                                <td className="py-2 px-2 font-medium">{log.club_name || '—'}</td>
                                <td className="py-2 px-2">
                                  <div>{log.to_name}</div>
                                  <div className="text-xs text-gray-500">{log.to_email}</div>
                                </td>
                                <td className="py-2 px-2 text-gray-600 max-w-xs truncate">{log.related_label || log.subject}</td>
                                <td className="py-2 px-2 text-xs text-gray-500">{log.sent_by || '—'}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                      </table>
                      <p className="text-xs text-gray-400 mt-3">Showing up to 200 most recent emails</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ── DELETION REQUESTS ── */}
            <TabsContent value="deletions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserX className="w-5 h-5 text-red-500" />
                    Account Deletion Requests
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {deletionRequestsLoading ? (
                    <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
                  ) : deletionRequests.length === 0 ? (
                    <div className="text-center py-12">
                      <UserX className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">No deletion requests</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {deletionRequests.map(request => (
                        <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${request.status === 'completed' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                              {request.status === 'completed'
                                ? <CheckCircle className="w-5 h-5 text-emerald-600" />
                                : <Clock className="w-5 h-5 text-red-500" />
                              }
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{request.user_name}</p>
                              <p className="text-sm text-gray-500">{request.user_email}</p>
                              <p className="text-xs text-gray-400 mt-0.5">
                                Requested {new Date(request.requested_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <Badge className={request.status === 'completed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}>
                              {request.status === 'completed' ? 'Completed' : 'Pending'}
                            </Badge>
                            {request.status === 'pending' && (
                              <Button
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700"
                                onClick={() => updateDeletionRequestMutation.mutate({ id: request.id, data: { status: 'completed', completed_date: new Date().toISOString() } })}
                                disabled={updateDeletionRequestMutation.isPending}
                              >
                                {updateDeletionRequestMutation.isPending
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <><CheckCircle className="w-3.5 h-3.5 mr-1" />Mark Deleted</>
                                }
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => dismissDeletionRequestMutation.mutate(request.id)}
                              className="text-gray-400 hover:text-red-500 hover:bg-red-50"
                              title="Dismiss request"
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
            </TabsContent>
          </Tabs>
        </motion.div>

        {/* Manage Admins Dialog */}
        <ManageClubAdminsDialog
          open={manageAdminsDialogOpen}
          onClose={() => { setManageAdminsDialogOpen(false); setManagingAdminsClub(null); }}
          club={managingAdminsClub}
          isPlatformAdmin={true}
        />

        {/* Create/Edit Club Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>{editingClub ? 'Edit Club' : 'Create New Club'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Club Name *</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })} placeholder="e.g., Springfield Bowls Club" required />
                </div>
                <div className="col-span-2">
                  <Label>URL Slug</Label>
                  <Input value={formData.slug} onChange={(e) => setFormData({ ...formData, slug: e.target.value })} placeholder="springfield-bowls-club" />
                </div>
                <div className="col-span-2">
                  <Label>Primary Admin Email *</Label>
                  <Input type="email" value={formData.primary_admin_email} onChange={(e) => setFormData({ ...formData, primary_admin_email: e.target.value })} placeholder="admin@example.com" required />
                  <p className="text-xs text-gray-500 mt-1">This user will have admin rights for this club</p>
                </div>
                <div>
                  <Label>Admin First Name *</Label>
                  <Input value={formData.admin_first_name || ''} onChange={(e) => setFormData({ ...formData, admin_first_name: e.target.value })} placeholder="John" required={!editingClub} />
                </div>
                <div>
                  <Label>Admin Surname *</Label>
                  <Input value={formData.admin_surname || ''} onChange={(e) => setFormData({ ...formData, admin_surname: e.target.value })} placeholder="Smith" required={!editingClub} />
                </div>
                <div className="col-span-2">
                  <Label>Description</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief description of the club..." rows={2} />
                </div>
                <div className="col-span-2">
                  <Label>Season *</Label>
                  <Select value={formData.season} onValueChange={(value) => setFormData({ ...formData, season: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Number of Rinks</Label>
                  <Input type="number" min="1" max="20" value={formData.rink_count} onChange={(e) => setFormData({ ...formData, rink_count: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Session Duration (hours)</Label>
                  <Input type="number" min="1" max="4" value={formData.session_duration} onChange={(e) => setFormData({ ...formData, session_duration: parseInt(e.target.value) })} />
                </div>
                <div>
                  <Label>Opening Time</Label>
                  <Input type="time" value={formData.opening_time} onChange={(e) => setFormData({ ...formData, opening_time: e.target.value })} />
                </div>
                <div>
                  <Label>Closing Time</Label>
                  <Input type="time" value={formData.closing_time} onChange={(e) => setFormData({ ...formData, closing_time: e.target.value })} />
                </div>
                <div className="col-span-2 flex items-center justify-between">
                  <Label>Club Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                </div>
                <div className="col-span-2 pt-4 border-t">
                  <Label className="text-base font-medium mb-3 block">Enabled Modules</Label>
                  <div className="space-y-3">
                    {[
                      { key: 'module_rink_booking', label: 'Rink Booking' },
                      { key: 'module_selection', label: 'Match Selection' },
                      { key: 'module_competitions', label: 'Competitions' },
                      { key: 'module_leagues', label: 'Leagues' },
                      { key: 'module_sms_notifications', label: 'SMS Notifications' },
                      { key: 'module_homepage', label: 'Club Homepage' },
                      { key: 'module_function_rooms', label: 'Function Room Bookings' },
                      { key: 'module_custom_branding', label: 'Custom Branding (Scorecard Layout)' },
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="font-normal">{label}</Label>
                        <Switch checked={formData[key]} onCheckedChange={(checked) => setFormData({ ...formData, [key]: checked })} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                {editingClub && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-400 text-red-600 hover:bg-red-50 sm:mr-auto"
                    onClick={() => { setResetClub(editingClub); setResetConfirmOpen(true); }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />Reset League/Selection Data
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={handleCloseDialog}>Cancel</Button>
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-700" disabled={createClubMutation.isPending || updateClubMutation.isPending}>
                  {(createClubMutation.isPending || updateClubMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingClub ? 'Save Changes' : 'Create Club'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Club Data Confirmation */}
        <Dialog open={resetConfirmOpen} onOpenChange={setResetConfirmOpen}>
          <DialogContent className="max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle className="text-red-600">Reset Club Data</DialogTitle>
            </DialogHeader>
            <div className="py-2 space-y-3">
              <p className="text-gray-700">
                This will permanently delete all <strong>competitions</strong>, <strong>selections</strong>, <strong>leagues</strong> and <strong>league team entries</strong> for <strong>{resetClub?.name}</strong>.
              </p>
              <p className="text-sm text-red-600 font-medium">This action cannot be undone.</p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setResetConfirmOpen(false); setResetClub(null); }} disabled={resetting}>Cancel</Button>
              <Button className="bg-red-600 hover:bg-red-700" onClick={handleResetClubData} disabled={resetting}>
                {resetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Resetting...</> : <><Trash2 className="w-4 h-4 mr-2" />Yes, Reset Data</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Detail Modal */}
        <Dialog open={!!selectedFeedback} onOpenChange={() => { setSelectedFeedback(null); setFeedbackResponse(''); }}>
          <DialogContent className="max-w-lg mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                Feedback Detail
              </DialogTitle>
            </DialogHeader>
            {selectedFeedback && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={selectedFeedback.category === 'bug' ? 'destructive' : selectedFeedback.category === 'feature' ? 'default' : 'secondary'}>
                    {selectedFeedback.category}
                  </Badge>
                  <span className="text-xs text-gray-400">{new Date(selectedFeedback.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Title</p>
                  <p className="font-semibold text-gray-900">{selectedFeedback.title}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 text-sm">{selectedFeedback.description}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Submitted By</p>
                  <p className="text-gray-900">{selectedFeedback.user_name}</p>
                  <p className="text-sm text-gray-500">{selectedFeedback.user_email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Status</p>
                  <Select
                    value={selectedFeedback.status || 'new_feedback'}
                    onValueChange={(value) => {
                      updateFeedbackMutation.mutate({ id: selectedFeedback.id, data: { status: value } });
                      setSelectedFeedback({ ...selectedFeedback, status: value });
                    }}
                  >
                    <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new_feedback">New Feedback</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="implemented">Implemented</SelectItem>
                      <SelectItem value="abandoned">Abandoned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Admin Response</p>
                  {selectedFeedback.admin_response && (
                    <p className="text-xs text-gray-400 mb-2">Current: <span className="italic text-gray-600">{selectedFeedback.admin_response}</span></p>
                  )}
                  <Textarea
                    value={feedbackResponse}
                    onChange={(e) => setFeedbackResponse(e.target.value)}
                    placeholder="Write a response to the user... (they will see this in their profile)"
                    rows={3}
                    className="text-sm"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setSelectedFeedback(null); setFeedbackResponse(''); }}>Close</Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  updateFeedbackMutation.mutate({ id: selectedFeedback.id, data: { admin_response: feedbackResponse || null } });
                  setSelectedFeedback({ ...selectedFeedback, admin_response: feedbackResponse || null });
                  toast.success('Response saved');
                }}
                disabled={updateFeedbackMutation.isPending}
              >
                {updateFeedbackMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Response'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Competition Modal */}
        <Dialog open={competitionModalOpen} onOpenChange={setCompetitionModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCompetition ? 'Edit Competition' : 'Add Platform Competition'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Competition Name *</Label>
                <Input value={competitionForm.name} onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })} placeholder="e.g., Bramley, Wessex League" />
              </div>
              {[
                { key: 'players_per_rink', label: 'Players per Rink', min: 2, max: 6 },
                { key: 'home_rinks', label: 'Number of Home Rinks', min: 1, max: 6 },
                { key: 'away_rinks', label: 'Number of Away Rinks', min: 0, max: 6 },
              ].map(({ key, label, min, max }) => (
                <div key={key}>
                  <Label>{label}</Label>
                  <Input type="number" min={min} max={max} value={competitionForm[key]} onChange={(e) => setCompetitionForm({ ...competitionForm, [key]: parseInt(e.target.value) })} />
                </div>
              ))}
              <div>
                <Label>Season *</Label>
                <Select value={competitionForm.season} onValueChange={(value) => setCompetitionForm({ ...competitionForm, season: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="indoor">Indoor</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setCompetitionModalOpen(false); setEditingCompetition(null); resetCompetitionForm(); }}>Cancel</Button>
              <Button type="button" className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveCompetition} disabled={createCompetitionMutation.isPending || updateCompetitionMutation.isPending}>
                {(createCompetitionMutation.isPending || updateCompetitionMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCompetition ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}