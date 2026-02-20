import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Loader2, 
  Save, 
  Send, 
  Shuffle,
  ShieldAlert,
  Trophy,
  Users,
  Calendar
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TournamentBracket from '@/components/tournament/TournamentBracket';

export default function TournamentEditor() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const tournamentId = searchParams.get('tournamentId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [tournamentType, setTournamentType] = useState('knockout');
  const [selectedPlayers, setSelectedPlayers] = useState([]);
  const [bracket, setBracket] = useState(null);
  const [numTeams, setNumTeams] = useState(4);
  const [tournamentDate, setTournamentDate] = useState('');
  const [qualifyingTeams, setQualifyingTeams] = useState(4);

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

  const { data: existingTournament } = useQuery({
    queryKey: ['tournament', tournamentId],
    queryFn: async () => {
      const tournaments = await base44.entities.ClubTournament.filter({ id: tournamentId });
      return tournaments[0];
    },
    enabled: !!tournamentId,
  });

  useEffect(() => {
    if (existingTournament) {
      setName(existingTournament.name);
      setTournamentType(existingTournament.tournament_type || 'knockout');
      setSelectedPlayers(existingTournament.players || []);
      setBracket(existingTournament.bracket || null);
      setNumTeams(existingTournament.num_teams || 4);
      setTournamentDate(existingTournament.tournament_date || '');
      setQualifyingTeams(existingTournament.qualifying_teams || 4);
    }
  }, [existingTournament]);

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.ClubTournament.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      toast.success('Tournament saved');
      navigate(createPageUrl('TournamentEditor') + `?clubId=${clubId}&tournamentId=${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubTournament.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tournaments'] });
      queryClient.invalidateQueries({ queryKey: ['tournament', tournamentId] });
      toast.success('Tournament updated');
    },
  });

  if (!isClubAdmin && user) {
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
          <p className="text-gray-600 mb-6">You need club admin privileges.</p>
          <Link to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Back to Tournaments
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const togglePlayer = (email) => {
    const maxPlayers = tournamentType === 'knockout' ? 32 : numTeams;
    
    if (selectedPlayers.includes(email)) {
      setSelectedPlayers(selectedPlayers.filter(e => e !== email));
    } else if (selectedPlayers.length < maxPlayers) {
      setSelectedPlayers([...selectedPlayers, email]);
    } else {
      toast.error(`Maximum ${maxPlayers} ${tournamentType === 'knockout' ? 'players' : 'team captains'} allowed`);
    }
  };

  const generateBracket = () => {
    if (tournamentType === 'round-robin') {
      if (selectedPlayers.length !== numTeams) {
        toast.error(`Please select exactly ${numTeams} team captains`);
        return;
      }
      if (!tournamentDate) {
        toast.error('Please select tournament date');
        return;
      }
      generateRoundRobinBracket();
      return;
    }
    
    if (selectedPlayers.length < 2) {
      toast.error('Select at least 2 players');
      return;
    }

    const shuffled = [...selectedPlayers].sort(() => Math.random() - 0.5);
    const playerCount = shuffled.length;
    
    // Find next power of 2
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(playerCount)));
    const byeCount = bracketSize - playerCount;
    
    // Create first round matches with fair bye distribution
    const rounds = [];
    const firstRound = [];
    
    // Distribute byes evenly throughout the bracket (not bottom-loaded)
    const playersWithByes = [...shuffled];
    const byeInterval = playerCount > 0 ? Math.floor(bracketSize / (byeCount || 1)) : 0;
    
    // Insert null (bye) slots at even intervals
    for (let i = 0; i < byeCount; i++) {
      const position = Math.min((i + 1) * byeInterval - 1, playersWithByes.length);
      playersWithByes.splice(position, 0, null);
    }
    
    // Create matches
    for (let i = 0; i < bracketSize / 2; i++) {
      const match = {
        id: `r1_m${i}`,
        player1: playersWithByes[i * 2] || null,
        player2: playersWithByes[i * 2 + 1] || null,
        winner: null
      };
      
      // Auto-advance if bye
      if (match.player1 && !match.player2) {
        match.winner = match.player1;
      } else if (!match.player1 && match.player2) {
        match.winner = match.player2;
      }
      
      firstRound.push(match);
    }
    rounds.push(firstRound);
    
    // Create subsequent rounds
    let prevRoundSize = firstRound.length;
    let roundNum = 2;
    while (prevRoundSize > 1) {
      const round = [];
      for (let i = 0; i < prevRoundSize / 2; i++) {
        round.push({
          id: `r${roundNum}_m${i}`,
          player1: null,
          player2: null,
          winner: null
        });
      }
      rounds.push(round);
      prevRoundSize = round.length;
      roundNum++;
    }
    
    setBracket({ rounds, players: shuffled, type: 'knockout' });
    toast.success('Bracket generated!');
  };

  const generateRoundRobinBracket = () => {
    // Create teams
    const teamCaptains = [...selectedPlayers];
    const teamsPerGroup = Math.ceil(numTeams / 2);
    
    // Distribute into 2 groups
    const group1 = teamCaptains.slice(0, teamsPerGroup);
    const group2 = teamCaptains.slice(teamsPerGroup);
    
    // Generate round-robin fixtures for each group
    const generateGroupFixtures = (teams) => {
      const fixtures = [];
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          fixtures.push({
            team1: teams[i],
            team2: teams[j],
            score1: null,
            score2: null
          });
        }
      }
      return fixtures;
    };
    
    const group1Fixtures = generateGroupFixtures(group1);
    const group2Fixtures = generateGroupFixtures(group2);
    
    // Determine knockout stage size
    let knockoutRounds = [];
    if (qualifyingTeams === 8) {
      // Quarter-finals
      knockoutRounds = [
        { id: 'qf1', team1: null, team2: null, winner: null },
        { id: 'qf2', team1: null, team2: null, winner: null },
        { id: 'qf3', team1: null, team2: null, winner: null },
        { id: 'qf4', team1: null, team2: null, winner: null },
      ];
    } else if (qualifyingTeams === 4) {
      // Semi-finals
      knockoutRounds = [
        { id: 'sf1', team1: null, team2: null, winner: null },
        { id: 'sf2', team1: null, team2: null, winner: null },
      ];
    } else {
      // Final only
      knockoutRounds = [
        { id: 'final', team1: null, team2: null, winner: null }
      ];
    }
    
    setBracket({
      type: 'round-robin',
      groups: [
        { name: 'Group A', teams: group1, fixtures: group1Fixtures },
        { name: 'Group B', teams: group2, fixtures: group2Fixtures }
      ],
      knockout: knockoutRounds,
      qualifyingTeams
    });
    
    toast.success('Round robin tournament generated!');
  };

  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast.error('Please enter a tournament name');
      return;
    }
    if (!bracket && !publish) {
      toast.error('Please generate a bracket first');
      return;
    }

    const data = {
      club_id: clubId,
      name: name.trim(),
      tournament_type: tournamentType,
      players: selectedPlayers,
      bracket,
      status: publish ? 'published' : 'draft',
      num_teams: numTeams,
      tournament_date: tournamentDate || null,
      qualifying_teams: qualifyingTeams
    };

    if (tournamentId) {
      await updateMutation.mutateAsync({ id: tournamentId, data });
      if (publish) {
        navigate(createPageUrl('ClubTournaments') + `?clubId=${clubId}`);
      }
    } else {
      createMutation.mutate(data);
    }
  };

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('ClubTournaments') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Tournaments
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {tournamentId ? 'Edit Tournament' : 'New Tournament'}
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-8">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Tournament Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Tournament Name *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Club Championship 2024"
                  />
                </div>

                <div>
                  <Label>Tournament Type *</Label>
                  <Select value={tournamentType} onValueChange={setTournamentType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="knockout">Knockout</SelectItem>
                      <SelectItem value="round-robin">Round Robin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {tournamentType === 'round-robin' && (
                  <>
                    <div>
                      <Label>Tournament Date *</Label>
                      <Input
                        type="date"
                        value={tournamentDate}
                        onChange={(e) => setTournamentDate(e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Number of Teams</Label>
                        <Input
                          type="number"
                          min="2"
                          max="16"
                          value={numTeams}
                          onChange={(e) => setNumTeams(parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Teams Qualifying</Label>
                        <Select 
                          value={qualifyingTeams.toString()} 
                          onValueChange={(v) => setQualifyingTeams(parseInt(v))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2">2 (Final)</SelectItem>
                            <SelectItem value="4">4 (Semi-finals)</SelectItem>
                            <SelectItem value="8">8 (Quarter-finals)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4" />
                    {tournamentType === 'knockout' 
                      ? `Select Players (${selectedPlayers.length}/32)`
                      : `Select Team Captains (${selectedPlayers.length}/${numTeams})`
                    }
                  </Label>
                  <div className="max-h-64 overflow-y-auto border rounded-lg p-2 space-y-1">
                    {members.map(member => (
                      <div 
                        key={member.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        onClick={() => togglePlayer(member.user_email)}
                      >
                        <Checkbox 
                          checked={selectedPlayers.includes(member.user_email)}
                          onCheckedChange={() => togglePlayer(member.user_email)}
                        />
                        <span className="text-sm">{member.user_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={generateBracket}
                  variant="outline"
                  className="w-full"
                  disabled={tournamentType === 'knockout' 
                    ? selectedPlayers.length < 2 
                    : (selectedPlayers.length !== numTeams || !tournamentDate)}
                >
                  <Shuffle className="w-4 h-4 mr-2" />
                  {tournamentType === 'knockout' ? 'Generate Knockout Draw' : 'Generate Round Robin'}
                </Button>

                <div className="pt-4 space-y-2 border-t">
                  <Button 
                    onClick={() => handleSave(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isSaving || !name.trim()}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Draft
                  </Button>
                  <Button 
                    onClick={() => handleSave(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSaving || !name.trim() || !bracket}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Publish
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            {bracket ? (
              <TournamentBracket 
                bracket={bracket} 
                getMemberName={getMemberName}
                onUpdateBracket={setBracket}
                editable={true}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>Select players and generate the draw to see the bracket</p>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}