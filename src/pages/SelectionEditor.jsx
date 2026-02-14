import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Send, 
  ArrowLeft,
  Loader2,
  ShieldAlert
} from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import RinkSelectionGrid from '@/components/selection/RinkSelectionGrid';
import TopClubSelectionGrid from '@/components/selection/TopClubSelectionGrid';

const COMPETITIONS = ['Bramley', 'Wessex League', 'Denny', 'Top Club'];

export default function SelectionEditor() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const selectionId = searchParams.get('selectionId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [user, setUser] = useState(null);
  const [competition, setCompetition] = useState('');
  const [matchDate, setMatchDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [matchName, setMatchName] = useState('');
  const [selections, setSelections] = useState({});

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

  const { data: existingSelection } = useQuery({
    queryKey: ['selection', selectionId],
    queryFn: async () => {
      const selections = await base44.entities.TeamSelection.filter({ id: selectionId });
      return selections[0];
    },
    enabled: !!selectionId,
  });

  useEffect(() => {
    if (existingSelection) {
      setCompetition(existingSelection.competition);
      setMatchDate(existingSelection.match_date);
      setMatchName(existingSelection.match_name || '');
      setSelections(existingSelection.selections || {});
    }
  }, [existingSelection]);

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const { data: unavailabilities = [] } = useQuery({
    queryKey: ['allUnavailabilities'],
    queryFn: () => base44.entities.UserUnavailability.list(),
  });

  const isSelector = membership?.role === 'selector' || membership?.role === 'admin';

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamSelection.create(data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      toast.success('Selection saved as draft');
      navigate(createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TeamSelection.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selections'] });
      queryClient.invalidateQueries({ queryKey: ['selection', selectionId] });
    },
  });

  const handleSave = async (publish = false) => {
    if (!competition) {
      toast.error('Please select a competition');
      return;
    }

    const data = {
      club_id: clubId,
      competition,
      match_date: matchDate,
      match_name: matchName,
      selections,
      status: publish ? 'published' : 'draft',
      selector_email: user.email
    };

    if (selectionId) {
      await updateMutation.mutateAsync({ id: selectionId, data });
      toast.success(publish ? 'Selection published!' : 'Selection saved');
      if (publish) {
        navigate(createPageUrl('Selection') + `?clubId=${clubId}`);
      }
    } else {
      createMutation.mutate(data);
    }
  };

  const handleSelectionChange = (position, memberEmail) => {
    setSelections(prev => ({
      ...prev,
      [position]: memberEmail
    }));
  };

  const selectedEmails = Object.values(selections).filter(Boolean);

  if (!isSelector && user) {
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
          <p className="text-gray-600 mb-6">You need selector privileges to access this page.</p>
          <Link to={createPageUrl('Selection') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Back to Selections
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const isTopClub = competition === 'Top Club';
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('Selection') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {selectionId ? 'Edit Selection' : 'New Selection'}
          </h1>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Match Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Competition *</Label>
                  <Select value={competition} onValueChange={setCompetition}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select competition" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPETITIONS.map(comp => (
                        <SelectItem key={comp} value={comp}>{comp}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Match Date *</Label>
                  <Input
                    type="date"
                    value={matchDate}
                    onChange={(e) => setMatchDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Match Name (optional)</Label>
                  <Input
                    value={matchName}
                    onChange={(e) => setMatchName(e.target.value)}
                    placeholder="e.g., vs Springfield BC"
                  />
                </div>

                <div className="pt-4 space-y-2">
                  <Button 
                    onClick={() => handleSave(false)}
                    variant="outline"
                    className="w-full"
                    disabled={isSaving || !competition}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Save Draft
                  </Button>
                  <Button 
                    onClick={() => handleSave(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    disabled={isSaving || !competition}
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                    Publish Selection
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
            {competition ? (
              isTopClub ? (
                <TopClubSelectionGrid
                  members={members}
                  selections={selections}
                  selectedEmails={selectedEmails}
                  onSelectionChange={handleSelectionChange}
                  matchDate={matchDate}
                  unavailabilities={unavailabilities}
                />
              ) : (
                <RinkSelectionGrid
                  members={members}
                  selections={selections}
                  selectedEmails={selectedEmails}
                  onSelectionChange={handleSelectionChange}
                  matchDate={matchDate}
                  unavailabilities={unavailabilities}
                />
              )
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-gray-500">
                  Select a competition to start building your team
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}