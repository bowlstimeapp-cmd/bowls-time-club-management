import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trophy, 
  Users, 
  Loader2,
  UserCircle,
  Trash2,
  Calendar,
  Zap,
  Printer,
  Table,
  Phone,
  Pencil,
  BarChart3
} from 'lucide-react';
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';

export default function MyLeagueTeam() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const printRef = useRef();

  const [user, setUser] = useState(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [rotaDialogOpen, setRotaDialogOpen] = useState(false);
  const [viewingRotaTeam, setViewingRotaTeam] = useState(null);
  const [generatingRota, setGeneratingRota] = useState(false);
  const [editRotaDialogOpen, setEditRotaDialogOpen] = useState(false);
  const [editingRotaTeam, setEditingRotaTeam] = useState(null);

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

  const { data: teams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: fixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
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

  // Find teams where user is captain or a player
  const [selectedLeagueFilter, setSelectedLeagueFilter] = useState('all');
  
  const captainTeams = teams.filter(t => t.captain_email === user?.email);
  const playerTeams = teams.filter(t => 
    t.captain_email !== user?.email && 
    (t.players || []).includes(user?.email)
  );
  const myTeams = [...captainTeams, ...playerTeams];
  
  // Get unique leagues from my teams
  const myLeagueIds = [...new Set(myTeams.map(t => t.league_id))];
  const myLeagues = leagues.filter(l => myLeagueIds.includes(l.id));
  
  const filteredTeams = selectedLeagueFilter === 'all' 
    ? myTeams 
    : myTeams.filter(t => t.league_id === selectedLeagueFilter);

  const updateTeamMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LeagueTeam.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
      toast.success('Team updated');
      setAddPlayerOpen(false);
      setSelectedPlayer('');
    },
  });

  const handleAddPlayer = () => {
    if (!selectedPlayer || !selectedTeam) return;
    
    const currentPlayers = selectedTeam.players || [];
    if (currentPlayers.includes(selectedPlayer)) {
      toast.error('Player already in team');
      return;
    }
    
    updateTeamMutation.mutate({
      id: selectedTeam.id,
      data: { players: [...currentPlayers, selectedPlayer] }
    });
  };

  const handleRemovePlayer = (team, playerEmail) => {
    const currentPlayers = team.players || [];
    updateTeamMutation.mutate({
      id: team.id,
      data: { players: currentPlayers.filter(p => p !== playerEmail) }
    });
  };

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    if (member?.first_name && member?.surname) {
      return `${member.first_name} ${member.surname}`;
    }
    return member?.user_name || email;
  };

  const getMemberPhone = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.phone || '';
  };

  const calculateLeagueTable = (league) => {
    const leagueTeams = teams.filter(t => t.league_id === league.id);
    const leagueFixtures = fixtures.filter(f => f.league_id === league.id && f.status === 'completed');
    
    const table = leagueTeams.map(team => ({
      team,
      played: 0,
      won: 0,
      lost: 0,
      drawn: 0,
      pointsFor: 0,
      pointsAgainst: 0,
      pointsDiff: 0,
      points: 0
    }));
    
    leagueFixtures.forEach(fixture => {
      const homeEntry = table.find(t => t.team.id === fixture.home_team_id);
      const awayEntry = table.find(t => t.team.id === fixture.away_team_id);
      
      if (homeEntry && awayEntry && fixture.home_score !== undefined && fixture.away_score !== undefined) {
        homeEntry.played++;
        awayEntry.played++;
        homeEntry.pointsFor += fixture.home_score;
        homeEntry.pointsAgainst += fixture.away_score;
        awayEntry.pointsFor += fixture.away_score;
        awayEntry.pointsAgainst += fixture.home_score;
        
        if (fixture.home_score > fixture.away_score) {
          homeEntry.won++;
          homeEntry.points += 2;
          awayEntry.lost++;
        } else if (fixture.away_score > fixture.home_score) {
          awayEntry.won++;
          awayEntry.points += 2;
          homeEntry.lost++;
        } else {
          homeEntry.drawn++;
          awayEntry.drawn++;
          homeEntry.points += 1;
          awayEntry.points += 1;
        }
      }
    });
    
    table.forEach(entry => {
      entry.pointsDiff = entry.pointsFor - entry.pointsAgainst;
    });
    
    return table.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.pointsDiff !== a.pointsDiff) return b.pointsDiff - a.pointsDiff;
      return b.pointsFor - a.pointsFor;
    });
  };

  const handleToggleRotaPlayer = async (team, fixtureId, playerEmail) => {
    // Refetch the latest team data to avoid stale state
    const latestTeams = await base44.entities.LeagueTeam.filter({ id: team.id });
    const latestTeam = latestTeams[0];
    
    const rota = { ...(latestTeam?.fixture_rota || {}) };
    const currentPlayers = [...(rota[fixtureId] || [])];
    
    if (currentPlayers.includes(playerEmail)) {
      rota[fixtureId] = currentPlayers.filter(p => p !== playerEmail);
    } else {
      rota[fixtureId] = [...currentPlayers, playerEmail];
    }
    
    await base44.entities.LeagueTeam.update(team.id, { fixture_rota: rota });
    queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
  };

  const openAddPlayer = (team) => {
    setSelectedTeam(team);
    setAddPlayerOpen(true);
  };

  const handleGenerateRota = async (team) => {
    const league = leagues.find(l => l.id === team.league_id);
    const teamFixtures = fixtures
      .filter(f => f.home_team_id === team.id || f.away_team_id === team.id)
      .sort((a, b) => a.match_date.localeCompare(b.match_date));
    
    const players = team.players || [];
    
    if (players.length === 0) {
      toast.error('Add players to your team first');
      return;
    }
    
    const playersPerGame = league?.format === 'triples' ? 3 : 4;
    
    if (players.length < playersPerGame) {
      toast.error(`Need at least ${playersPerGame} players for ${league?.format || 'fours'} format`);
      return;
    }
    
    setGeneratingRota(true);
    
    // Track how many games each player has been assigned
    const playerGameCount = {};
    players.forEach(p => playerGameCount[p] = 0);
    
    const rota = {};
    
    for (const fixture of teamFixtures) {
      // Sort players by least games played
      const sortedPlayers = [...players].sort((a, b) => playerGameCount[a] - playerGameCount[b]);
      
      // Select exactly playersPerGame players (3 for triples, 4 for fours)
      const selectedPlayers = sortedPlayers.slice(0, playersPerGame);
      
      // Update game counts
      selectedPlayers.forEach(p => playerGameCount[p]++);
      
      // Only assign exactly the required number of players
      rota[fixture.id] = selectedPlayers.slice(0, playersPerGame);
    }
    
    // Save rota to team
    await base44.entities.LeagueTeam.update(team.id, { fixture_rota: rota });
    queryClient.invalidateQueries({ queryKey: ['leagueTeams', clubId] });
    
    setGeneratingRota(false);
    toast.success('Rota generated');
  };

  const openRotaView = (team) => {
    setViewingRotaTeam(team);
    setRotaDialogOpen(true);
  };

  const openRotaEdit = (team) => {
    setEditingRotaTeam(team);
    setEditRotaDialogOpen(true);
  };

  const isCaptain = (team) => team.captain_email === user?.email;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;
    
    const league = viewingRotaTeam ? leagues.find(l => l.id === viewingRotaTeam.league_id) : null;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${viewingRotaTeam?.name} - Player Rota</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            .header { text-align: center; margin-bottom: 20px; }
            .logo { max-height: 60px; margin-bottom: 10px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            h2 { font-size: 14px; margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: center; }
            th { background: #f5f5f5; font-weight: bold; }
            .fixture-cell { text-align: left; white-space: nowrap; }
            .x-mark { font-weight: bold; color: #059669; }
          </style>
        </head>
        <body>
          <div class="header">
            ${club?.logo_url ? `<img src="${club.logo_url}" class="logo" alt="${club?.name}" />` : ''}
            <div>${club?.name || ''}</div>
          </div>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">My League Teams</h1>
              <p className="text-gray-600">{club?.name} • View your teams</p>
            </div>
            {myLeagues.length > 1 && (
              <Select value={selectedLeagueFilter} onValueChange={setSelectedLeagueFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by league" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Leagues ({myLeagues.length})</SelectItem>
                  {myLeagues.map(league => (
                    <SelectItem key={league.id} value={league.id}>{league.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </motion.div>

        {myTeams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams</h3>
              <p className="text-gray-500">You are not part of any league teams</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredTeams.map((team) => {
              const userIsCaptain = isCaptain(team);
              const league = leagues.find(l => l.id === team.league_id);
              const teamFixtures = fixtures
                .filter(f => f.home_team_id === team.id || f.away_team_id === team.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date));
              const players = team.players || [];
              const hasRota = team.fixture_rota && Object.keys(team.fixture_rota).length > 0;
              
              return (
                <motion.div
                  key={team.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-emerald-600" />
                            {team.name}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2">
                            {league?.name || 'Unknown League'}
                            {league?.format && (
                              <Badge variant="outline" className="text-xs">
                                {league.format === 'triples' ? 'Triples' : 'Fours'}
                              </Badge>
                            )}
                          </CardDescription>
                        </div>
                        {userIsCaptain ? (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <UserCircle className="w-3 h-3 mr-1" />
                            Captain
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Users className="w-3 h-3 mr-1" />
                            Player
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Team Players */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-medium text-gray-700 flex items-center gap-2">
                            <Users className="w-4 h-4" />
                            Team Players ({players.length})
                          </h4>
                          {userIsCaptain && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openAddPlayer(team)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Add Player
                            </Button>
                          )}
                        </div>
                        
                        {players.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                            No players added yet.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {players.map((playerEmail) => (
                              <div 
                                key={playerEmail}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="text-sm">{getMemberName(playerEmail)}</span>
                                {userIsCaptain && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                    onClick={() => handleRemovePlayer(team, playerEmail)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Rota Section */}
                      {teamFixtures.length > 0 && players.length > 0 && (
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-700 flex items-center gap-2">
                              <Table className="w-4 h-4" />
                              Player Rota
                            </h4>
                            <div className="flex gap-2 flex-wrap">
                              {userIsCaptain && (
                                <>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => handleGenerateRota(team)}
                                    disabled={generatingRota}
                                  >
                                    {generatingRota ? (
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    ) : (
                                      <Zap className="w-4 h-4 mr-1" />
                                    )}
                                    {hasRota ? 'Regenerate' : 'Generate'}
                                  </Button>
                                  {hasRota && (
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openRotaEdit(team)}
                                    >
                                      <Pencil className="w-4 h-4 mr-1" />
                                      Edit
                                    </Button>
                                  )}
                                </>
                              )}
                              {hasRota && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => openRotaView(team)}
                                >
                                  <Printer className="w-4 h-4 mr-1" />
                                  View & Print
                                </Button>
                              )}
                            </div>
                          </div>
                          {!hasRota && (
                            <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                              {userIsCaptain ? 'Generate a rota to evenly distribute players across fixtures' : 'No rota generated yet'}
                            </p>
                          )}
                        </div>
                      )}

                      {/* League Table */}
                      {league && (
                        <div>
                          <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
                            <BarChart3 className="w-4 h-4" />
                            League Table
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse text-xs">
                              <thead>
                                <tr>
                                  <th className="border p-1.5 bg-gray-50">#</th>
                                  <th className="border p-1.5 bg-gray-50 text-left">Team</th>
                                  <th className="border p-1.5 bg-gray-50">P</th>
                                  <th className="border p-1.5 bg-gray-50">W</th>
                                  <th className="border p-1.5 bg-gray-50">D</th>
                                  <th className="border p-1.5 bg-gray-50">L</th>
                                  <th className="border p-1.5 bg-gray-50">+/-</th>
                                  <th className="border p-1.5 bg-gray-50">Pts</th>
                                </tr>
                              </thead>
                              <tbody>
                                {calculateLeagueTable(league).map((entry, idx) => (
                                  <tr key={entry.team.id} className={entry.team.id === team.id ? 'bg-emerald-50' : ''}>
                                    <td className="border p-1.5 text-center">{idx + 1}</td>
                                    <td className="border p-1.5 font-medium">{entry.team.name}</td>
                                    <td className="border p-1.5 text-center">{entry.played}</td>
                                    <td className="border p-1.5 text-center">{entry.won}</td>
                                    <td className="border p-1.5 text-center">{entry.drawn}</td>
                                    <td className="border p-1.5 text-center">{entry.lost}</td>
                                    <td className="border p-1.5 text-center">{entry.pointsDiff > 0 ? '+' : ''}{entry.pointsDiff}</td>
                                    <td className="border p-1.5 text-center font-bold">{entry.points}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Fixtures */}
                      {teamFixtures.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4" />
                            Fixtures ({teamFixtures.length})
                          </h4>
                          <div className="space-y-2">
                            {teamFixtures.map(fixture => {
                              const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                              const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                              const isHome = fixture.home_team_id === team.id;
                              const rotaPlayers = team.fixture_rota?.[fixture.id] || [];
                              return (
                                <div key={fixture.id} className="p-2 border rounded-lg text-sm">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <span className="text-gray-500 w-20">
                                        {format(parseISO(fixture.match_date), 'd MMM')}
                                      </span>
                                      <span className={isHome ? 'font-medium' : ''}>
                                        {homeTeam?.name}
                                      </span>
                                      <span className="text-gray-400">vs</span>
                                      <span className={!isHome ? 'font-medium' : ''}>
                                        {awayTeam?.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {fixture.status === 'completed' && (
                                        <Badge className="bg-emerald-100 text-emerald-700">
                                          {fixture.home_score} - {fixture.away_score}
                                        </Badge>
                                      )}
                                      <Badge variant="outline">Rink {fixture.rink_number}</Badge>
                                    </div>
                                  </div>
                                  {rotaPlayers.length > 0 && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      Playing: {rotaPlayers.map(p => getMemberName(p)).join(', ')}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Add Player Dialog */}
        <Dialog open={addPlayerOpen} onOpenChange={setAddPlayerOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Add Player to {selectedTeam?.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select Player</Label>
                <Select value={selectedPlayer} onValueChange={setSelectedPlayer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a member" />
                  </SelectTrigger>
                  <SelectContent>
                    {members
                      .filter(m => !(selectedTeam?.players || []).includes(m.user_email))
                      .map((member) => (
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
              <Button variant="outline" onClick={() => setAddPlayerOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleAddPlayer}
                disabled={!selectedPlayer || updateTeamMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {updateTeamMutation.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Add Player
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Rota View Dialog */}
        <Dialog open={rotaDialogOpen} onOpenChange={() => setRotaDialogOpen(false)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>{viewingRotaTeam?.name} - Player Rota</span>
                <Button variant="outline" size="sm" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-1" />
                  Print
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div ref={printRef}>
              {viewingRotaTeam && (() => {
                const league = leagues.find(l => l.id === viewingRotaTeam.league_id);
                const teamFixtures = fixtures
                  .filter(f => f.home_team_id === viewingRotaTeam.id || f.away_team_id === viewingRotaTeam.id)
                  .sort((a, b) => a.match_date.localeCompare(b.match_date));
                const players = viewingRotaTeam.players || [];
                const rota = viewingRotaTeam.fixture_rota || {};
                
                return (
                  <>
                    <h1>{viewingRotaTeam.name}</h1>
                    <h2>{league?.name} - {league?.format === 'triples' ? 'Triples' : 'Fours'}</h2>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr>
                            <th className="border p-2 bg-gray-50 text-left">Fixture</th>
                            <th className="border p-2 bg-gray-50 text-left">Date</th>
                            <th className="border p-2 bg-gray-50">Rink</th>
                            {players.map(player => (
                              <th key={player} className="border p-2 bg-gray-50 text-center whitespace-nowrap">
                                {getMemberName(player).split(' ').map(n => n[0]).join('')}
                                <div className="text-xs font-normal text-gray-500">
                                  {getMemberName(player)}
                                </div>
                                {getMemberPhone(player) && (
                                  <div className="text-xs font-normal text-gray-400 flex items-center justify-center gap-1">
                                    <Phone className="w-2 h-2" />
                                    {getMemberPhone(player)}
                                  </div>
                                )}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {teamFixtures.map(fixture => {
                            const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                            const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                            const isHome = fixture.home_team_id === viewingRotaTeam.id;
                            const opponent = isHome ? awayTeam : homeTeam;
                            const rotaPlayers = rota[fixture.id] || [];
                            
                            return (
                              <tr key={fixture.id}>
                                <td className="border p-2 fixture-cell">
                                  vs {opponent?.name}
                                </td>
                                <td className="border p-2 whitespace-nowrap">
                                  {format(parseISO(fixture.match_date), 'd MMM')}
                                </td>
                                <td className="border p-2 text-center">
                                  {fixture.rink_number}
                                </td>
                                {players.map(player => (
                                  <td key={player} className="border p-2 text-center">
                                    {rotaPlayers.includes(player) && (
                                      <span className="text-emerald-600 font-bold">X</span>
                                    )}
                                  </td>
                                ))}
                              </tr>
                            );
                          })}
                          {/* Totals row */}
                          <tr className="font-medium bg-gray-50">
                            <td className="border p-2" colSpan={3}>Total Games</td>
                            {players.map(player => {
                              const count = teamFixtures.filter(f => 
                                (rota[f.id] || []).includes(player)
                              ).length;
                              return (
                                <td key={player} className="border p-2 text-center">
                                  {count}
                                </td>
                              );
                            })}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Rota Dialog */}
        <Dialog open={editRotaDialogOpen} onOpenChange={() => setEditRotaDialogOpen(false)}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
            <DialogHeader>
              <DialogTitle>{editingRotaTeam?.name} - Edit Rota</DialogTitle>
            </DialogHeader>
            
            {editingRotaTeam && (() => {
              const league = leagues.find(l => l.id === editingRotaTeam.league_id);
              const teamFixtures = fixtures
                .filter(f => f.home_team_id === editingRotaTeam.id || f.away_team_id === editingRotaTeam.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date));
              const players = editingRotaTeam.players || [];
              const rota = editingRotaTeam.fixture_rota || {};
              
              return (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border p-2 bg-gray-50 text-left">Fixture</th>
                        <th className="border p-2 bg-gray-50 text-left">Date</th>
                        <th className="border p-2 bg-gray-50">Rink</th>
                        {players.map(player => (
                          <th key={player} className="border p-2 bg-gray-50 text-center whitespace-nowrap">
                            <div className="text-xs">
                              {getMemberName(player)}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamFixtures.map(fixture => {
                        const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                        const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                        const isHome = fixture.home_team_id === editingRotaTeam.id;
                        const opponent = isHome ? awayTeam : homeTeam;
                        const rotaPlayers = rota[fixture.id] || [];
                        
                        return (
                          <tr key={fixture.id}>
                            <td className="border p-2">
                              vs {opponent?.name}
                            </td>
                            <td className="border p-2 whitespace-nowrap">
                              {format(parseISO(fixture.match_date), 'd MMM')}
                            </td>
                            <td className="border p-2 text-center">
                              {fixture.rink_number}
                            </td>
                            {players.map(player => (
                              <td key={player} className="border p-2 text-center">
                                <Checkbox
                                  checked={rotaPlayers.includes(player)}
                                  onCheckedChange={() => handleToggleRotaPlayer(editingRotaTeam, fixture.id, player)}
                                  className="mx-auto"
                                />
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                      {/* Totals row */}
                      <tr className="font-medium bg-gray-50">
                        <td className="border p-2" colSpan={3}>Total Games</td>
                        {players.map(player => {
                          const count = teamFixtures.filter(f => 
                            (rota[f.id] || []).includes(player)
                          ).length;
                          return (
                            <td key={player} className="border p-2 text-center">
                              {count}
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              );
            })()}
            
            <DialogFooter>
              <Button onClick={() => setEditRotaDialogOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}