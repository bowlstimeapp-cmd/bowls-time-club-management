import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfToday } from 'date-fns';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import TimeSlotGrid from '@/components/booking/TimeSlotGrid';
import DateSelector from '@/components/booking/DateSelector';
import BookingModal from '@/components/booking/BookingModal';

export default function BookRink() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [user, setUser] = useState(null);

  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    loadUser();
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
      setModalOpen(false);
      setSelectedSlot(null);
      toast.success('Booking request submitted! Awaiting approval.');
    },
    onError: () => {
      toast.error('Failed to create booking. Please try again.');
    },
  });

  const handleSlotClick = (rink, slot) => {
    setSelectedSlot({ rink, slot });
    setModalOpen(true);
  };

  const handleConfirmBooking = (notes) => {
    if (!user || !selectedSlot || !clubId) return;

    createBookingMutation.mutate({
      club_id: clubId,
      rink_number: selectedSlot.rink,
      date: dateString,
      start_time: selectedSlot.slot.start,
      end_time: selectedSlot.slot.end,
      status: 'pending',
      booker_name: user.full_name || user.email,
      booker_email: user.email,
      notes: notes || '',
    });
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Book a Rink
          </h1>
          <p className="text-gray-600">
            {club?.name} • Select a date and available time slot to request a booking
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-lg border-0">
            <CardHeader className="border-b bg-white/50">
              <DateSelector 
                selectedDate={selectedDate} 
                onDateChange={setSelectedDate} 
              />
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
                  onSlotClick={handleSlotClick}
                  currentUserEmail={user?.email}
                  club={club}
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
            setSelectedSlot(null);
          }}
          selectedSlot={selectedSlot}
          selectedDate={selectedDate}
          onConfirm={handleConfirmBooking}
          isLoading={createBookingMutation.isPending}
        />
      </div>
    </div>
  );
}