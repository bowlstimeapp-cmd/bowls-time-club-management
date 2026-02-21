import React, { useState, useEffect } from 'react';
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
import { CalendarRange } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export default function BookRink() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlots, setSelectedSlots] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [pastDateErrorOpen, setPastDateErrorOpen] = useState(false);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
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

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['bookings', clubId, dateString],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId, date: dateString }),
    enabled: !!clubId,
  });

  const createBookingMutation = useMutation({
    mutationFn: (bookingData) => base44.entities.Booking.create(bookingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
    onError: () => {
      toast.error('Failed to create booking. Please try again.');
    },
  });

  const handleConfirmBooking = async (notes, competitionType, competitionOther) => {
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
        booker_name: bookerName,
        booker_email: user.email,
        notes: notes || '',
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

  const handleBulkBooking = async (bulkData) => {
    if (!user || !clubId || !club) return;

    const status = club?.auto_approve_bookings ? 'approved' : 'pending';
    const bookerName = user.first_name && user.surname 
      ? `${user.first_name} ${user.surname}` 
      : (user.full_name || user.email);

    // Generate time slots between start and end time
    const sessionDuration = club.session_duration || 2;
    const slots = [];
    
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

  // Clear selection when date changes
  const dateString2 = format(selectedDate, 'yyyy-MM-dd');
  useEffect(() => {
    setSelectedSlots([]);
  }, [dateString2]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0}}
          animate={{ opacity: 1}}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Book a Rink
            </h1>
            <InfoTooltip content="Select available time slots on the grid below. Click on a slot to book it, or click on an existing booking to view its details." />
          </div>
          <p className="text-gray-600">
            {club?.name} • Select consecutive time slots on the same rink
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
                    <Button 
                      onClick={() => setBulkModalOpen(true)}
                      variant="outline"
                      className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    >
                      <CalendarRange className="w-4 h-4 mr-2" />
                      Bulk Booking
                    </Button>
                  )}
                  {selectedSlots.length > 0 && (
                    <Button 
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
                  onMultiSlotSelect={setSelectedSlots}
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

        <BookingModal
          open={modalOpen}
          onClose={() => {
            setModalOpen(false);
          }}
          selectedSlots={selectedSlots}
          selectedDate={selectedDate}
          onConfirm={handleConfirmBooking}
          isLoading={createBookingMutation.isPending}
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
      </div>
    </div>
  );
}