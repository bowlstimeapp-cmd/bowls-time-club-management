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
import { Settings, Loader2, Save, ShieldAlert, Users, Upload, Image, Trophy, Plus, Pencil, Trash2, CreditCard, Tv, DoorOpen, Key, RefreshCw, Palette, ExternalLink, FileUp, Monitor, ClipboardList } from 'lucide-react';
import { Textarea } from "@/components/ui/textarea";
import CustomSessionEditor from '@/components/booking/CustomSessionEditor';
import AccoladesSection from '@/components/accolades/AccoladesSection';
import TeamSheetTemplateSettings from '@/components/selection/TeamSheetTemplateSettings';
import BulkBookingImportModal from '@/components/booking/BulkBookingImportModal';
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
  const [useCustomSessions, setUseCustomSessions] = useState(false);
  const [customSessions, setCustomSessions] = useState([]);
  const [autoApprove, setAutoApprove] = useState(false);
  const [openRollups, setOpenRollups] = useState(false);
  const [privateRollups, setPrivateRollups] = useState(false);
  const [emailMemberNotifications, setEmailMemberNotifications] = useState(true);
  const [smsMemberNotifications, setSmsMemberNotifications] = useState(false);
  const [defaultLandingPage, setDefaultLandingPage] = useState('rink_booking');
  const [membershipTypes, setMembershipTypes] = useState(ALL_MEMBERSHIP_TYPES);
  const [membershipFeeEnabled, setMembershipFeeEnabled] = useState(false);
  const [membershipFeeAmount, setMembershipFeeAmount] = useState('');
  const [membershipFeeDescription, setMembershipFeeDescription] = useState('');
  const [tvCycleSeconds, setTvCycleSeconds] = useState(30);
  const [altViewSelection, setAltViewSelection] = useState(false);
  const [altViewLeagues, setAltViewLeagues] = useState(false);
  const [scorecardFormat, setScorecardFormat] = useState('pdf');
  const [useCustomScorecardLayout, setUseCustomScorecardLayout] = useState(false);
  const [importBookingsOpen, setImportBookingsOpen] = useState(false);
  const [teamSheetSettings, setTeamSheetSettings] = useState({});
  const [stripePublishableKey, setStripePublishableKey] = useState('');
  const [stripeSecretKey, setStripeSecretKey] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [competitionModalOpen, setCompetitionModalOpen] = useState(false);
  const [editingCompetition, setEditingCompetition] = useState(null);
  const [competitionForm, setCompetitionForm] = useState({
    name: '',
    players_per_rink: 4,
    home_rinks: 2,
    away_rinks: 0,
    gender: 'mixed',
    age_group: 'n/a'
  });
  const [kioskModeEnabled, setKioskModeEnabled] = useState(false);
  const [kioskAccountEmail, setKioskAccountEmail] = useState('');
  const [assigningMemberIds, setAssigningMemberIds] = useState(false);
  const [memberIdAssignResult, setMemberIdAssignResult] = useState(null);
  const [competitionRegistrationEnabled, setCompetitionRegistrationEnabled] = useState(false);
  const [competitionPageHeader, setCompetitionPageHeader] = useState('');

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

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId,
  });

  useEffect(() => {
    if (club) {
      setRinkCount(club.rink_count || 6);
      setOpeningTime(club.opening_time || '10:00');
      setClosingTime(club.closing_time || '21:00');
      setSessionDuration(club.session_duration || 2);
      setUseCustomSessions(club.use_custom_sessions || false);
      setCustomSessions(club.custom_sessions || []);
      setAutoApprove(club.auto_approve_bookings || false);
      setOpenRollups(club.open_rollups || false);
      setPrivateRollups(club.private_rollups || false);
      setEmailMemberNotifications(club.email_member_notifications !== false);
      setSmsMemberNotifications(club.sms_member_notifications || false);
      setDefaultLandingPage(club.default_landing_page || 'rink_booking');
      setMembershipTypes(club.membership_types || ALL_MEMBERSHIP_TYPES);
      setLogoUrl(club.logo_url || '');
      setMembershipFeeEnabled(club.membership_fee_enabled || false);
      setMembershipFeeAmount(club.membership_fee_amount_pence ? (club.membership_fee_amount_pence / 100).toString() : '');
      setMembershipFeeDescription(club.membership_fee_description || '');
      setStripePublishableKey(club.stripe_publishable_key || '');
      setStripeSecretKey(club.stripe_secret_key || '');
      setTvCycleSeconds(club.tv_display_cycle_seconds || 30);
      setAltViewSelection(club.alt_view_selection || false);
      setAltViewLeagues(club.alt_view_leagues || false);
      setScorecardFormat(club.scorecard_format || 'pdf');
      setUseCustomScorecardLayout(club.use_custom_scorecard_layout || false);
      setKioskModeEnabled(club.kiosk_mode_enabled || false);
      setKioskAccountEmail(club.kiosk_account_email || '');
      setCompetitionRegistrationEnabled(club.competition_registration_enabled || false);
      setCompetitionPageHeader(club.competition_page_header || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [club?.id]);

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
      season: 'indoor',
      gender: 'mixed',
      age_group: 'n/a'
    });
  };

  const handleEditCompetition = (competition) => {
    setEditingCompetition(competition);
    setCompetitionForm({
      name: competition.name,
      players_per_rink: competition.players_per_rink,
      home_rinks: competition.home_rinks,
      away_rinks: competition.away_rinks || 0,
      season: competition.season || 'indoor',
      gender: competition.gender || 'mixed',
      age_group: competition.age_group || 'n/a'
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
      use_custom_sessions: useCustomSessions,
      custom_sessions: useCustomSessions ? customSessions : [],
      auto_approve_bookings: autoApprove,
      open_rollups: openRollups,
      private_rollups: privateRollups,
      email_member_notifications: emailMemberNotifications,
      sms_member_notifications: smsMemberNotifications,
      membership_types: membershipTypes,
      logo_url: logoUrl,
      default_landing_page: defaultLandingPage,
      membership_fee_enabled: membershipFeeEnabled,
      membership_fee_amount_pence: membershipFeeAmount ? Math.round(parseFloat(membershipFeeAmount) * 100) : null,
      membership_fee_description: membershipFeeDescription,
      stripe_publishable_key: stripePublishableKey || null,
      stripe_secret_key: stripeSecretKey || null,
      tv_display_cycle_seconds: parseInt(tvCycleSeconds) || 30,
      alt_view_selection: altViewSelection,
      alt_view_leagues: altViewLeagues,
      scorecard_format: scorecardFormat,
      use_custom_scorecard_layout: useCustomScorecardLayout,
      kiosk_mode_enabled: kioskModeEnabled,
      kiosk_account_email: kioskAccountEmail || null,
      competition_registration_enabled: competitionRegistrationEnabled,
      competition_page_header: competitionPageHeader || null,
      ...teamSheetSettings,
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
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <Label className="text-base">Custom Session Times</Label>
                    <p className="text-sm text-gray-500">Define specific session time ranges instead of a fixed duration</p>
                  </div>
                  <Switch checked={useCustomSessions} onCheckedChange={setUseCustomSessions} />
                </div>
                {!useCustomSessions ? (
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
                ) : (
                  <div>
                    <Label className="mb-2 block">Session Time Ranges</Label>
                    <p className="text-xs text-gray-500 mb-3">Define sessions within {openingTime}–{closingTime}. Minimum 15-minute intervals.</p>
                    <CustomSessionEditor
                      sessions={customSessions}
                      onChange={setCustomSessions}
                      openingTime={openingTime}
                      closingTime={closingTime}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Settings</CardTitle>
                <CardDescription>
                  Configure how bookings are handled
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label className="text-base">Open Roll-ups</Label>
                    <p className="text-sm text-gray-500">
                      Allow members to join roll-up sessions booked by others (max 8 per session)
                    </p>
                  </div>
                  <Switch
                    checked={openRollups}
                    onCheckedChange={(v) => {
                      setOpenRollups(v);
                      if (!v) setPrivateRollups(false);
                    }}
                  />
                </div>
                {openRollups && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-base">Private Roll-ups</Label>
                      <p className="text-sm text-gray-500">
                        Add a "Private Roll-up" competition type (treated the same as Club/County etc, not joinable)
                      </p>
                    </div>
                    <Switch
                      checked={privateRollups}
                      onCheckedChange={setPrivateRollups}
                    />
                  </div>
                )}
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
                    <div key={type} className="flex items-center gap-3">
                      <Checkbox 
                        id={`mtype-${type}`}
                        checked={membershipTypes.includes(type)}
                        onCheckedChange={() => toggleMembershipType(type)}
                      />
                      <label htmlFor={`mtype-${type}`} className="cursor-pointer select-none">{type}</label>
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

            {club?.module_homepage && (
              <Card>
                <CardHeader>
                  <CardTitle>Homepage Settings</CardTitle>
                  <CardDescription>Configure the club homepage landing behaviour</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Default Landing Page</Label>
                    <p className="text-sm text-gray-500 mb-2">Choose what members see first when entering your club.</p>
                    <Select value={defaultLandingPage} onValueChange={setDefaultLandingPage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rink_booking">Rink Booking</SelectItem>
                        <SelectItem value="homepage">Club Homepage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scorecard Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Scorecard Format
                </CardTitle>
                <CardDescription>
                  Choose whether scorecards are generated as PDF or Excel (XLSX) files
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Select value={scorecardFormat} onValueChange={setScorecardFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF — Print-ready scorecard sheets (default)</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX) — One sheet per fixture, editable in Excel or Google Sheets</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Alternative Views */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Alternative Page Views
                </CardTitle>
                <CardDescription>
                  Switch specific pages to a cleaner, table-based layout
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Selection — Table View</Label>
                    <p className="text-sm text-gray-500">Show team selections as a compact table instead of cards</p>
                  </div>
                  <Switch checked={altViewSelection} onCheckedChange={setAltViewSelection} />
                </div>
                <div className="flex items-center justify-between pt-4 border-t">
                  <div>
                    <Label className="text-base">League Admin — Table View</Label>
                    <p className="text-sm text-gray-500">Show the League Admin page as a compact table/accordion instead of cards</p>
                  </div>
                  <Switch checked={altViewLeagues} onCheckedChange={setAltViewLeagues} />
                </div>
              </CardContent>
            </Card>

            {/* TV Display */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tv className="w-5 h-5" />
                  TV / Display Board
                </CardTitle>
                <CardDescription>
                  Configure the fullscreen rink display for TVs and monitors in the clubhouse
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label>Day cycle duration (seconds)</Label>
                  <p className="text-sm text-gray-500 mb-2">How long to show each day before switching between Today and Tomorrow.</p>
                  <Input
                    type="number"
                    min="5"
                    max="300"
                    value={tvCycleSeconds}
                    onChange={(e) => setTvCycleSeconds(e.target.value)}
                    className="w-32"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Membership Payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5" />
                  Membership Payments (Stripe)
                </CardTitle>
                <CardDescription>
                  Enable online membership fee collection via Stripe. Optionally provide your own Stripe keys so payments go directly to your club account.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Membership Fee Collection</Label>
                    <p className="text-sm text-gray-500">Show a payment option on member profiles</p>
                  </div>
                  <Switch checked={membershipFeeEnabled} onCheckedChange={setMembershipFeeEnabled} />
                </div>
                {membershipFeeEnabled && (
                  <>
                    <div>
                      <Label>Fee Amount (£)</Label>
                      <Input type="number" min="0" step="0.01" value={membershipFeeAmount} onChange={e => setMembershipFeeAmount(e.target.value)} placeholder="e.g. 50.00" />
                    </div>
                    <div>
                      <Label>Payment Description</Label>
                      <Input value={membershipFeeDescription} onChange={e => setMembershipFeeDescription(e.target.value)} placeholder="e.g. Annual Membership 2024/25" />
                    </div>
                    <div className="border-t pt-4 space-y-3">
                      <p className="text-sm font-medium text-gray-700">Your Stripe Keys (optional)</p>
                      <p className="text-xs text-gray-500">Leave blank to use the platform Stripe account. Provide your own keys to receive payments directly into your Stripe account.</p>
                      <div>
                        <Label>Stripe Publishable Key</Label>
                        <Input value={stripePublishableKey} onChange={e => setStripePublishableKey(e.target.value)} placeholder="pk_live_..." />
                      </div>
                      <div>
                        <Label>Stripe Secret Key</Label>
                        <Input type="password" value={stripeSecretKey} onChange={e => setStripeSecretKey(e.target.value)} placeholder="sk_live_..." />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Custom Scorecard Layout */}
            {club?.module_custom_branding && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Custom Scorecard Layout
                  </CardTitle>
                  <CardDescription>
                    Design a custom scorecard layout for this club. When enabled, the scorecard generator will use your custom layout.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Use Custom Scorecard Layout</Label>
                      <p className="text-sm text-gray-500">Override the default scorecard design with your custom layout</p>
                    </div>
                    <Switch
                      checked={useCustomScorecardLayout}
                      onCheckedChange={setUseCustomScorecardLayout}
                    />
                  </div>
                  {useCustomScorecardLayout && (
                    <div className="pt-2">
                      <Link to={createPageUrl('ScorecardLayoutEditor') + `?clubId=${clubId}`}>
                        <Button type="button" variant="outline" className="w-full border-blue-300 text-blue-700 hover:bg-blue-50">
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Edit Layout
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Function Room API Key */}
            {club?.module_function_rooms && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DoorOpen className="w-5 h-5" />
                    Function Room Bookings — API Key
                  </CardTitle>
                  <CardDescription>
                    This key authenticates requests from your external website to the function room availability and booking API.
                    Keep it secret — only share with your authorised external app.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={club?.function_room_api_key || '(no key generated yet)'}
                      className="font-mono text-sm"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        const newKey = 'frk_' + crypto.randomUUID().replace(/-/g, '');
                        await base44.entities.Club.update(clubId, { function_room_api_key: newKey });
                        queryClient.invalidateQueries({ queryKey: ['club', clubId] });
                        toast.success('New API key generated');
                      }}
                    >
                      <RefreshCw className="w-4 h-4 mr-1" />
                      {club?.function_room_api_key ? 'Regenerate' : 'Generate'}
                    </Button>
                  </div>
                  {club?.function_room_api_key && (
                    <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-2">
                      <p className="font-semibold text-gray-800">API Usage</p>
                      <p>POST to your function endpoint with JSON body. Two routes:</p>
                      <p className="font-mono bg-white rounded p-2 border">
                        {'{'}"route": "check_availability", "club_id": "{clubId}", "api_key": "YOUR_KEY", "date": "2024-06-01", "start_time": "14:00", "duration_hours": 2{'}'}
                      </p>
                      <p className="font-mono bg-white rounded p-2 border">
                        {'{'}"route": "submit_booking", "club_id": "{clubId}", "api_key": "YOUR_KEY", "room_id": "ROOM_ID", "date": "2024-06-01", "start_time": "14:00", "duration_hours": 2, "contact_name": "John Smith", "contact_email": "john@example.com"{'}'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Accolades */}
            <AccoladesSection
              clubId={clubId}
              moduleEnabled={!!club?.module_accolades}
              members={members}
              onToggleModule={async (v) => {
                await base44.entities.Club.update(clubId, { module_accolades: v });
                queryClient.invalidateQueries({ queryKey: ['club', clubId] });
                toast.success(v ? 'Accolades enabled' : 'Accolades disabled');
              }}
            />

            {/* Team Sheet Print Template */}
            {club?.module_selection !== false && (
              <TeamSheetTemplateSettings club={club} onChange={setTeamSheetSettings} />
            )}

            {/* Kiosk Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="w-5 h-5" />
                  Kiosk Mode
                </CardTitle>
                <CardDescription>
                  Enable a touchscreen kiosk at the clubhouse where members log in with a unique numeric ID to book rinks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Kiosk Mode</Label>
                    <p className="text-sm text-gray-500">Show a member login screen when the kiosk account is used</p>
                  </div>
                  <Switch checked={kioskModeEnabled} onCheckedChange={setKioskModeEnabled} />
                </div>

                {kioskModeEnabled && (
                  <>
                    <div>
                      <Label>Kiosk Account</Label>
                      <p className="text-sm text-gray-500 mb-2">Select the club member whose login will be the dedicated kiosk terminal</p>
                      <select
                        className="w-full border border-input bg-transparent rounded-md px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={kioskAccountEmail}
                        onChange={(e) => setKioskAccountEmail(e.target.value)}
                      >
                        <option value="">— Select kiosk account —</option>
                        {members.map(m => (
                          <option key={m.id} value={m.user_email}>
                            {m.first_name && m.surname ? `${m.first_name} ${m.surname}` : m.user_name || m.user_email} ({m.user_email})
                          </option>
                        ))}
                      </select>
                    </div>

                    {kioskAccountEmail && (
                      <div className="border-t pt-4">
                        <p className="text-sm font-medium text-gray-700 mb-2">Assign Member IDs</p>
                        <p className="text-sm text-gray-500 mb-3">
                          Generate unique 5-digit IDs for any approved members who don't have one yet. Members use this ID to log into the kiosk.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={assigningMemberIds}
                          onClick={async () => {
                            setAssigningMemberIds(true);
                            setMemberIdAssignResult(null);
                            const needsId = members.filter(m => !m.member_id);
                            if (needsId.length === 0) {
                              setMemberIdAssignResult('All members already have a Member ID assigned.');
                              setAssigningMemberIds(false);
                              return;
                            }
                            // Collect existing IDs
                            const usedIds = new Set(members.map(m => m.member_id).filter(Boolean));
                            const generateId = () => {
                              let id;
                              do { id = String(Math.floor(10000 + Math.random() * 90000)); } while (usedIds.has(id));
                              usedIds.add(id);
                              return id;
                            };
                            for (const m of needsId) {
                              await base44.entities.ClubMembership.update(m.id, { member_id: generateId() });
                            }
                            queryClient.invalidateQueries({ queryKey: ['clubMembers', clubId] });
                            setMemberIdAssignResult(`✓ ${needsId.length} member(s) assigned new IDs.`);
                            setAssigningMemberIds(false);
                          }}
                        >
                          {assigningMemberIds ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Assigning...</> : 'Assign Member IDs'}
                        </Button>
                        {memberIdAssignResult && (
                          <p className="text-sm text-emerald-700 mt-2 font-medium">{memberIdAssignResult}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Competition Registration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Competition Registration
                </CardTitle>
                <CardDescription>
                  Allow members to enter club competitions directly from the app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Enable Competition Registration</Label>
                    <p className="text-sm text-gray-500">Show the Competition Registration page to all approved members</p>
                  </div>
                  <Switch checked={competitionRegistrationEnabled} onCheckedChange={setCompetitionRegistrationEnabled} />
                </div>
                {competitionRegistrationEnabled && (
                  <div>
                    <Label>Page Header Message</Label>
                    <p className="text-sm text-gray-500 mb-2">Optional wording shown at the top of the Competition Registration page (e.g. entry conditions, payment instructions). Leave blank to show nothing.</p>
                    <Textarea
                      value={competitionPageHeader}
                      onChange={e => setCompetitionPageHeader(e.target.value)}
                      placeholder="e.g. Entry fees are payable to the Club Treasurer. Contact secretary@club.com for queries."
                      rows={4}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Import Bookings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileUp className="w-5 h-5" />
                  Import Bookings
                </CardTitle>
                <CardDescription>
                  Bulk-import bookings from a CSV file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setImportBookingsOpen(true)}
                  className="w-full"
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Import Bookings from CSV
                </Button>
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

        <BulkBookingImportModal
          open={importBookingsOpen}
          onClose={() => setImportBookingsOpen(false)}
          clubId={clubId}
          onSuccess={() => {
            toast.success('Bookings imported successfully');
            setImportBookingsOpen(false);
          }}
        />

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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={competitionForm.gender || 'mixed'}
                      onValueChange={(value) => setCompetitionForm({ ...competitionForm, gender: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mixed">Mixed</SelectItem>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Age Group</Label>
                    <Select
                      value={competitionForm.age_group || 'n/a'}
                      onValueChange={(value) => setCompetitionForm({ ...competitionForm, age_group: value })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="n/a">N/A</SelectItem>
                        <SelectItem value="u25">Under 25</SelectItem>
                        <SelectItem value="o60">Over 60</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
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