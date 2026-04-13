import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfToday } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TimeSlotGrid from '@/components/booking/TimeSlotGrid';
import DateSelector from '@/components/booking/DateSelector';
import BookingModal from '@/components/booking/BookingModal';
import BulkBookingModal from '@/components/booking/BulkBookingModal';
import BookingDetailModal from '@/components/booking/BookingDetailModal';
import InfoTooltip from '@/components/InfoTooltip';
import { CalendarRange, Copy } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import NewUserTour, { isTourEnabled, hasTourBeenDismissed, TOUR_DATE, TOUR_DATE_STRING } from '@/components/tour/NewUserTour';
import TourBookingModal from '@/components/tour/TourBookingModal';

export default function BookRink() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [pastDateErrorOpen, setPastDateErrorOpen] = useState(false);
  const [bookingDetailOpen, setBookingDetailOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [user, setUser] = useState(null);
  const [joiningRollup, setJoiningRollup] = useState(false);
  const [deletingBooking, setDeletingBooking] = useState(false);
  const [bulkDeleteMode, setBulkDeleteMode] = useState(false);
  const [bulkDeleteSelected, setBulkDeleteSelected] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [copyMode, setCopyMode] = useState(false);

  // Tour state
  const [tourStep, setTourStep] = useState(-1); // -1 = not started
  const [tourBooking, setTourBooking] = useState(null); // temp in-memory booking (single)
  const [tourBookings2, setTourBookings2] = useState([]); // temp double session bookings
  const [tourModalOpen, setTourModalOpen] = useState(false); // tour booking modal step 2
  const [tourModal2Open, setTourModal2Open] = useState(false); // tour booking modal step 8
  const [tourModalSubStep, setTourModalSubStep] = useState('select'); // 'select' | 'submit'
  const tourSlot1Ref = useRef(null);
  const tourSlot2Ref = useRef(null);
  const tourSlot1_10Ref = useRef(null); // rink 1 @ 10:00
  const tourBookingCellRef = useRef(null); // ref to the moved booking cell
  const tourCancelBtnRef = useRef(null); // ref to cancel button in detail modal
  const tourNavRinkRef = useRef(null); // ref to "Rink Booking" nav button
  const tourNavMyBookingsRef = useRef(null); // ref to "My Bookings" nav item
  const tourBookBtnRef = useRef(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      // Check if tour should be shown
      if (isTourEnabled() && !(await hasTourBeenDismissed(currentUser))) {
        setTourStep(0);
      }
    };
    loadUser();
  }, []);

