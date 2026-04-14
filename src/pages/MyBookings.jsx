import React, { useState, useEffect, useRef } from 'react';
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
import MyBookingsTour from '@/components/tour/MyBookingsTour';
import { getTourPausedStep, pauseTour, clearTourPause, TOUR_DATE_STRING } from '@/components/tour/NewUserTour';

// Fake cancelled booking from tour step 8 (in-memory only)
function buildTourCancelledBooking(userEmail, userName) {
  return {
    id: 'tour-cancelled',
    club_id: 'tour',
    rink_number: 2,
    date: TOUR_DATE_STRING,
    start_time: '09:00',
    end_time: '11:00',
    status: 'cancelled',
    competition_type: 'Private Roll-up',
    booker_name: userName,
    booker_email: userEmail,
    notes: '',
    rollup_members: [],
  };
}

// Fake upcoming bookings from tour step 11 (double session)
function buildTourUpcomingBookings(userEmail, userName) {
  return [
    {
      id: 'tour-upcoming-1',
      club_id: 'tour',
      rink_number: 1,
      date: TOUR_DATE_STRING,
      start_time: '09:00',
      end_time: '11:00',
      status: 'approved',
      competition_type: 'Club',
      booker_name: userName,
      booker_email: userEmail,
      notes: '',
      rollup_members: [],
    },
    {
      id: 'tour-upcoming-2',
      club_id: 'tour',
      rink_number: 1,
      date: TOUR_DATE_STRING,
      start_time: '11:00',
      end_time: '13:00',
      status: 'approved',
      competition_type: 'Club',
      booker_name: userName,
      booker_email: userEmail,
      notes: '',
      rollup_members: [],
    },
  ];
}

export default function MyBookings() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [tourStep, setTourStep] = useState(-1);
  const queryClient = useQueryClient();

  const pastTabRef = useRef(null);

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Check if tour is paused at step 13 (arrived at My Bookings from BookRink nav)
      const pausedStep = getTourPausedStep();
      if (pausedStep === 13) {
        clearTourPause();
        setTourStep(13);
      }
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

  const bookings = isAdmin
    ? allBookings.filter(b => {
        if (leagueBookingIds.has(b.id)) return false;
        if (b.admin_notes === '__selection__') return false;
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

  // Tour-specific in-memory bookings
  const isTourActive = tourStep >= 13 && tourStep <= 15;
  const userName = user
    ? (user.first_name && user.surname ? `${user.first_name} ${user.surname}` : (user.full_name || user.email))
    : '';
  const tourUpcoming = isTourActive ? buildTourUpcomingBookings(user?.email, userName) : [];
  const tourCancelled = isTourActive ? buildTourCancelledBooking(user?.email, userName) : null;

  const displayUpcoming = isTourActive ? tourUpcoming : upcomingBookings;
  const displayPast = isTourActive ? (tourCancelled ? [tourCancelled] : []) : pastBookings;

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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upcoming" className="flex items-center gap-2">
                <CalendarCheck className="w-4 h-4" />
                Upcoming ({isTourActive ? tourUpcoming.length : upcomingBookings.length})
              </TabsTrigger>
              <TabsTrigger ref={pastTabRef} value="past" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Past & Cancelled ({isTourActive ? (tourCancelled ? 1 : 0) : pastBookings.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming">
              {isLoading && !isTourActive ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : displayUpcoming.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {displayUpcoming.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isOwn={true}
                        onCancel={isTourActive ? undefined : handleCancelClick}
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
              {isLoading && !isTourActive ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : displayPast.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {displayPast.map(booking => (
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

        {/* Tour overlay for steps 13-15 */}
        {tourStep >= 13 && tourStep <= 15 && (
          <MyBookingsTour
            step={tourStep}
            setStep={setTourStep}
            activeTab={activeTab}
            pastTabRef={pastTabRef}
            onDismiss={() => setTourStep(-1)}
            onContinueLater={() => {
              // Pause at step 16 — user will resume from BookRink next visit
              pauseTour(16);
              setTourStep(-1);
            }}
            onContinueTour={() => {
              // Step 16 = Selection nav highlight; navigate to Selection page
              // We store step 17 so Selection page can pick it up, 
              // but first show step 16 (Selection nav) from within the Selection page itself
              pauseTour(16);
              navigate(createPageUrl('Selection') + `?clubId=${clubId}`);
            }}
          />
        )}
      </div>
    </div>
  );
}