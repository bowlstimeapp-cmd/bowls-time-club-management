import React, { useState, useEffect } from 'react';
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
  Calendar
} from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format, parseISO } from 'date-fns';

export default function MyLeagueTeam() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [addPlayerOpen, setAddPlayerOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState('');

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

  // Find teams where user is captain
  const myTeams = teams.filter(t => t.captain_email === user?.email);

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

  const openAddPlayer = (team) => {
    setSelectedTeam(team);
    setAddPlayerOpen(true);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My League Teams</h1>
          <p className="text-gray-600">{club?.name} • Manage your teams</p>
        </motion.div>

        {myTeams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No teams</h3>
              <p className="text-gray-500">You are not a captain of any league teams</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {myTeams.map((team) => {
              const league = leagues.find(l => l.id === team.league_id);
              const teamFixtures = fixtures
                .filter(f => f.home_team_id === team.id || f.away_team_id === team.id)
                .sort((a, b) => a.match_date.localeCompare(b.match_date));
              const players = team.players || [];
              
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
                          <CardDescription>
                            {league?.name || 'Unknown League'}
                          </CardDescription>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-700">
                          <UserCircle className="w-3 h-3 mr-1" />
                          Captain
                        </Badge>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openAddPlayer(team)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Player
                          </Button>
                        </div>
                        
                        {players.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 rounded-lg">
                            No players added yet. Add players to your team.
                          </p>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {players.map((playerEmail) => (
                              <div 
                                key={playerEmail}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                              >
                                <span className="text-sm">{getMemberName(playerEmail)}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-red-600 hover:bg-red-50"
                                  onClick={() => handleRemovePlayer(team, playerEmail)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Upcoming Fixtures */}
                      {teamFixtures.length > 0 && (
                        <div>
                          <h4 className="font-medium text-gray-700 flex items-center gap-2 mb-3">
                            <Calendar className="w-4 h-4" />
                            Fixtures
                          </h4>
                          <div className="space-y-2">
                            {teamFixtures.slice(0, 5).map(fixture => {
                              const homeTeam = teams.find(t => t.id === fixture.home_team_id);
                              const awayTeam = teams.find(t => t.id === fixture.away_team_id);
                              const isHome = fixture.home_team_id === team.id;
                              return (
                                <div key={fixture.id} className="flex items-center justify-between p-2 border rounded-lg text-sm">
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
                                  <Badge variant="outline">Rink {fixture.rink_number}</Badge>
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
          <DialogContent>
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
      </div>
    </div>
  );
}