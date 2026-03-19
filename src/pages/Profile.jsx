import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, User, Save, Calendar, Trash2, Plus, Bell, CalendarCheck, ClipboardList, Trophy, Table2, Users, TriangleAlert, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import PayMembershipFeeCard from '@/components/payments/PayMembershipFeeCard';
import PasswordChangeCard from '@/components/profile/PasswordChangeCard';
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { useSearchParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const clubId = searchParams.get('clubId');
  const tabParam = searchParams.get('tab');
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('');
  const [knownAs, setKnownAs] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [membershipStartDate, setMembershipStartDate] = useState('');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFirstName(currentUser.first_name || '');
      setSurname(currentUser.surname || '');
      setPhone(currentUser.phone || '');
      setTitle(currentUser.title || '');
      setKnownAs(currentUser.known_as || '');
    };
    loadUser();
  }, []);

  const { data: myFeedback = [], isLoading: loadingFeedback } = useQuery({
    queryKey: ['myFeedback', user?.email],
    queryFn: () => base44.entities.Feedback.filter({ user_email: user.email }, '-created_date'),
    enabled: !!user?.email,
  });

  const { data: unavailabilities = [], isLoading: loadingUnavailabilities } = useQuery({
    queryKey: ['myUnavailabilities', user?.email],
    queryFn: () => base44.entities.UserUnavailability.filter({ user_email: user.email }, 'start_date'),
    enabled: !!user?.email,
  });

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

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const clubNavigation = [
    ...(club?.module_rink_booking !== false ? [
      { name: 'Book a Rink', href: createPageUrl('BookRink') + `?clubId=${clubId}`, icon: Calendar },
      { name: 'My Bookings', href: createPageUrl('MyBookings') + `?clubId=${clubId}`, icon: CalendarCheck },
    ] : []),
    ...(club?.module_selection !== false ? [
      { name: 'Selection', href: createPageUrl('Selection') + `?clubId=${clubId}`, icon: ClipboardList },
    ] : []),
    ...(club?.module_competitions !== false ? [
      { name: 'Competitions', href: createPageUrl('ClubTournaments') + `?clubId=${clubId}`, icon: Trophy },
    ] : []),
    ...(club?.module_leagues !== false ? [
      { name: 'Leagues', href: createPageUrl(isClubAdmin ? 'LeagueAdmin' : 'LeagueView') + `?clubId=${clubId}`, icon: Table2 },
      { name: 'My Teams', href: createPageUrl('MyLeagueTeam') + `?clubId=${clubId}`, icon: Users },
    ] : []),
  ];

  const isActive = (href) => {
    const [path] = href.split('?');
    return location.pathname === path;
  };

  useEffect(() => {
    if (membership) {
      setEmailNotifications(membership.email_notifications !== false);
      setSmsNotifications(membership.sms_notifications || false);
      setGender(membership.gender || '');
      setDateOfBirth(membership.date_of_birth || '');
      setMembershipStartDate(membership.membership_start_date || '');
      setEmergencyContactName(membership.emergency_contact_name || '');
      setEmergencyContactPhone(membership.emergency_contact_phone || '');
    }
  }, [membership]);

  const updateMembershipMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ClubMembership.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMembership'] });
      toast.success('Notification preferences updated');
    },
  });

  const handleEmailNotificationsChange = (checked) => {
    setEmailNotifications(checked);
    if (membership) {
      updateMembershipMutation.mutate({ id: membership.id, data: { email_notifications: checked } });
    }
  };

  const handleSmsNotificationsChange = (checked) => {
    setSmsNotifications(checked);
    if (membership) {
      updateMembershipMutation.mutate({ id: membership.id, data: { sms_notifications: checked } });
    }
  };

  const addUnavailabilityMutation = useMutation({
    mutationFn: (data) => base44.entities.UserUnavailability.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUnavailabilities'] });
      toast.success('Unavailability added');
      setStartDate('');
      setEndDate('');
    },
  });

  const deleteUnavailabilityMutation = useMutation({
    mutationFn: (id) => base44.entities.UserUnavailability.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myUnavailabilities'] });
      toast.success('Unavailability removed');
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !surname.trim()) {
      toast.error('Please enter both first name and surname');
      return;
    }
    setIsLoading(true);
    await base44.auth.updateMe({
      first_name: firstName.trim(),
      surname: surname.trim(),
      phone: phone.trim(),
      title: title.trim() || null,
      known_as: knownAs.trim() || null,
    });
    if (clubId && membership) {
      const memberUpdates = {
        phone: phone.trim() || null,
        title: title.trim() || null,
        gender: gender || null,
        date_of_birth: dateOfBirth || null,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
      };
      await base44.entities.ClubMembership.update(membership.id, memberUpdates);
      queryClient.invalidateQueries({ queryKey: ['myMembership'] });
    }
    toast.success('Profile updated successfully!');
    setIsLoading(false);
  };

  const handleAddUnavailability = () => {
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('End date must be after start date');
      return;
    }
    addUnavailabilityMutation.mutate({
      user_email: user.email,
      start_date: startDate,
      end_date: endDate
    });
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Log deletion request for platform admin to action
      await base44.entities.DeletionRequest.create({
        user_email: user.email,
        user_name: `${user.first_name || ''} ${user.surname || ''}`.trim() || user.email,
        requested_date: new Date().toISOString(),
        status: 'pending',
      });

      toast.success('Your deletion request has been submitted. Your account will be deleted within 7 days.');
      setShowDeleteConfirm(false);
      setDeleteConfirmText('');
      navigate(createPageUrl('Login'));
    } catch (err) {
      console.error(err);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 pb-safe">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your personal information</p>
        </motion.div>

        {clubId && club && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-6 max-w-2xl mx-auto"
          >
            <nav className="flex gap-2 overflow-x-auto pb-2">
              {clubNavigation.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </nav>
          </motion.div>
        )}
        
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="profile" className="flex items-center gap-2">
                <User className="w-4 h-4" />Profile
              </TabsTrigger>
              <TabsTrigger value="feedback" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />My Feedback
                {myFeedback.filter(f => f.admin_response).length > 0 && (
                  <span className="ml-1 bg-emerald-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">
                    {myFeedback.filter(f => f.admin_response).length}
                  </span>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            {/* Personal Info */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                    <User className="w-8 h-8 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>{firstName} {surname}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="title">Title</Label>
                      <Select value={title} onValueChange={setTitle}>
                        <SelectTrigger id="title"><SelectValue placeholder="Title" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={null}>—</SelectItem>
                          <SelectItem value="Mr">Mr</SelectItem>
                          <SelectItem value="Mrs">Mrs</SelectItem>
                          <SelectItem value="Miss">Miss</SelectItem>
                          <SelectItem value="Ms">Ms</SelectItem>
                          <SelectItem value="Dr">Dr</SelectItem>
                          <SelectItem value="Prof">Prof</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="John" required />
                    </div>
                    <div>
                      <Label htmlFor="surname">Surname *</Label>
                      <Input id="surname" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Smith" required />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="knownAs">Known As</Label>
                    <Input id="knownAs" value={knownAs} onChange={(e) => setKnownAs(e.target.value)} placeholder="Preferred name or nickname" />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input id="phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07123 456789" />
                  </div>
                  {clubId && membership && (
                    <>
                      <div>
                        <Label htmlFor="dob">Date of Birth</Label>
                        <Input id="dob" type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="gender">Gender</Label>
                          <Select value={gender} onValueChange={setGender}>
                            <SelectTrigger id="gender">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">Male</SelectItem>
                              <SelectItem value="Female">Female</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                              <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Membership Start Date</Label>
                          <Input value={membershipStartDate ? membershipStartDate : 'Not set'} disabled className="bg-gray-50" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label>Locker 1</Label>
                          <Input value={membership.locker_number || ''} disabled className="bg-gray-50" />
                        </div>
                        <div>
                          <Label>Locker 2</Label>
                          <Input value={membership.locker_number_2 || ''} disabled className="bg-gray-50" />
                        </div>
                      </div>
                      <p className="text-xs text-gray-400">Locker numbers and membership start date can only be changed by a club admin.</p>
                      <div className="pt-2 border-t">
                        <p className="text-sm font-medium text-gray-700 mb-3">Emergency Contact</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="emergencyContactName">Contact Name</Label>
                            <Input id="emergencyContactName" value={emergencyContactName} onChange={(e) => setEmergencyContactName(e.target.value)} placeholder="Jane Smith" />
                          </div>
                          <div>
                            <Label htmlFor="emergencyContactPhone">Contact Phone</Label>
                            <Input id="emergencyContactPhone" type="tel" value={emergencyContactPhone} onChange={(e) => setEmergencyContactPhone(e.target.value)} placeholder="07123 456789" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={isLoading}>
                    {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <><Save className="w-4 h-4 mr-2" />Save Changes</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Notifications */}
            {clubId && membership && (
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-emerald-600" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>Manage how you receive notifications from the club</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-base">Email Notifications</Label>
                      <p className="text-sm text-gray-500">Receive emails when you are selected for matches</p>
                    </div>
                    <Switch checked={emailNotifications} onCheckedChange={handleEmailNotificationsChange} />
                  </div>
                  {club?.module_sms_notifications && (
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div>
                        <Label className="text-base">SMS Notifications</Label>
                        <p className="text-sm text-gray-500">
                          {phone ? 'Receive SMS when you are selected for matches' : 'Add a phone number above to enable SMS notifications'}
                        </p>
                      </div>
                      <Switch checked={smsNotifications} onCheckedChange={handleSmsNotificationsChange} disabled={!phone} />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Unavailability */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                  Unavailability
                </CardTitle>
                <CardDescription>Add dates when you're not available for selection (e.g., holidays)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="flex-1">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleAddUnavailability} disabled={addUnavailabilityMutation.isPending} className="bg-emerald-600 hover:bg-emerald-700">
                      <Plus className="w-4 h-4 mr-1" />Add
                    </Button>
                  </div>
                </div>
                {loadingUnavailabilities ? (
                  <div className="text-center py-4"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
                ) : unavailabilities.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No unavailability dates set</p>
                ) : (
                  <div className="space-y-2">
                    {unavailabilities.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm">
                          {format(parseISO(item.start_date), 'd MMM yyyy')}
                          {item.start_date !== item.end_date && <> — {format(parseISO(item.end_date), 'd MMM yyyy')}</>}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => deleteUnavailabilityMutation.mutate(item.id)} className="text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Membership Fee */}
            {clubId && membership && club && (
              <PayMembershipFeeCard club={club} clubId={clubId} userEmail={user.email} />
            )}

            {/* Password Change */}
            <PasswordChangeCard user={user} />

            {/* Delete Account */}
            <Card className="shadow-lg border-red-100">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TriangleAlert className="w-5 h-5" />
                  Delete Account
                </CardTitle>
                <CardDescription>
                  Permanently delete your account and all associated data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-4">
                  Once deleted, your account cannot be recovered. All your bookings, memberships, and personal data will be permanently removed.
                </p>
                <Button
                  variant="outline"
                  className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete My Account
                </Button>
              </CardContent>
            </Card>
          </motion.div>
            </TabsContent>

            <TabsContent value="feedback">

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                {loadingFeedback ? (
                  <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
                ) : myFeedback.length === 0 ? (
                  <Card className="shadow-lg">
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-gray-500">You haven't submitted any feedback yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  myFeedback.map(fb => (
                    <Card key={fb.id} className="shadow-lg">
                      <CardContent className="p-5 space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={fb.category === 'bug' ? 'destructive' : fb.category === 'feature' ? 'default' : 'secondary'}>
                              {fb.category}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {(fb.status || 'new_feedback').replace('_', ' ')}
                            </Badge>
                          </div>
                          <span className="text-xs text-gray-400">{new Date(fb.created_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{fb.title}</p>
                          <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{fb.description}</p>
                        </div>
                        {fb.admin_response && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                            <p className="text-xs font-semibold text-emerald-700 mb-1 flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> Admin Response
                            </p>
                            <p className="text-sm text-emerald-800 whitespace-pre-wrap">{fb.admin_response}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Delete confirmation overlay */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowDeleteConfirm(false); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mx-auto mb-4">
                <TriangleAlert className="w-7 h-7 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Delete your account?</h2>
              <p className="text-sm text-gray-500 text-center mb-6">
                This action <span className="font-semibold text-gray-700">cannot be undone</span>. All your data including memberships, bookings, and preferences will be permanently deleted. Your account will be deleted within <span className="font-semibold text-gray-700">7 days</span>.
              </p>

              <div className="mb-5">
                <Label className="text-sm text-gray-700 mb-1.5 block">
                  Type <span className="font-semibold text-red-600">DELETE</span> to confirm
                </Label>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="border-red-200 focus-visible:ring-red-400"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                  disabled={isDeletingAccount}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || isDeletingAccount}
                >
                  {isDeletingAccount
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Deleting...</>
                    : <><Trash2 className="w-4 h-4 mr-2" />Delete Account</>
                  }
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}