// ADD THIS:
useEffect(() => {
  window.scrollTo(0, 0);
}, []);

  // Redirect to club selector if no club selected
  useEffect(() => {
    if (!clubId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, navigate]);

  // Check membership
  const { data: membership, isLoading: membershipLoading } = useQuery({
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

  // Redirect if not approved member
  useEffect(() => {
    if (!membershipLoading && user && !membership?.status) {
      navigate(createPageUrl('ClubSelector'));
    } else if (!membershipLoading && membership && membership.status !== 'approved') {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [membership, membershipLoading, user, navigate]);

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ club_id: clubId, status: 'approved' }),
    enabled: !!clubId && !!club?.open_rollups,
  });

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const { data: leagueFixtures = [] } = useQuery({
    queryKey: ['leagueFixtures', clubId, dateString],
    queryFn: () => base44.entities.LeagueFixture.filter({ club_id: clubId, match_date: dateString }),
    enabled: !!clubId,
  });

  const { data: leagueTeams = [] } = useQuery({
    queryKey: ['leagueTeams', clubId],
    queryFn: () => base44.entities.LeagueTeam.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: leagues = [] } = useQuery({
    queryKey: ['leagues', clubId],
    queryFn: () => base44.entities.League.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: bookingsFromDB = [], isLoading } = useQuery({
    queryKey: ['bookings', clubId, dateString],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, date: dateString }),
    enabled: !!clubId,
  });

  // Merge in tour bookings (non-persistent) if on tour date
  const isTourDate = dateString === TOUR_DATE_STRING;
  const bookings = isTourDate
    ? [
        ...bookingsFromDB,
        ...(tourBooking ? [tourBooking] : []),
        ...tourBookings2,
      ]
    : bookingsFromDB;

  const createBookingMutation = useMutation({
    mutationFn: (bookingData) => base44.entities.Booking.create(bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: () => {
      toast.error('Failed to create booking. Please try again.');
    },
  });

  const isAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  const sendBookingChangeNotification = async (booking, type, extraMessage = '') => {
    if (!booking?.booker_email || booking.booker_email === user?.email) return;
    const messages = {
      moved: `Your booking on Rink ${booking.rink_number} at ${booking.start_time} on ${booking.date} has been moved by a club admin.${extraMessage}`,
      deleted: `Your booking on Rink ${booking.rink_number} at ${booking.start_time} on ${booking.date} has been cancelled by a club admin.`,
      swapped: `Your booking on Rink ${booking.rink_number} at ${booking.start_time} on ${booking.date} has been swapped with another booking by a club admin.${extraMessage}`,
    };
    const titles = { moved: 'Booking moved by admin', deleted: 'Booking cancelled by admin', swapped: 'Booking swapped by admin' };
    await Promise.all([
      base44.entities.Notification.create({
        user_email: booking.booker_email,
        type: 'booking_moved',
        title: titles[type],
        message: messages[type],
        related_id: booking.id,
        link_page: 'BookRink',
        link_params: `clubId=${clubId}`,
      }),
      base44.integrations.Core.SendEmail({
        to: booking.booker_email,
        subject: titles[type],
        body: `<p>Hi ${booking.booker_name},</p><p>${messages[type]}</p><p>Please log in to the app to check your bookings.</p>`,
      }),
    ]);
  };

  const handleDeleteBooking = async (booking) => {
    setDeletingBooking(true);
    await base44.entities.Booking.update(booking.id, { status: 'cancelled' });
    if (isAdmin && booking.booker_email !== user?.email) {
      await sendBookingChangeNotification(booking, 'deleted');
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success('Booking cancelled');
    setBookingDetailOpen(false);
    setSelectedBooking(null);
    setDeletingBooking(false);
  };

  const handleTourMoveBooking = (booking, newRink, newStartTime) => {
    if (booking.id !== 'tour-booking') return;
    let newEndTime;
    if (club?.use_custom_sessions && club?.custom_sessions?.length > 0) {
      const session = club.custom_sessions.find(s => s.start === newStartTime);
      newEndTime = session ? session.end : newStartTime;
    } else {
      const duration = club?.session_duration || 2;
      const [startHour, startMin = 0] = newStartTime.split(':').map(Number);
      const endMins = startHour * 60 + startMin + duration * 60;
      newEndTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }
    setTourBooking(prev => prev ? { ...prev, rink_number: newRink, start_time: newStartTime, end_time: newEndTime } : prev);
    setTourStep(4); // next: click the booking
  };

  const handleMoveBooking = async (booking, newRink, newStartTime) => {
    // Intercept tour move — only allow dropping onto rink 2 at 09:00
    if (tourStep === 3 && booking.id === 'tour-booking') {
      if (newRink === 2 && newStartTime === '09:00') {
        handleTourMoveBooking(booking, newRink, newStartTime);
      }
      return;
    }
    // Find end time from custom sessions or compute from duration
    let newEndTime;
    if (club?.use_custom_sessions && club?.custom_sessions?.length > 0) {
      const session = club.custom_sessions.find(s => s.start === newStartTime);
      newEndTime = session ? session.end : newStartTime;
    } else {
      const duration = club?.session_duration || 2;
      const [startHour, startMin = 0] = newStartTime.split(':').map(Number);
      const endMins = startHour * 60 + startMin + duration * 60;
      newEndTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }

    await base44.entities.Booking.update(booking.id, {
      rink_number: newRink,
      start_time: newStartTime,
      end_time: newEndTime,
    });

    if (isAdmin && booking.booker_email !== user?.email) {
      await sendBookingChangeNotification(
        booking, 'moved',
        ` It has been moved to Rink ${newRink} at ${newStartTime}.`
      );
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success(`Booking moved to Rink ${newRink} at ${newStartTime}`);
  };

  const handleSwapBookings = async (bookingA, bookingB) => {
    // Swap rink + time of two bookings
    await Promise.all([
      base44.entities.Booking.update(bookingA.id, {
        rink_number: bookingB.rink_number,
        start_time: bookingB.start_time,
        end_time: bookingB.end_time,
      }),
      base44.entities.Booking.update(bookingB.id, {
        rink_number: bookingA.rink_number,
        start_time: bookingA.start_time,
        end_time: bookingA.end_time,
      }),
    ]);

    // Notify both owners
    await Promise.all([
      sendBookingChangeNotification(bookingA, 'swapped', ` It has been swapped to Rink ${bookingB.rink_number} at ${bookingB.start_time}.`),
      sendBookingChangeNotification(bookingB, 'swapped', ` It has been swapped to Rink ${bookingA.rink_number} at ${bookingA.start_time}.`),
    ]);

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success('Bookings swapped');
  };

  const handleJoinRollup = async (booking) => {
    if (!user || joiningRollup) return;
    setJoiningRollup(true);
    const name = user.first_name && user.surname 
      ? `${user.first_name} ${user.surname}` 
      : (user.full_name || user.email);
    const updatedMembers = [...(booking.rollup_members || []), { email: user.email, name }];
    await base44.entities.Booking.update(booking.id, { rollup_members: updatedMembers });

    // Notify the original booker
    if (booking.booker_email && booking.booker_email !== user.email) {
      const joiningNames = updatedMembers
        .filter(m => m.email !== booking.booker_email)
        .map(m => m.name)
        .join(', ');
      await base44.entities.Notification.create({
        user_email: booking.booker_email,
        type: 'booking_accepted',
        title: 'Someone joined your Roll-up!',
        message: `${joiningNames} ${updatedMembers.filter(m => m.email !== booking.booker_email).length === 1 ? 'has' : 'have'} joined your roll-up on Rink ${booking.rink_number} at ${booking.start_time} on ${booking.date}.`,
        related_id: booking.id,
        link_page: 'BookRink',
        link_params: `clubId=${clubId}`,
      });
    }

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success("You've joined the roll-up!");
    setSelectedBooking(prev => prev ? { ...prev, rollup_members: updatedMembers } : prev);
    setJoiningRollup(false);
  };

  const handleConfirmBooking = async (notes, competitionType, competitionOther, rollupMembers = [], bookingFormat = '') => {
    if (!user || selectedSlots.length === 0 || !clubId) return;

    const status = club?.auto_approve_bookings ? 'approved' : 'pending';
    const bookerName = user.first_name && user.surname 
      ? `${user.first_name} ${user.surname}` 
      : (user.full_name || user.email);

    // Sort slots by index
    const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
    
    // Create a booking for each slot
    const bookingPromises = sortedSlots.map(slotData => 
      createBookingMutation.mutateAsync({
        club_id: clubId,
        rink_number: slotData.rink,
        date: dateString,
        start_time: slotData.slot.start,
        end_time: slotData.slot.end,
        status,
        competition_type: competitionType,
        competition_other: competitionType === 'Other' ? competitionOther : '',
        booking_format: bookingFormat || null,
        booker_name: bookerName,
        booker_email: user.email,
        notes: notes || '',
        rollup_members: competitionType === 'Roll-up' ? rollupMembers : [],
      })
    );

    await Promise.all(bookingPromises);
    
    setModalOpen(false);
    setSelectedSlots([]);
    
    const message = status === 'approved' 
      ? `${sortedSlots.length} booking(s) confirmed!` 
      : `${sortedSlots.length} booking request(s) submitted! Awaiting approval.`;
    toast.success(message);
  };

  const handleBookSelected = () => {
    if (selectedSlots.length === 0) return;

    // Tour step 2: open the tour booking modal (single slot)
    if (tourStep === 2) {
      setTourModalSubStep('select');
      setTourModalOpen(true);
      return;
    }

    // Tour step 7: open the tour booking modal (double session)
    if (tourStep === 7) {
      setTourModalSubStep('submit');
      setTourModal2Open(true);
      setTourStep(8);
      return;
    }

    // Validate booking is not in the past
    const now = new Date();
    const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
    const firstSlot = sortedSlots[0];
    
    const bookingDateTime = new Date(selectedDate);
    const [hours, minutes] = firstSlot.slot.start.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (bookingDateTime <= now) {
      setPastDateErrorOpen(true);
      return;
    }
    
    setModalOpen(true);
  };

  // Handle tour booking modal confirm (step 2 - single session)
  const handleTourBookingConfirm = (competitionType) => {
    const bookerName = user?.first_name && user?.surname
      ? `${user.first_name} ${user.surname}`
      : (user?.full_name || user?.email || 'You');
    const slot = selectedSlots[0];
    const tempBooking = {
      id: 'tour-booking',
      club_id: clubId,
      rink_number: slot.rink,
      date: TOUR_DATE_STRING,
      start_time: slot.slot.start,
      end_time: slot.slot.end,
      status: 'approved',
      competition_type: competitionType,
      booker_name: bookerName,
      booker_email: user?.email,
      notes: '',
      rollup_members: [],
    };
    setTourBooking(tempBooking);
    setTourModalOpen(false);
    setSelectedSlots([]);
    setTourStep(3);
  };

  // Handle tour booking modal confirm (step 8 - double session)
  const handleTourBookingConfirm2 = () => {
    const bookerName = user?.first_name && user?.surname
      ? `${user.first_name} ${user.surname}`
      : (user?.full_name || user?.email || 'You');
    const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
    const newBookings = sortedSlots.map((s, i) => ({
      id: `tour-booking-double-${i}`,
      club_id: clubId,
      rink_number: s.rink,
      date: TOUR_DATE_STRING,
      start_time: s.slot.start,
      end_time: s.slot.end,
      status: 'approved',
      competition_type: 'Club',
      booker_name: bookerName,
      booker_email: user?.email,
      notes: '',
      rollup_members: [],
    }));
    setTourBookings2(newBookings);
    setTourModal2Open(false);
    setSelectedSlots([]);
    setTourStep(9);
  };

  const handleBulkBooking = async (bulkData) => {
    if (!user || !clubId || !club) return;

    const status = club?.auto_approve_bookings ? 'approved' : 'pending';
    const bookerName = user.first_name && user.surname 
      ? `${user.first_name} ${user.surname}` 
      : (user.full_name || user.email);

    // Generate time slots between start and end time
    const slots = [];

    if (club.use_custom_sessions && club.custom_sessions?.length > 0) {
      // Use custom sessions that fall within the selected range
      const timeToMins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
      const startMins = timeToMins(bulkData.startTime);
      const endMins = timeToMins(bulkData.endTime);
      for (const session of club.custom_sessions) {
        const sStart = timeToMins(session.start);
        const sEnd = timeToMins(session.end);
        if (sStart >= startMins && sEnd <= endMins) {
          slots.push({ start_time: session.start, end_time: session.end });
        }
      }
    } else {
      const sessionDuration = club.session_duration || 2;
      const [startHour, startMin] = bulkData.startTime.split(':').map(Number);
      const [endHour, endMin] = bulkData.endTime.split(':').map(Number);
      let currentHour = startHour;
      let currentMin = startMin;
      while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
        const nextHour = currentHour + sessionDuration;
        const nextMin = currentMin;
        if (nextHour > endHour || (nextHour === endHour && nextMin > endMin)) break;
        const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
        const slotEnd = `${String(nextHour).padStart(2, '0')}:${String(nextMin).padStart(2, '0')}`;
        slots.push({ start_time: slotStart, end_time: slotEnd });
        currentHour = nextHour;
        currentMin = nextMin;
      }
    }

    // Create bookings for all rinks and all time slots
    const bookingPromises = [];
    for (const rinkNumber of bulkData.rinks) {
      for (const slot of slots) {
        bookingPromises.push(
          createBookingMutation.mutateAsync({
            club_id: clubId,
            rink_number: rinkNumber,
            date: dateString,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status,
            competition_type: bulkData.competitionType,
            competition_other: bulkData.competitionType === 'Other' ? bulkData.competitionOther : '',
            booker_name: bookerName,
            booker_email: user.email,
            notes: bulkData.notes || '',
          })
        );
      }
    }

    await Promise.all(bookingPromises);
    
    setBulkModalOpen(false);
    
    const message = status === 'approved' 
      ? `${bookingPromises.length} booking(s) created for ${bulkData.rinks.length} rink(s)!` 
      : `${bookingPromises.length} booking request(s) submitted! Awaiting approval.`;
    toast.success(message);
  };

  const handleCopyBooking = async (booking, newRink, newStartTime) => {
    let newEndTime;
    if (club?.use_custom_sessions && club?.custom_sessions?.length > 0) {
      const session = club.custom_sessions.find(s => s.start === newStartTime);
      newEndTime = session ? session.end : newStartTime;
    } else {
      const duration = club?.session_duration || 2;
      const [startHour, startMin = 0] = newStartTime.split(':').map(Number);
      const endMins = startHour * 60 + startMin + duration * 60;
      newEndTime = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;
    }

    await base44.entities.Booking.create({
      club_id: booking.club_id,
      rink_number: newRink,
      date: dateString,
      start_time: newStartTime,
      end_time: newEndTime,
      status: booking.status,
      competition_type: booking.competition_type,
      competition_other: booking.competition_other || '',
      booking_format: booking.booking_format || null,
      booker_name: booking.booker_name,
      booker_email: booking.booker_email,
      notes: booking.notes || '',
      admin_notes: booking.admin_notes || '',
      rollup_members: booking.rollup_members || [],
    });

    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success(`Booking copied to Rink ${newRink} at ${newStartTime}`);
  };

  // Clear selection when date changes
  useEffect(() => {
    setSelectedSlots([]);
    setBulkDeleteSelected([]);
    setBulkDeleteMode(false);
    setCopyMode(false);
  }, [dateString]);

  const handleBulkDeleteConfirm = async () => {
    if (bulkDeleteSelected.length === 0) return;
    setBulkDeleting(true);
    for (const bookingId of bulkDeleteSelected) {
      const booking = bookings.find(b => b.id === bookingId);
      await base44.entities.Booking.update(bookingId, { status: 'cancelled' });
      if (booking && booking.booker_email !== user?.email) {
        await sendBookingChangeNotification(booking, 'deleted');
      }
    }
    queryClient.invalidateQueries({ queryKey: ['bookings'] });
    toast.success(`${bulkDeleteSelected.length} booking(s) cancelled`);
    setBulkDeleteSelected([]);
    setBulkDeleteMode(false);
    setBulkDeleting(false);
  };

  const toggleBulkDeleteBooking = (bookingId) => {
    setBulkDeleteSelected(prev =>
      prev.includes(bookingId) ? prev.filter(id => id !== bookingId) : [...prev, bookingId]
    );
  };

  if (!clubId || membershipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-6">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12 py-8">
        <motion.div
          initial={{ opacity: 0}}
          animate={{ opacity: 1}}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Book a Rink
            </h1>
            <InfoTooltip content="Click an available slot to select it. You can select multiple consecutive slots on the same rink for a longer session. Booked slots can be clicked to view booking details. Once happy with your selection, press 'Book Slots' to confirm." />
          </div>
         <p className="text-gray-600">
  <span className="text-lg sm:text-xl font-semibold text-gray-900">
    {club?.name}
  </span>
  <span className="mx-1">•</span>
  Select an available slot to easily book a rink. 
</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0}}
          animate={{ opacity: 1}}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-white/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <DateSelector 
                  selectedDate={selectedDate} 
                  onDateChange={setSelectedDate} 
                />
                <div className="flex gap-2 flex-wrap">
                  {membership?.role === 'admin' && (
                    <>
                      <Button 
                        onClick={() => setBulkModalOpen(true)}
                        variant="outline"
                        className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                        disabled={bulkDeleteMode}
                      >
                        <CalendarRange className="w-4 h-4 mr-2" />
                        Bulk Booking
                      </Button>
                      {!copyMode && (
                        <Button
                          onClick={() => { setCopyMode(true); setBulkDeleteMode(false); setBulkDeleteSelected([]); setSelectedSlots([]); }}
                          variant="outline"
                          className="border-purple-500 text-purple-600 hover:bg-purple-50"
                          disabled={bulkDeleteMode}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy Mode
                        </Button>
                      )}
                      {copyMode && (
                        <Button variant="outline" className="border-purple-500 text-purple-600" onClick={() => setCopyMode(false)}>
                          Exit Copy Mode
                        </Button>
                      )}
                      {!bulkDeleteMode && !copyMode && (
                        <Button
                          onClick={() => { setBulkDeleteMode(true); setBulkDeleteSelected([]); setSelectedSlots([]); }}
                          variant="outline"
                          className="border-red-500 text-red-600 hover:bg-red-50"
                        >
                          <CalendarRange className="w-4 h-4 mr-2" />
                          Bulk Delete
                        </Button>
                      )}
                      {bulkDeleteMode && (
                        <>
                          <Button
                            onClick={handleBulkDeleteConfirm}
                            disabled={bulkDeleteSelected.length === 0 || bulkDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                          >
                            {bulkDeleting ? <><CalendarRange className="w-4 h-4 mr-2 animate-spin" />Deleting...</> : `Confirm Delete (${bulkDeleteSelected.length})`}
                          </Button>
                          <Button variant="outline" onClick={() => { setBulkDeleteMode(false); setBulkDeleteSelected([]); }}>
                            Cancel
                          </Button>
                        </>
                      )}
                    </>
                  )}
                  {!bulkDeleteMode && selectedSlots.length > 0 && (
                    <Button 
                      ref={tourBookBtnRef}
                      onClick={handleBookSelected}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      Book {selectedSlots.length} Slot{selectedSlots.length > 1 ? 's' : ''}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (
                <TimeSlotGrid
                  bookings={bookings}
                  selectedDate={selectedDate}
                  currentUserEmail={user?.email}
                  club={club}
                  selectedSlots={selectedSlots}
                  onMultiSlotSelect={(slots) => {
                    // Tour step 1: only allow clicking rink 1 at 9am
                    if (tourStep === 1) {
                      const isHighlightedSlot = slots.some(s => s.rink === 1 && s.slot.start === '09:00');
                      if (isHighlightedSlot) {
                        setSelectedSlots(slots);
                        setTourStep(2);
                      }
                      return;
                    }
                    // During tour steps 2-3, block further slot changes
                    if (tourStep >= 2 && tourStep <= 3) return;
                    // Tour step 6: only allow selecting rink 1 @ 9am and 10am
                    if (tourStep === 6) {
                      const validSlots = slots.filter(s => s.rink === 1 && (s.slot.start === '09:00' || s.slot.start === '10:00'));
                      setSelectedSlots(validSlots);
                      // When both are selected, advance to step 7
                      if (validSlots.length === 2) setTourStep(7);
                      return;
                    }
                    // Block interactions during other active tour steps
                    if ([4, 5, 7, 8, 9].includes(tourStep)) return;
                    setSelectedSlots(slots);
                  }}
                  onBookingClick={(booking) => {
                    // Block during early tour steps
                    if (tourStep >= 1 && tourStep <= 3) return;
                    // Tour step 4: only allow clicking the tour booking
                    if (tourStep === 4) {
                      if (booking.id === 'tour-booking') {
                        setSelectedBooking(booking);
                        setBookingDetailOpen(true);
                        setTourStep(5);
                      }
                      return;
                    }
                    // Block during steps 5-9
                    if ([5, 6, 7, 8, 9].includes(tourStep)) return;
                    setSelectedBooking(booking);
                    setBookingDetailOpen(true);
                  }}
                  onJoinRollup={handleJoinRollup}
                  joinLoading={joiningRollup}
                  isAdmin={isAdmin}
                  onMoveBooking={handleMoveBooking}
                  onSwapBookings={[1,2,3,4,5,6,7,8,9].includes(tourStep) ? undefined : handleSwapBookings}
                  leagueFixtures={leagueFixtures}
                  leagueTeams={leagueTeams}
                  leagues={leagues}
                  bulkDeleteMode={bulkDeleteMode}
                  bulkDeleteSelected={bulkDeleteSelected}
                  onToggleBulkDelete={toggleBulkDeleteBooking}
                  copyMode={copyMode}
                  onCopyBooking={handleCopyBooking}
                  tourSlot1Ref={tourSlot1Ref}
                  tourSlot2Ref={tourSlot2Ref}
                  tourSlot1_10Ref={tourSlot1_10Ref}
                  tourBookingCellRef={tourBookingCellRef}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-6 flex flex-wrap gap-4 text-sm text-gray-600"
        >
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-white border-2 border-emerald-200" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-100 border-2 border-emerald-500" />
            <span>Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-amber-100 border-2 border-amber-300" />
            <span>Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-emerald-500" />
            <span>Approved</span>
          </div>
        </motion.div>

        {/* Floating Book Slots button */}
        {!bulkDeleteMode && selectedSlots.length > 0 && (
          <div className="fixed bottom-6 left-6 z-40">
            <Button
              ref={[2, 7].includes(tourStep) ? tourBookBtnRef : null}
              onClick={handleBookSelected}
              className="bg-emerald-600 hover:bg-emerald-700 shadow-lg rounded-full px-5 py-3 h-auto text-base font-semibold"
            >
              Book {selectedSlots.length} Slot{selectedSlots.length > 1 ? 's' : ''}
            </Button>
          </div>
        )}

        <BookingModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
          selectedSlots={selectedSlots}
          selectedDate={selectedDate}
          onConfirm={handleConfirmBooking}
          isLoading={createBookingMutation.isPending}
          club={club}
          members={members}
          currentUserEmail={user?.email}
        />

        <BulkBookingModal
          open={bulkModalOpen}
          onClose={() => setBulkModalOpen(false)}
          selectedDate={selectedDate}
          club={club}
          onConfirm={handleBulkBooking}
          isLoading={createBookingMutation.isPending}
        />

        {/* Past Date Error Modal */}
        <Dialog open={pastDateErrorOpen} onOpenChange={setPastDateErrorOpen}>
          <DialogContent className="sm:max-w-md mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Error</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">The selected time is in the past and cannot be booked.</p>
            </div>
            <DialogFooter>
              <Button onClick={() => setPastDateErrorOpen(false)} className="bg-emerald-600 hover:bg-emerald-700">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <BookingDetailModal
          booking={selectedBooking}
          open={bookingDetailOpen}
          onClose={() => {
            setBookingDetailOpen(false);
            setSelectedBooking(null);
            // Tour step 5: closing detail modal advances to step 6
            if (tourStep === 5) setTourStep(6);
          }}
          currentUserEmail={user?.email}
          onJoinRollup={handleJoinRollup}
          joinLoading={joiningRollup}
          club={club}
          onDelete={handleDeleteBooking}
          deleteLoading={deletingBooking}
          cancelBtnRef={tourStep === 5 ? tourCancelBtnRef : undefined}
        />

        {/* Tour Booking Modals */}
        <TourBookingModal
          open={tourModalOpen}
          selectedSlots={selectedSlots}
          selectedDate={selectedDate}
          onConfirm={handleTourBookingConfirm}
          club={club}
          tourSubStep={tourModalSubStep}
          onSubStepChange={setTourModalSubStep}
        />
        <TourBookingModal
          open={tourModal2Open}
          selectedSlots={selectedSlots}
          selectedDate={selectedDate}
          onConfirm={handleTourBookingConfirm2}
          club={club}
          tourSubStep="submit"
          onSubStepChange={setTourModalSubStep}
        />

        {/* New User Tour */}
        {tourStep >= 0 && (
          <NewUserTour
            user={user}
            step={tourStep}
            setStep={setTourStep}
            onDismiss={() => {
              setTourStep(-1);
              setTourBooking(null);
              setTourBookings2([]);
              setTourModalOpen(false);
              setTourModal2Open(false);
              setSelectedSlots([]);
              setSelectedDate(startOfToday());
            }}
            onComplete={() => {
              setTourStep(-1);
              setTourBooking(null);
              setTourBookings2([]);
              setTourModalOpen(false);
              setTourModal2Open(false);
              setSelectedSlots([]);
              setSelectedDate(startOfToday());
            }}
            onTourDateChange={(date) => setSelectedDate(date)}
            tourBooking={tourBooking}
            slot1Ref={tourSlot1Ref}
            slot2Ref={tourSlot2Ref}
            slot1_10Ref={tourSlot1_10Ref}
            tourBookingRef={tourBookingCellRef}
            bookingDetailCancelRef={tourCancelBtnRef}
            navRinkBookingRef={tourNavRinkRef}
            navMyBookingsRef={tourNavMyBookingsRef}
            bookButtonRef={tourBookBtnRef}
            tourModalSubStep={tourModalSubStep}
            setTourModalSubStep={setTourModalSubStep}
          />
        )}
      </div>
    </div>
  );
}