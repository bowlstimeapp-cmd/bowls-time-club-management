import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX, CalendarCheck, Clock, Calendar } from 'lucide-react';
import { toast } from "sonner";
import { parseISO, isBefore, startOfToday } from 'date-fns';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BookingCard from '@/components/booking/BookingCard';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MyBookings() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const queryClient = useQueryClient();

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

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return memberships[0];
    },
    enabled: !!user?.email && !!clubId,
  });

  const { data: leagueFixtures = [] } = useQuery({
    queryKey: ['allLeagueFixtures', clubId],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: allBookings = [], isLoading } = useQuery({
    queryKey: ['myBookings', clubId, user?.email],
    queryFn: () => base44.entities.Booking.filter({ 
      club_id: clubId, 
      booker_email: user.email 
    }, '-date'),
    enabled: !!user?.email && !!clubId,
  });

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const leagueBookingIds = new Set(leagueFixtures.map(f => f.booking_id).filter(Boolean));

  // Hide league/selection-created bookings from admin's My Bookings
  const SELECTION_COMPETITION_TYPES = ['Bramley', 'Wessex League', 'Denny', 'Top Club'];
  const bookings = isAdmin
    ? allBookings.filter(b => {
        if (leagueBookingIds.has(b.id)) return false;
        if (SELECTION_COMPETITION_TYPES.includes(b.competition_type)) return false;
        return true;
      })
    : allBookings;

  const cancelMutation = useMutation({
    mutationFn: (booking) => base44.entities.Booking.update(booking.id, { status: 'cancelled' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      toast.success('Booking cancelled successfully');
      setCancelDialogOpen(false);
      setBookingToCancel(null);
    },
    onError: () => {
      toast.error('Failed to cancel booking');
    },
  });

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = () => {
    if (bookingToCancel) {
      cancelMutation.mutate(bookingToCancel);
    }
  };

  const today = startOfToday();
  const upcomingBookings = bookings.filter(b => 
    !isBefore(parseISO(b.date), today) && b.status !== 'cancelled' && b.status !== 'rejected'
  );
  const pastBookings = bookings.filter(b => 
    isBefore(parseISO(b.date), today) || b.status === 'cancelled' || b.status === 'rejected'
  );

  const EmptyState = ({ icon: Icon, title, description }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center py-12"
    >
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      <p className="text-gray-500">{description}</p>
    </motion.div>
  );

  if (!clubId) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            My Bookings
          </h1>
          <p className="text-gray-600">
            {club?.name} • View and manage your rink bookings
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Tabs defaultValue="upcoming" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Upcoming ({upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="past" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Past & Cancelled ({pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : upcomingBookings.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {upcomingBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isOwn={true}
                        onCancel={handleCancelClick}
                        isLoading={cancelMutation.isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarX}
                  title="No upcoming bookings"
                  description="Book a rink to get started"
                />
              )}
            </TabsContent>

            <TabsContent value="past">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : pastBookings.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pastBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isOwn={true}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={Calendar}
                  title="No past bookings"
                  description="Your booking history will appear here"
                />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <AlertDialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Booking</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmCancel}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, Cancel Booking
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}