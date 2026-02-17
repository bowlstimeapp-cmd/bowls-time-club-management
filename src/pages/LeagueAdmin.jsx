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
  UserCircle,
  Calendar,
  Clock,
  Zap,
  List
} from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO, addDays, eachWeekOfInterval, isBefore } from 'date-fns';

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
  const [leagueStartDate, setLeagueStartDate] = useState('');
  const [leagueEndDate, setLeagueEndDate] = useState('');
  const [leagueStartTime, setLeagueStartTime] = useState('18:00');
  const [leagueEndTime, setLeagueEndTime] = useState('21:00');

  const [teamName, setTeamName] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');

  const [generatingFixtures, setGeneratingFixtures] = useState(false);
  const [fixturesDialogOpen, setFixturesDialogOpen] = useState(false);
  const [viewingLeague, setViewingLeague] = useState(null);

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

  const { data: fixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
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
    setLeagueStartDate('');
    setLeagueEndDate('');
    setLeagueStartTime('18:00');
    setLeagueEndTime('21:00');
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
    setLeagueStartDate(league.start_date || '');
    setLeagueEndDate(league.end_date || '');
    setLeagueStartTime(league.start_time || '18:00');
    setLeagueEndTime(league.end_time || '21:00');
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
      start_date: leagueStartDate || null,
      end_date: leagueEndDate || null,
      start_time: leagueStartTime || null,
      end_time: leagueEndTime || null,
    };

    if (editingLeague) {
      updateLeagueMutation.mutate({ id: editingLeague.id, data });
    } else {
      createLeagueMutation.mutate(data);
    }
  };

  const generateRoundRobinFixtures = (leagueTeams) => {
    const numTeams = leagueTeams.length;
    if (numTeams < 2) return [];
    
    // Add bye if odd number of teams
    const teamsList = [...leagueTeams];
    if (numTeams % 2 !== 0) {
      teamsList.push({ id: 'BYE', name: 'BYE' });
    }
    
    const n = teamsList.length;
    const rounds = [];
    
    // Round robin algorithm
    for (let round = 0; round < n - 1; round++) {
      const roundMatches = [];
      for (let match = 0; match < n / 2; match++) {
        const home = (round + match) % (n - 1);
        let away = (n - 1 - match + round) % (n - 1);
        
        if (match === 0) {
          away = n - 1;
        }
        
        const homeTeam = teamsList[home];
        const awayTeam = teamsList[away];
        
        // Skip matches with BYE
        if (homeTeam.id !== 'BYE' && awayTeam.id !== 'BYE') {
          roundMatches.push({
            home_team_id: homeTeam.id,
            away_team_id: awayTeam.id,
          });
        }
      }
      rounds.push(roundMatches);
    }
    
    return rounds;
  };

  const handleGenerateFixtures = async (league) => {
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    
    if (leagueTeams.length < 2) {
      toast.error('Need at least 2 teams to generate fixtures');
      return;
    }
    
    if (!league.start_date || !league.end_date) {
      toast.error('Please set league start and end dates first');
      return;
    }
    
    setGeneratingFixtures(true);
    
    // Get available weeks
    const startDate = parseISO(league.start_date);
    const endDate = parseISO(league.end_date);
    const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
    
    // Generate round robin schedule
    const rounds = generateRoundRobinFixtures(leagueTeams);
    
    // Calculate how many times to repeat the schedule
    const totalRounds = rounds.length;
    const availableWeeks = weeks.length;
    const repetitions = Math.floor(availableWeeks / totalRounds);
    
    // Flatten all matches with dates and rinks
    const rinkCount = club?.rink_count || 6;
    const allFixtures = [];
    const rinkUsage = {}; // Track rink usage per team
    
    leagueTeams.forEach(team => {
      rinkUsage[team.id] = {};
      for (let r = 1; r <= rinkCount; r++) {
        rinkUsage[team.id][r] = 0;
      }
    });
    
    let weekIndex = 0;
    for (let rep = 0; rep < repetitions && weekIndex < availableWeeks; rep++) {
      for (let roundIdx = 0; roundIdx < rounds.length && weekIndex < availableWeeks; roundIdx++) {
        const round = rounds[roundIdx];
        const matchDate = weeks[weekIndex];
        
        // Assign rinks to matches, balancing usage
        const matchesThisWeek = round.map((match, matchIdx) => {
          // Find the best rink for this match (least used by both teams)
          let bestRink = 1;
          let lowestUsage = Infinity;
          
          for (let r = 1; r <= rinkCount; r++) {
            const totalUsage = (rinkUsage[match.home_team_id][r] || 0) + 
                              (rinkUsage[match.away_team_id][r] || 0);
            if (totalUsage < lowestUsage) {
              lowestUsage = totalUsage;
              bestRink = r;
            }
          }
          
          // Update usage
          rinkUsage[match.home_team_id][bestRink]++;
          rinkUsage[match.away_team_id][bestRink]++;
          
          return {
            league_id: league.id,
            club_id: clubId,
            home_team_id: match.home_team_id,
            away_team_id: match.away_team_id,
            match_date: format(matchDate, 'yyyy-MM-dd'),
            rink_number: bestRink,
            status: 'scheduled',
          };
        });
        
        allFixtures.push(...matchesThisWeek);
        weekIndex++;
      }
    }
    
    // Create fixtures and bookings
    const bookingsToCreate = [];
    
    for (const fixture of allFixtures) {
      // Create booking for the rink
      bookingsToCreate.push({
        club_id: clubId,
        rink_number: fixture.rink_number,
        date: fixture.match_date,
        start_time: league.start_time || '18:00',
        end_time: league.end_time || '21:00',
        status: 'approved',
        competition_type: 'Club',
        booker_name: `${league.name} - League Match`,
        booker_email: user.email,
        notes: `League fixture: ${leagueTeams.find(t => t.id === fixture.home_team_id)?.name} vs ${leagueTeams.find(t => t.id === fixture.away_team_id)?.name}`,
      });
    }
    
    // Bulk create bookings
    const createdBookings = await base44.entities.Booking.bulkCreate(bookingsToCreate);
    
    // Add booking IDs to fixtures
    const fixturesWithBookings = allFixtures.map((fixture, idx) => ({
      ...fixture,
      booking_id: createdBookings[idx]?.id || null,
    }));
    
    // Bulk create fixtures
    await base44.entities.LeagueFixture.bulkCreate(fixturesWithBookings);
    
    // Update league to mark fixtures as generated
    await base44.entities.League.update(league.id, { fixtures_generated: true });
    
    queryClient.invalidateQueries({ queryKey: ['leagueFixtures', clubId] });
    queryClient.invalidateQueries({ queryKey: ['leagues', clubId] });
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    
    setGeneratingFixtures(false);
    toast.success(`Generated ${allFixtures.length} fixtures and created rink bookings`);
  };

  const viewFixtures = (league) => {
    setViewingLeague(league);
    setFixturesDialogOpen(true);
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
                            {league.start_date && league.end_date && (
                              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {format(parseISO(league.start_date), 'd MMM')} - {format(parseISO(league.end_date), 'd MMM yyyy')}
                                </span>
                                {league.start_time && league.end_time && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {league.start_time} - {league.end_time}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!league.fixtures_generated && leagueTeams.length >= 2 && league.start_date && league.end_date && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleGenerateFixtures(league)}
                              disabled={generatingFixtures}
                              className="text-emerald-600 hover:bg-emerald-50"
                            >
                              {generatingFixtures ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Zap className="w-4 h-4" />
                              )}
                              <span className="ml-1 hidden sm:inline">Generate</span>
                            </Button>
                          )}
                          {league.fixtures_generated && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => viewFixtures(league)}
                            >
                              <List className="w-4 h-4" />
                              <span className="ml-1 hidden sm:inline">Fixtures</span>
                            </Button>
                          )}
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={leagueStartDate}
                    onChange={(e) => setLeagueStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={leagueEndDate}
                    onChange={(e) => setLeagueEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Match Start Time</Label>
                  <Input
                    type="time"
                    value={leagueStartTime}
                    onChange={(e) => setLeagueStartTime(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Match End Time</Label>
                  <Input
                    type="time"
                    value={leagueEndTime}
                    onChange={(e) => setLeagueEndTime(e.target.value)}
                  />
                </div>
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

        {/* Fixtures Dialog */}
        <Dialog open={fixturesDialogOpen} onOpenChange={() => setFixturesDialogOpen(false)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{viewingLeague?.name} - Fixtures</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {viewingLeague && fixtures
                .filter(f => f.league_id === viewingLeague.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date))
                .map(fixture => {
                  const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                  const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                  return (
                    <div key={fixture.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-500 w-24">
                          {format(parseISO(fixture.match_date), 'd MMM yyyy')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{homeTeam?.name || 'Unknown'}</span>
                          <span className="text-gray-400">vs</span>
                          <span className="font-medium">{awayTeam?.name || 'Unknown'}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Rink {fixture.rink_number}</Badge>
                        {fixture.status === 'completed' && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            {fixture.home_score} - {fixture.away_score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              {viewingLeague && fixtures.filter(f => f.league_id === viewingLeague.id).length === 0 && (
                <p className="text-center text-gray-500 py-4">No fixtures generated yet</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}