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
  Grid3x3
} from 'lucide-react';
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
  
  // Round robin states
  const [teamCount, setTeamCount] = useState(8);
  const [teams, setTeams] = useState([]);
  const [rinksAvailable, setRinksAvailable] = useState(4);
  const [numGroups, setNumGroups] = useState(2);
  const [teamsPerGroup, setTeamsPerGroup] = useState(4);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [groups, setGroups] = useState(null);
  const [fixtures, setFixtures] = useState([]);
  const [knockoutFixtures, setKnockoutFixtures] = useState([]);

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
      setTeams(existingTournament.teams || []);
      setRinksAvailable(existingTournament.rinks_available || 4);
      setNumGroups(existingTournament.num_groups || 2);
      setTeamsPerGroup(existingTournament.teams_per_group || 4);
      setQualifiersPerGroup(existingTournament.qualifiers_per_group || 2);
      setGroups(existingTournament.groups || null);
      setFixtures(existingTournament.fixtures || []);
      setKnockoutFixtures(existingTournament.knockout_fixtures || []);
    }
  }, [existingTournament]);

  useEffect(() => {
    // Initialize teams when team count changes
    const newTeams = Array.from({ length: teamCount }, (_, i) => ({
      id: `team_${i + 1}`,
      name: `Team ${i + 1}`,
      captain: teams[i]?.captain || '',
      group: teams[i]?.group || null
    }));
    setTeams(newTeams);
  }, [teamCount]);

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
    if (selectedPlayers.includes(email)) {
      setSelectedPlayers(selectedPlayers.filter(e => e !== email));
    } else if (selectedPlayers.length < 32) {
      setSelectedPlayers([...selectedPlayers, email]);
    } else {
      toast.error('Maximum 32 players allowed');
    }
  };

  const generateBracket = () => {
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
    
    setBracket({ rounds, players: shuffled });
    toast.success('Bracket generated!');
  };

  const randomizeGroups = () => {
    if (teams.some(t => !t.captain.trim())) {
      toast.error('Please enter all team captains first');
      return;
    }

    // Validate structure
    if (teamCount !== numGroups * teamsPerGroup) {
      toast.error(`Teams (${teamCount}) must equal Groups (${numGroups}) × Teams per Group (${teamsPerGroup})`);
      return;
    }
    
    const shuffled = [...teams].sort(() => Math.random() - 0.5);
    const newGroups = {};
    
    for (let i = 0; i < numGroups; i++) {
      const groupLetter = String.fromCharCode(65 + i);
      newGroups[groupLetter] = [];
    }
    
    shuffled.forEach((team, idx) => {
      const groupIdx = Math.floor(idx / teamsPerGroup);
      const groupLetter = String.fromCharCode(65 + groupIdx);
      newGroups[groupLetter].push(team.id);
      team.group = groupLetter;
    });
    
    setGroups(newGroups);
    setTeams([...teams]);
    toast.success('Groups randomized!');
  };

  const generateRoundRobin = () => {
    if (!groups) {
      toast.error('Please randomize groups first');
      return;
    }

    // Validation: Check total matches fit available rinks per round
    const matchesPerGroup = (teamsPerGroup * (teamsPerGroup - 1)) / 2;
    const totalMatches = numGroups * matchesPerGroup;
    const matchesPerRound = (teamsPerGroup / 2) * numGroups;
    
    if (matchesPerRound > rinksAvailable) {
      toast.error(`Not enough rinks! Need ${matchesPerRound} rinks per round, but only ${rinksAvailable} available`);
      return;
    }

    // Generate round robin pairings per group using circle method
    const allFixtures = [];
    const roundsData = {};
    
    Object.entries(groups).forEach(([groupLetter, teamIds]) => {
      const groupTeams = teams.filter(t => teamIds.includes(t.id));
      const n = groupTeams.length;
      
      // Circle method for round robin
      const rounds = [];
      const teamList = [...groupTeams];
      
      // If odd number of teams, add a bye
      if (n % 2 === 1) {
        teamList.push({ id: 'bye', captain: 'BYE' });
      }
      
      const totalRounds = teamList.length - 1;
      
      for (let round = 0; round < totalRounds; round++) {
        const roundMatches = [];
        for (let i = 0; i < teamList.length / 2; i++) {
          const team1 = teamList[i];
          const team2 = teamList[teamList.length - 1 - i];
          
          if (team1.id !== 'bye' && team2.id !== 'bye') {
            roundMatches.push({
              team1_id: team1.id,
              team2_id: team2.id,
              group: groupLetter
            });
          }
        }
        rounds.push(roundMatches);
        
        // Rotate teams (keep first team fixed)
        const temp = teamList[1];
        for (let i = 1; i < teamList.length - 1; i++) {
          teamList[i] = teamList[i + 1];
        }
        teamList[teamList.length - 1] = temp;
      }
      
      roundsData[groupLetter] = rounds;
    });

    // Merge rounds across all groups
    const maxRounds = Math.max(...Object.values(roundsData).map(r => r.length));
    const mergedRounds = [];
    
    for (let roundIdx = 0; roundIdx < maxRounds; roundIdx++) {
      const roundMatches = [];
      Object.entries(roundsData).forEach(([groupLetter, rounds]) => {
        if (rounds[roundIdx]) {
          roundMatches.push(...rounds[roundIdx]);
        }
      });
      mergedRounds.push(roundMatches);
    }

    // Assign rinks with no team playing on same rink twice
    const teamRinkUsage = {};
    teams.forEach(t => teamRinkUsage[t.id] = new Set());
    
    let fixtureId = 0;
    mergedRounds.forEach((roundMatches, roundIdx) => {
      roundMatches.forEach(match => {
        let assignedRink = null;
        
        // Find a rink that neither team has used
        for (let rink = 1; rink <= rinksAvailable; rink++) {
          if (!teamRinkUsage[match.team1_id].has(rink) && 
              !teamRinkUsage[match.team2_id].has(rink)) {
            assignedRink = rink;
            break;
          }
        }
        
        // If no unused rink, find least-used rink
        if (!assignedRink) {
          let minUsage = Infinity;
          for (let rink = 1; rink <= rinksAvailable; rink++) {
            const usage = (teamRinkUsage[match.team1_id].has(rink) ? 1 : 0) + 
                         (teamRinkUsage[match.team2_id].has(rink) ? 1 : 0);
            if (usage < minUsage) {
              minUsage = usage;
              assignedRink = rink;
            }
          }
        }
        
        teamRinkUsage[match.team1_id].add(assignedRink);
        teamRinkUsage[match.team2_id].add(assignedRink);
        
        allFixtures.push({
          id: `fixture_${fixtureId++}`,
          round: `Round ${roundIdx + 1}`,
          team1_id: match.team1_id,
          team2_id: match.team2_id,
          group: match.group,
          rink: assignedRink,
          team1_score: null,
          team2_score: null,
          winner_id: null
        });
      });
    });

    setFixtures(allFixtures);
    
    // Generate knockout structure
    const totalQualifiers = numGroups * qualifiersPerGroup;
    const knockoutStage = [];
    
    if (totalQualifiers === 8) {
      knockoutStage.push({ round: 'Quarter Final', matches: 4 });
      knockoutStage.push({ round: 'Semi Final', matches: 2 });
      knockoutStage.push({ round: 'Final', matches: 1 });
    } else if (totalQualifiers === 4) {
      knockoutStage.push({ round: 'Semi Final', matches: 2 });
      knockoutStage.push({ round: 'Final', matches: 1 });
    } else if (totalQualifiers === 2) {
      knockoutStage.push({ round: 'Final', matches: 1 });
    }
    
    const knockoutFixturesList = [];
    let knockoutId = 0;
    knockoutStage.forEach(stage => {
      for (let i = 0; i < stage.matches; i++) {
        knockoutFixturesList.push({
          id: `knockout_${knockoutId++}`,
          round: stage.round,
          team1_id: null,
          team2_id: null,
          rink: null,
          team1_score: null,
          team2_score: null,
          winner_id: null
        });
      }
    });
    
    setKnockoutFixtures(knockoutFixturesList);
    
    // Log rink usage for verification
    console.log('Rink Usage Summary:');
    teams.forEach(team => {
      console.log(`${team.captain}: Rinks ${Array.from(teamRinkUsage[team.id]).join(', ')}`);
    });
    
    toast.success('Round robin fixtures generated with optimized rink allocation!');
  };

  const handleSave = async (publish = false) => {
    if (!name.trim()) {
      toast.error('Please enter a tournament name');
      return;
    }
    
    if (tournamentType === 'knockout' && !bracket && !publish) {
      toast.error('Please generate a bracket first');
      return;
    }
    
    if (tournamentType === 'round_robin' && fixtures.length === 0 && publish) {
      toast.error('Please generate fixtures first');
      return;
    }

    const data = {
      club_id: clubId,
      name: name.trim(),
      tournament_type: tournamentType,
      ...(tournamentType === 'knockout' ? {
        players: selectedPlayers,
        bracket
      } : {
        teams,
        rinks_available: rinksAvailable,
        num_groups: numGroups,
        teams_per_group: teamsPerGroup,
        qualifiers_per_group: qualifiersPerGroup,
        groups,
        fixtures,
        knockout_fixtures: knockoutFixtures
      }),
      status: publish ? 'published' : 'draft'
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
                  <Label>Tournament Type</Label>
                  <select
                    value={tournamentType}
                    onChange={(e) => setTournamentType(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                  >
                    <option value="knockout">Knockout</option>
                    <option value="round_robin">Round Robin</option>
                  </select>
                </div>

                {tournamentType === 'knockout' ? (
                  <>
                    <div>
                      <Label className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4" />
                        Select Players ({selectedPlayers.length}/32)
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
                      disabled={selectedPlayers.length < 2}
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Generate Draw
                    </Button>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>Number of Teams</Label>
                      <select
                        value={teamCount}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTeamCount(val);
                          // Auto-adjust groups and teams per group
                          if (val === 8) {
                            setNumGroups(2);
                            setTeamsPerGroup(4);
                          } else if (val === 12) {
                            setNumGroups(3);
                            setTeamsPerGroup(4);
                          } else if (val === 16) {
                            setNumGroups(4);
                            setTeamsPerGroup(4);
                          }
                        }}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {[4, 6, 8, 12, 16, 20, 24, 32].map(n => (
                          <option key={n} value={n}>{n} Teams</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Number of Groups</Label>
                      <select
                        value={numGroups}
                        onChange={(e) => setNumGroups(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {[2, 3, 4, 5, 6, 8].map(n => (
                          <option key={n} value={n}>{n} Groups</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Teams Per Group</Label>
                      <select
                        value={teamsPerGroup}
                        onChange={(e) => setTeamsPerGroup(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {[3, 4, 5, 6, 8].map(n => (
                          <option key={n} value={n}>{n} Teams</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Team Captains</Label>
                      <div className="max-h-48 overflow-y-auto border rounded-lg p-2 space-y-2">
                        {teams.map((team, idx) => (
                          <Input
                            key={team.id}
                            value={team.captain}
                            onChange={(e) => {
                              const newTeams = [...teams];
                              newTeams[idx].captain = e.target.value;
                              setTeams(newTeams);
                            }}
                            placeholder={`Team ${idx + 1} Captain`}
                            className="text-sm"
                          />
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label>Number of Rinks</Label>
                      <select
                        value={rinksAvailable}
                        onChange={(e) => setRinksAvailable(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map(n => (
                          <option key={n} value={n}>{n} Rinks</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <Label>Qualifiers Per Group</Label>
                      <select
                        value={qualifiersPerGroup}
                        onChange={(e) => setQualifiersPerGroup(Number(e.target.value))}
                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
                      >
                        <option value={1}>1 Per Group</option>
                        <option value={2}>2 Per Group</option>
                      </select>
                    </div>

                    <Button 
                      onClick={randomizeGroups}
                      variant="outline"
                      className="w-full"
                      disabled={teams.some(t => !t.captain.trim())}
                    >
                      <Grid3x3 className="w-4 h-4 mr-2" />
                      Randomize Groups
                    </Button>

                    <Button 
                      onClick={generateRoundRobin}
                      variant="outline"
                      className="w-full"
                      disabled={!groups}
                    >
                      <Shuffle className="w-4 h-4 mr-2" />
                      Generate Round Robin
                    </Button>
                  </>
                )}

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
                    disabled={isSaving || !name.trim() || (tournamentType === 'knockout' && !bracket) || (tournamentType === 'round_robin' && fixtures.length === 0)}
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
            {tournamentType === 'knockout' ? (
              bracket ? (
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
              )
            ) : (
              <div className="space-y-6">
                {groups && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Groups</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(groups).map(([letter, teamIds]) => (
                          <div key={letter} className="border rounded-lg p-4">
                            <h3 className="font-semibold text-lg mb-2">Group {letter}</h3>
                            <div className="space-y-1">
                              {teamIds.map(teamId => {
                                const team = teams.find(t => t.id === teamId);
                                return (
                                  <div key={teamId} className="text-sm">
                                    {team?.name}: {team?.captain}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {fixtures.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Group Stage Fixtures</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {Object.keys(groups || {}).map(groupLetter => {
                          const groupFixtures = fixtures.filter(f => f.group === groupLetter);
                          return (
                            <div key={groupLetter}>
                              <h4 className="font-semibold mb-2">Group {groupLetter}</h4>
                              <div className="space-y-2">
                                {groupFixtures.map(fixture => {
                                  const team1 = teams.find(t => t.id === fixture.team1_id);
                                  const team2 = teams.find(t => t.id === fixture.team2_id);
                                  return (
                                    <div key={fixture.id} className="flex items-center justify-between border rounded p-2 text-sm">
                                      <span>{team1?.captain} vs {team2?.captain}</span>
                                      <Badge variant="outline">Rink {fixture.rink}</Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {knockoutFixtures.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Knockout Stage</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['Quarter Final', 'Semi Final', 'Final'].map(round => {
                          const roundFixtures = knockoutFixtures.filter(f => f.round === round);
                          if (roundFixtures.length === 0) return null;
                          return (
                            <div key={round}>
                              <h4 className="font-semibold mb-2">{round}</h4>
                              <div className="space-y-2">
                                {roundFixtures.map((fixture, idx) => (
                                  <div key={fixture.id} className="border rounded p-2 text-sm">
                                    Match {idx + 1}: TBD vs TBD
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {!groups && fixtures.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-gray-500">
                      <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Set up teams and generate fixtures to see the tournament structure</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}