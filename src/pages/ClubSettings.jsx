import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, Loader2, Save, ShieldAlert, Users, Upload, Image, Trophy, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from "sonner";
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const ALL_MEMBERSHIP_TYPES = [
  'Winter Indoor Member',
  'Summer Indoor Member',
  'Outdoor Member',
  'Social Member'
];

export default function ClubSettings() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);

  const [rinkCount, setRinkCount] = useState(6);
  const [openingTime, setOpeningTime] = useState('10:00');
  const [closingTime, setClosingTime] = useState('21:00');
  const [sessionDuration, setSessionDuration] = useState(2);
  const [autoApprove, setAutoApprove] = useState(false);
  const [emailMemberNotifications, setEmailMemberNotifications] = useState(true);
  const [smsMemberNotifications, setSmsMemberNotifications] = useState(false);
  const [defaultLandingPage, setDefaultLandingPage] = useState('rink_booking');
  const [membershipTypes, setMembershipTypes] = useState(ALL_MEMBERSHIP_TYPES);
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [competitionModalOpen, setCompetitionModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    players_per_rink: 4,
    home_rinks: 2,
    away_rinks: 0
  });

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

  const { data: club, isLoading: clubLoading } = useQuery({
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

  const { data: competitions = [] } = useQuery({
    queryKey: ['competitions', clubId],
    queryFn: () => base44.entities.Competition.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  useEffect(() => {
    if (club) {
      setRinkCount(club.rink_count || 6);
      setOpeningTime(club.opening_time || '10:00');
      setClosingTime(club.closing_time || '21:00');
      setSessionDuration(club.session_duration || 2);
      setAutoApprove(club.auto_approve_bookings || false);
      setEmailMemberNotifications(club.email_member_notifications !== false);
      setSmsMemberNotifications(club.sms_member_notifications || false);
      setDefaultLandingPage(club.default_landing_page || 'rink_booking');
      setMembershipTypes(club.membership_types || ALL_MEMBERSHIP_TYPES);
      setLogoUrl(club.logo_url || '');
    }
  }, [club]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingLogo(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setLogoUrl(file_url);
    setUploadingLogo(false);
    toast.success('Logo uploaded');
  };

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.Club.update(clubId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      toast.success('Settings saved successfully');
    },
  });

  const createCompetitionMutation = useMutation({
    mutationFn: (data) => base44.entities.Competition.create({ ...data, club_id: clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition created');
      setCompetitionModalOpen(false);
      resetCompetitionForm();
    },
  });

  const updateCompetitionMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Competition.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition updated');
      setCompetitionModalOpen(false);
      setEditingCompetition(null);
      resetCompetitionForm();
    },
  });

  const deleteCompetitionMutation = useMutation({
    mutationFn: (id) => base44.entities.Competition.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitions'] });
      toast.success('Competition deleted');
    },
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

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
          <p className="text-gray-600 mb-6">You need club admin privileges to access settings.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const toggleMembershipType = (type) => {
    if (membershipTypes.includes(type)) {
      setMembershipTypes(membershipTypes.filter(t => t !== type));
    } else {
      setMembershipTypes([...membershipTypes, type]);
    }
  };

  const resetCompetitionForm = () => {
    setCompetitionForm({
      name: '',
      players_per_rink: 4,
      home_rinks: 2,
      away_rinks: 0,
      season: 'indoor'
    });
  };

  const handleEditCompetition = (competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      name: competition.name,
      players_per_rink: competition.players_per_rink,
      home_rinks: competition.home_rinks,
      away_rinks: competition.away_rinks || 0,
      season: competition.season || 'indoor'
    });
    setCompetitionModalOpen(true);
  };

  const handleSaveCompetition = () => {
    if (!competitionForm.name.trim()) {
      toast.error('Please enter a competition name');
      return;
    }
    
    if (editingCompetition) {
      updateCompetitionMutation.mutate({ id: editingCompetition.id, data: competitionForm });
    } else {
      createCompetitionMutation.mutate(competitionForm);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({
      rink_count: parseInt(rinkCount),
      opening_time: openingTime,
      closing_time: closingTime,
      session_duration: parseInt(sessionDuration),
      auto_approve_bookings: autoApprove,
      email_member_notifications: emailMemberNotifications,
      sms_member_notifications: smsMemberNotifications,
      membership_types: membershipTypes,
      logo_url: logoUrl,
      default_landing_page: defaultLandingPage,
    });
  };

  if (clubLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Club Settings</h1>
          <p className="text-gray-600">{club?.name} • Configure club preferences</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Image className="w-5 h-5" />
                  Club Logo
                </CardTitle>
                <CardDescription>
                  Upload a logo for your club (appears on printable documents)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Club logo" className="w-20 h-20 object-contain rounded-lg border" />
                  ) : (
                    <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Image className="w-8 h-8 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <Label htmlFor="logo-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                        {uploadingLogo ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Upload className="w-4 h-4" />
                        )}
                        {logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </div>
                    </Label>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={uploadingLogo}
                    />
                    {logoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 text-red-600"
                        onClick={() => setLogoUrl('')}
                      >
                        Remove Logo
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Rink Configuration
                </CardTitle>
                <CardDescription>
                  Configure the number of rinks and operating hours
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Number of Rinks</Label>
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    value={rinkCount}
                    onChange={(e) => setRinkCount(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Opening Time</Label>
                    <Input
                      type="time"
                      value={openingTime}
                      onChange={(e) => setOpeningTime(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Closing Time</Label>
                    <Input
                      type="time"
                      value={closingTime}
                      onChange={(e) => setClosingTime(e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label>Session Duration (hours)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="4"
                    value={sessionDuration}
                    onChange={(e) => setSessionDuration(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Settings</CardTitle>
                <CardDescription>
                  Configure how bookings are handled
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Auto-approve Bookings</Label>
                    <p className="text-sm text-gray-500">
                      Automatically approve all new bookings without requiring admin approval
                    </p>
                  </div>
                  <Switch
                    checked={autoApprove}
                    onCheckedChange={setAutoApprove}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Configure how members receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Member Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Send email notifications to members when they are selected for matches
                    </p>
                  </div>
                  <Switch
                    checked={emailMemberNotifications}
                    onCheckedChange={setEmailMemberNotifications}
                  />
                </div>
                {club?.module_sms_notifications && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-base">SMS Member Notifications</Label>
                      <p className="text-sm text-gray-500">
                        Send SMS notifications to members when they are selected for matches
                      </p>
                    </div>
                    <Switch
                      checked={smsMemberNotifications}
                      onCheckedChange={setSmsMemberNotifications}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Membership Types
                </CardTitle>
                <CardDescription>
                  Select which membership types are available for your club
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {ALL_MEMBERSHIP_TYPES.map(type => (
                    <div 
                      key={type}
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => toggleMembershipType(type)}
                    >
                      <Checkbox 
                        checked={membershipTypes.includes(type)}
                        onCheckedChange={() => toggleMembershipType(type)}
                      />
                      <span>{type}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="w-5 h-5" />
                      Competitions
                    </CardTitle>
                    <CardDescription>
                      Define competitions for match selection
                    </CardDescription>
                  </div>
                  <Button 
                    type="button"
                    size="sm"
                    onClick={() => {
                      resetCompetitionForm();
                      setEditingCompetition(null);
                      setCompetitionModalOpen(true);
                    }} 
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {competitions.length === 0 ? (
                  <div className="py-8 text-center text-gray-500">
                    <Trophy className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No competitions defined yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {competitions.map(comp => (
                      <div key={comp.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{comp.name}</p>
                          <p className="text-sm text-gray-600">
                            {comp.players_per_rink} players • {comp.home_rinks} home • {comp.away_rinks || 0} away
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCompetition(comp)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCompetitionMutation.mutate(comp.id)}
                            className="text-red-600 hover:bg-red-50"
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

            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </form>
        </motion.div>

        {/* Competition Modal */}
        {competitionModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="max-w-md w-full">
              <CardHeader>
                <CardTitle>{editingCompetition ? 'Edit Competition' : 'Add Competition'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Competition Name *</Label>
                  <Input
                    value={competitionForm.name}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, name: e.target.value })}
                    placeholder="e.g., Bramley, Wessex League"
                  />
                </div>
                <div>
                  <Label>Players per Rink</Label>
                  <Input
                    type="number"
                    min="2"
                    max="6"
                    value={competitionForm.players_per_rink}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, players_per_rink: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Number of Home Rinks</Label>
                  <Input
                    type="number"
                    min="1"
                    max="6"
                    value={competitionForm.home_rinks}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, home_rinks: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Number of Away Rinks</Label>
                  <Input
                    type="number"
                    min="0"
                    max="6"
                    value={competitionForm.away_rinks}
                    onChange={(e) => setCompetitionForm({ ...competitionForm, away_rinks: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Season *</Label>
                  <Select
                    value={competitionForm.season}
                    onValueChange={(value) => setCompetitionForm({ ...competitionForm, season: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="indoor">Indoor</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setCompetitionModalOpen(false);
                      setEditingCompetition(null);
                      resetCompetitionForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    onClick={handleSaveCompetition}
                    disabled={createCompetitionMutation.isPending || updateCompetitionMutation.isPending}
                  >
                    {(createCompetitionMutation.isPending || updateCompetitionMutation.isPending) ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    {editingCompetition ? 'Update' : 'Create'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}