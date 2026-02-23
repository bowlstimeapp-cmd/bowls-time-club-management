import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User, Save, Calendar, Trash2, Plus, Bell, CalendarCheck, ClipboardList, Trophy, Table2, Users } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format, parseISO } from 'date-fns';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Profile() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [firstName, setFirstName] = useState('');
  const [surname, setSurname] = useState('');
  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setFirstName(currentUser.first_name || '');
      setSurname(currentUser.surname || '');
      setPhone(currentUser.phone || '');
    };
    loadUser();
  }, []);

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
      updateMembershipMutation.mutate({ 
        id: membership.id, 
        data: { email_notifications: checked } 
      });
    }
  };

  const handleSmsNotificationsChange = (checked) => {
    setSmsNotifications(checked);
    if (membership) {
      updateMembershipMutation.mutate({ 
        id: membership.id, 
        data: { sms_notifications: checked } 
      });
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
      phone: phone.trim()
    });
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="John"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="surname">Surname *</Label>
                    <Input
                      id="surname"
                      value={surname}
                      onChange={(e) => setSurname(e.target.value)}
                      placeholder="Smith"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07123 456789"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {clubId && membership && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-600" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>
                  Manage how you receive notifications from the club
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-gray-500">
                      Receive emails when you are selected for matches
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={handleEmailNotificationsChange}
                  />
                </div>
                {club?.module_sms_notifications && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div>
                      <Label className="text-base">SMS Notifications</Label>
                      <p className="text-sm text-gray-500">
                        {phone ? 'Receive SMS when you are selected for matches' : 'Add a phone number above to enable SMS notifications'}
                      </p>
                    </div>
                    <Switch
                      checked={smsNotifications}
                      onCheckedChange={handleSmsNotificationsChange}
                      disabled={!phone}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-600" />
                Unavailability
              </CardTitle>
              <CardDescription>
                Add dates when you're not available for selection (e.g., holidays)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleAddUnavailability}
                    disabled={addUnavailabilityMutation.isPending}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>

              {loadingUnavailabilities ? (
                <div className="text-center py-4">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                </div>
              ) : unavailabilities.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No unavailability dates set
                </p>
              ) : (
                <div className="space-y-2">
                  {unavailabilities.map(item => (
                    <div 
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <span className="text-sm">
                        {format(parseISO(item.start_date), 'd MMM yyyy')}
                        {item.start_date !== item.end_date && (
                          <> — {format(parseISO(item.end_date), 'd MMM yyyy')}</>
                        )}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteUnavailabilityMutation.mutate(item.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  );
}