import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Building2, 
  Users, 
  Clock, 
  CheckCircle,
  Loader2,
  ArrowRight,
  Search,
  Mail,
  LogOut
} from 'lucide-react';
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CreateFreeClubDialog from '@/components/club/CreateFreeClubDialog';

export default function ClubSelector() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // If the user arrived via the "Switch Clubs" button, skip the auto-redirect
  const isSwitchingClubs = searchParams.get('switchClubs') === 'true';

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Redirect to profile setup if name not set
      if (!currentUser.first_name || !currentUser.surname) {
        navigate(createPageUrl('ProfileSetup'));
        return;
      }
    };
    loadUser();
  }, [navigate]);

  const { data: clubs = [], isLoading: clubsLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: () => base44.entities.Club.filter({ is_active: true }),
  });

  const { data: memberships = [], isLoading: membershipsLoading } = useQuery({
    queryKey: ['myMemberships', user?.email],
    queryFn: () => base44.entities.ClubMembership.filter({ user_email: user.email }),
    enabled: !!user?.email,
  });

  const [requestSentModal, setRequestSentModal] = useState(false);
  const [createClubOpen, setCreateClubOpen] = useState(false);
  const [leaveClubConfirm, setLeaveClubConfirm] = useState(null);

  const requestMutation = useMutation({
    mutationFn: (clubId) => base44.functions.invoke('requestToJoinClub', {
      clubId,
      profile: {
        title: user.title || null,
        phone: user.phone || null,
        gender: user.gender || null,
        emergency_contact_name: user.emergency_contact_name || null,
        emergency_contact_phone: user.emergency_contact_phone || null,
      },
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      setRequestSentModal(true);
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error ||
        error?.data?.error ||
        error?.message ||
        'Failed to submit join request. Please try again.';
      toast.error(message);
    },
  });

  const leaveClubMutation = useMutation({
    mutationFn: (clubId) => base44.functions.invoke('leaveClub', { clubId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      setLeaveClubConfirm(null);
      toast.success('You have left the club');
    },
    onError: (error) => {
      const message =
        error?.response?.data?.error ||
        error?.data?.error ||
        error?.message ||
        'Failed to leave club. Please try again.';
      toast.error(message);
    },
  });

  const getMembershipStatus = (clubId) => {
    return memberships.find(m => m.club_id === clubId);
  };

  const handleJoinRequest = (clubId) => {
    requestMutation.mutate(clubId);
  };

  const getLandingPage = (club) => {
    if (club?.member_landing_page_enabled) return 'MemberDashboard';
    if (club?.module_homepage && club?.default_landing_page === 'homepage') return 'ClubHome';
    return 'BookRink';
  };

  const handleEnterClub = (clubId) => {
    const club = clubs.find(c => c.id === clubId);
    navigate(createPageUrl(getLandingPage(club)) + `?clubId=${clubId}`);
  };

  // Check for approved memberships and redirect if only one —
  // but skip this behaviour if the user is deliberately switching clubs
  const approvedMemberships = memberships.filter(m => m.status === 'approved');
  
  useEffect(() => {
    if (!isSwitchingClubs && !membershipsLoading && approvedMemberships.length === 1) {
      const club = clubs.find(c => c.id === approvedMemberships[0].club_id);
      navigate(createPageUrl(getLandingPage(club)) + `?clubId=${approvedMemberships[0].club_id}`);
    }
  }, [approvedMemberships, membershipsLoading, navigate, isSwitchingClubs, clubs]);

  const isLoading = clubsLoading || membershipsLoading;
  
  // Filter clubs by search query, then sort alphabetically
  const filteredClubs = clubs
    .filter(club => club.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Select Your Club
          </h1>
          <p className="text-gray-600 max-w-md mx-auto mb-6">
            Choose the lawn bowls club you belong to, or request to join a new club
          </p>
          
          {/* Search Input */}
          {clubs.length > 0 && (
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search clubs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          )}
        </motion.div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : clubs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Clubs Available</h3>
            <p className="text-gray-500">Please contact the platform administrator.</p>
          </motion.div>
        ) : filteredClubs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clubs found</h3>
            <p className="text-gray-500">Try a different search term</p>
          </motion.div>
        ) : (() => {
          const myClubs = filteredClubs.filter(c => getMembershipStatus(c.id)?.status === 'approved');
          const otherClubs = filteredClubs.filter(c => getMembershipStatus(c.id)?.status !== 'approved');

          const renderClubCard = (club, index) => {
            const membership = getMembershipStatus(club.id);
            const isPending = membership?.status === 'pending';
            const isApproved = membership?.status === 'approved';
            const isAdmin = membership?.role === 'admin';

            return (
              <motion.div
                key={club.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 overflow-hidden">
                  <CardContent className="p-0">
                    <div className="h-3 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          {club.logo_url ? (
                            <img src={club.logo_url} alt={club.name} className="w-12 h-12 rounded-lg object-contain bg-white border" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-emerald-600" />
                            </div>
                          )}
                          <div>
                            <h3 className="font-semibold text-gray-900">{club.name}</h3>
                            <p className="text-sm text-gray-500">{club.rink_count} rinks</p>
                          </div>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                          {club.club_tier === 'free' && (
                            <Badge className="bg-blue-100 text-blue-800 border-blue-200">Free Club</Badge>
                          )}
                          {isAdmin && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Admin</Badge>
                          )}
                        </div>
                      </div>

                      {club.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{club.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {club.opening_time?.slice(0,5)} - {club.closing_time?.slice(0,5)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {user?.role === 'admin' && (
                          <Button
                            onClick={() => navigate(createPageUrl('PlatformAdmin') + `?manageAdmins=${club.id}`)}
                            variant="outline" size="sm" className="w-full"
                          >
                            <Users className="w-4 h-4 mr-2" />
                            Manage Admins
                          </Button>
                        )}
                        {isApproved ? (
                          <>
                            <Button onClick={() => handleEnterClub(club.id)} className="w-full bg-emerald-600 hover:bg-emerald-700">
                              Enter Club
                              <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                            <Button
                              onClick={() => setLeaveClubConfirm(club)}
                              variant="outline"
                              size="sm"
                              className="w-full text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <LogOut className="w-4 h-4 mr-2" />
                              Leave Club
                            </Button>
                          </>
                        ) : isPending ? (
                          <Button disabled className="w-full" variant="outline">
                            <Clock className="w-4 h-4 mr-2" />
                            Awaiting Approval
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleJoinRequest(club.id)}
                            disabled={requestMutation.isPending}
                            className="w-full" variant="outline"
                          >
                            {requestMutation.isPending ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Users className="w-4 h-4 mr-2" />
                            )}
                            Request to Join
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          };

          return (
            <div className="space-y-8">
              {!membershipsLoading && (approvedMemberships.length === 0 || user?.role === 'admin') && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="p-6 text-center">
                    <Building2 className="w-10 h-10 mx-auto mb-3 text-emerald-600" />
                    <h3 className="font-semibold text-gray-900 mb-1">Don't have a club?</h3>
                    <p className="text-sm text-gray-600 mb-4">Create your own club and get started with Bowls Time for free.</p>
                    <Button onClick={() => setCreateClubOpen(true)} className="bg-emerald-600 hover:bg-emerald-700">
                      Create New Club
                    </Button>
                  </CardContent>
                </Card>
              )}
              {myClubs.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-base font-semibold text-gray-800">Your Clubs</h2>
                    <span className="text-sm text-gray-400">— clubs you're a member of</span>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AnimatePresence>
                      {myClubs.map((club, i) => renderClubCard(club, i))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {otherClubs.length > 0 && (
                <div>
                  {myClubs.length > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-5 h-5 text-gray-400" />
                      <h2 className="text-base font-semibold text-gray-800">Other Clubs</h2>
                      <span className="text-sm text-gray-400">— request to join</span>
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <AnimatePresence>
                      {otherClubs.map((club, i) => renderClubCard(club, i))}
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Request Sent Confirmation Modal */}
      <Dialog open={requestSentModal} onOpenChange={setRequestSentModal}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex justify-center mb-3 mt-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
              <Mail className="w-7 h-7 text-emerald-600" />
            </div>
          </div>
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Request Received</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm mt-2 mb-4">
            Your request has been received and a Club Admin will review it. You will be emailed when your request has been reviewed.
          </p>
          <button
            onClick={() => setRequestSentModal(false)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 rounded-lg text-sm transition-colors"
          >
            Got it
          </button>
        </DialogContent>
      </Dialog>

      {/* Leave Club Confirmation */}
      <Dialog open={!!leaveClubConfirm} onOpenChange={() => setLeaveClubConfirm(null)}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="text-center text-lg">Leave {leaveClubConfirm?.name}?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-500 text-sm mt-2 mb-4">
            You will no longer be a member of this club. You can request to rejoin at any time.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setLeaveClubConfirm(null)} disabled={leaveClubMutation.isPending}>
              Cancel
            </Button>
            <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={() => leaveClubMutation.mutate(leaveClubConfirm.id)} disabled={leaveClubMutation.isPending}>
              {leaveClubMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Leave Club
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateFreeClubDialog
        open={createClubOpen}
        onClose={() => setCreateClubOpen(false)}
        user={user}
        onCreated={(club) => {
          queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
          queryClient.invalidateQueries({ queryKey: ['clubs'] });
          navigate(createPageUrl('BookRink') + `?clubId=${club.id}`);
        }}
      />
    </div>
  );
}