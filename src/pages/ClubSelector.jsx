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
  Mail
} from 'lucide-react';
import { toast } from "sonner";
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils';

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

  const requestMutation = useMutation({
    mutationFn: (clubId) => base44.entities.ClubMembership.create({
      club_id: clubId,
      user_email: user.email,
      user_name: `${user.first_name} ${user.surname}`,
      first_name: user.first_name || '',
      surname: user.surname || '',
      title: user.title || null,
      phone: user.phone || null,
      gender: user.gender || null,
      emergency_contact_name: user.emergency_contact_name || null,
      emergency_contact_phone: user.emergency_contact_phone || null,
      role: 'member',
      status: 'pending'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myMemberships'] });
      setRequestSentModal(true);
    },
  });

  const getMembershipStatus = (clubId) => {
    return memberships.find(m => m.club_id === clubId);
  };

  const handleJoinRequest = (clubId) => {
    requestMutation.mutate(clubId);
  };

  const handleEnterClub = (clubId) => {
    const club = clubs.find(c => c.id === clubId);
    const useHomepage = club?.module_homepage && club?.default_landing_page === 'homepage';
    navigate(createPageUrl(useHomepage ? 'ClubHome' : 'BookRink') + `?clubId=${clubId}`);
  };

  // Check for approved memberships and redirect if only one —
  // but skip this behaviour if the user is deliberately switching clubs
  const approvedMemberships = memberships.filter(m => m.status === 'approved');
  
  useEffect(() => {
    if (!isSwitchingClubs && !membershipsLoading && approvedMemberships.length === 1) {
      navigate(createPageUrl('BookRink') + `?clubId=${approvedMemberships[0].club_id}`);
    }
  }, [approvedMemberships, membershipsLoading, navigate, isSwitchingClubs]);

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
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <AnimatePresence>
              {filteredClubs.map((club, index) => {
                const membership = getMembershipStatus(club.id);
                const isPending = membership?.status === 'pending';
                const isApproved = membership?.status === 'approved';
                const isRejected = membership?.status === 'rejected';
                const isAdmin = membership?.role === 'admin';

                return (
                  <motion.div
                    key={club.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-all duration-300 overflow-hidden">
                      <CardContent className="p-0">
                        <div className="h-3 bg-gradient-to-r from-emerald-500 to-emerald-600" />
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              {club.logo_url ? (
                                <img 
                                  src={club.logo_url} 
                                  alt={club.name}
                                  className="w-12 h-12 rounded-lg object-contain bg-white border"
                                />
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
                            {isAdmin && (
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                Admin
                              </Badge>
                            )}
                          </div>

                          {club.description && (
                            <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                              {club.description}
                            </p>
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
                               variant="outline"
                               size="sm"
                               className="w-full"
                             >
                               <Users className="w-4 h-4 mr-2" />
                               Manage Admins
                             </Button>
                           )}
                           {isApproved ? (
                             <Button 
                               onClick={() => handleEnterClub(club.id)}
                               className="w-full bg-emerald-600 hover:bg-emerald-700"
                             >
                               Enter Club
                               <ArrowRight className="w-4 h-4 ml-2" />
                             </Button>
                          ) : isPending ? (
                            <Button disabled className="w-full" variant="outline">
                              <Clock className="w-4 h-4 mr-2" />
                              Awaiting Approval
                            </Button>
                          ) : (
                            <Button 
                              onClick={() => handleJoinRequest(club.id)}
                              disabled={requestMutation.isPending}
                              className="w-full"
                              variant="outline"
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
              })}
            </AnimatePresence>
          </div>
        )}
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
    </div>
  );
}