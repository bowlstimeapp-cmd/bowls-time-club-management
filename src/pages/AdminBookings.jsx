import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Search,
  ShieldAlert,
  CalendarClock,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import { toast } from "sonner";
import { parseISO, isBefore, startOfToday } from 'date-fns';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import BookingCard from '@/components/booking/BookingCard';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import EditBookingModal from '@/components/booking/EditBookingModal';

export default function AdminBookings() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [bookingToReject, setBookingToReject] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [editBooking, setEditBooking] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);
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

  const { data: myMembership, isLoading: membershipLoading } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const memberships = await base44.entities.ClubMembership.filter({ 
        club_id: clubId, 
        user_email: user.email 
      });
      return memberships[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ['clubBookings', clubId],
    queryFn: () => base44.entities.Booking.filter({ club_id: clubId }, '-created_date'),
    enabled: !!clubId,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Booking.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Booking.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clubBookings'] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['myBookings'] });
      toast.success('Booking deleted');
    },
  });

  const isClubAdmin = myMembership?.role === 'admin' && myMembership?.status === 'approved';
  const isClubSteward = myMembership?.role === 'steward' && myMembership?.status === 'approved';
  const canAccessPage = isClubAdmin || isClubSteward;

  const writeAuditLog = async (booking, action, details = '') => {
    if (!user || !myMembership) return;
    const performerName = user.first_name && user.surname
      ? `${user.first_name} ${user.surname}`
      : (user.full_name || user.email);
    await base44.entities.BookingAuditLog.create({
      club_id: clubId,
      booking_id: booking.id,
      action,
      performed_by_email: user.email,
      performed_by_name: performerName,
      performed_by_role: myMembership.role,
      booking_rink: booking.rink_number,
      booking_date: booking.date,
      booking_start_time: booking.start_time,
      booking_end_time: booking.end_time,
      booker_name: booking.booker_name,
      booker_email: booking.booker_email,
      competition_type: booking.competition_type || '',
      details,
    });
  };

  // Check if user is club admin or steward
  if (!membershipLoading && user && !canAccessPage) {
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
          <p className="text-gray-600 mb-6">You need club admin or steward privileges to access this page.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Go to Bookings
            </Button>
          </Link>
        </motion.div>
      </div>
    );
  }

  const handleApprove = async (booking) => {
    await updateMutation.mutateAsync({ id: booking.id, data: { status: 'approved' } });
    await base44.entities.Notification.create({
      user_email: booking.booker_email,
      type: 'booking_accepted',
      title: 'Booking Approved',
      message: `Your booking for Rink ${booking.rink_number} on ${booking.date} at ${booking.start_time} has been approved`,
      link_page: 'MyBookings',
      link_params: `?clubId=${clubId}`,
      related_id: booking.id
    });
    await writeAuditLog(booking, 'approved');
    toast.success(`Booking for ${booking.booker_name} approved`);
  };

  const handleRejectClick = (booking) => {
    setBookingToReject(booking);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleConfirmReject = async () => {
    if (bookingToReject) {
      const notes = rejectReason || 'Booking rejected by admin';
      await updateMutation.mutateAsync({ 
        id: bookingToReject.id, 
        data: { 
          status: 'rejected',
          admin_notes: notes
        } 
      });
      // Create notification
      await base44.entities.Notification.create({
        user_email: bookingToReject.booker_email,
        type: 'booking_rejected',
        title: 'Booking Rejected',
        message: `Your booking for Rink ${bookingToReject.rink_number} on ${bookingToReject.date} at ${bookingToReject.start_time} has been rejected${rejectReason ? ': ' + rejectReason : ''}`,
        link_page: 'MyBookings',
        link_params: `?clubId=${clubId}`,
        related_id: bookingToReject.id
      });
      await writeAuditLog(bookingToReject, 'rejected', rejectReason ? `Reason: ${rejectReason}` : '');
      toast.success(`Booking for ${bookingToReject.booker_name} rejected`);
      setRejectDialogOpen(false);
      setBookingToReject(null);
    }
  };

  const handleEditBooking = async (updates) => {
    const hasChanged = 
      updates.rink_number !== editBooking.rink_number ||
      updates.date !== editBooking.date ||
      updates.start_time !== editBooking.start_time;
    
    await updateMutation.mutateAsync({ 
      id: editBooking.id, 
      data: updates 
    });
    
    // Create notification if booking was moved
    if (hasChanged) {
      await base44.entities.Notification.create({
        user_email: editBooking.booker_email,
        type: 'booking_moved',
        title: 'Booking Updated',
        message: `Your booking has been moved to Rink ${updates.rink_number} on ${updates.date} at ${updates.start_time}`,
        link_page: 'MyBookings',
        link_params: `?clubId=${clubId}`,
        related_id: editBooking.id
      });
    }
    
    await writeAuditLog(
      { ...editBooking, ...updates },
      hasChanged ? 'moved' : 'edited',
      hasChanged ? `Moved to Rink ${updates.rink_number} on ${updates.date} at ${updates.start_time}` : 'Details edited'
    );
    toast.success('Booking updated');
    setEditBooking(null);
  };

  const handleDeleteClick = (booking) => {
    setBookingToDelete(booking);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (bookingToDelete) {
      await writeAuditLog(bookingToDelete, 'deleted');
      await deleteMutation.mutateAsync(bookingToDelete.id);
      setDeleteDialogOpen(false);
      setBookingToDelete(null);
    }
  };

  const today = startOfToday();
  const pendingBookings = bookings.filter(b => b.status === 'pending');
  const upcomingApproved = bookings.filter(b => 
    b.status === 'approved' && !isBefore(parseISO(b.date), today)
  );
  const allBookings = bookings.filter(b => 
    b.booker_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.booker_email?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
                Booking Management
              </h1>
              <p className="text-gray-600">
                {club?.name} • Manage booking requests and approvals
              </p>
            </div>
            {isClubAdmin && (
              <Link to={createPageUrl('BookingsAudit') + `?clubId=${clubId}`}>
                <Button variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-50">
                  <ShieldAlert className="w-4 h-4 mr-2" />
                  Audit Log
                </Button>
              </Link>
            )}
          </div>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingBookings.length}</p>
                <p className="text-sm text-gray-500">Pending Approval</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100">
                <CheckCircle className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{upcomingApproved.length}</p>
                <p className="text-sm text-gray-500">Upcoming Approved</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gray-100">
                <CalendarClock className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                <p className="text-sm text-gray-500">Total Bookings</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6 h-auto flex-wrap">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Pending ({pendingBookings.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Approved ({upcomingApproved.length})
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                All
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : pendingBookings.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {pendingBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isAdmin={true}
                        onApprove={handleApprove}
                        onReject={handleRejectClick}
                        onDelete={handleDeleteClick}
                        isLoading={updateMutation.isPending || deleteMutation.isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={CheckCircle}
                  title="All caught up!"
                  description="No pending bookings to review"
                />
              )}
            </TabsContent>

            <TabsContent value="approved">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : upcomingApproved.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {upcomingApproved.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isAdmin={true}
                        onEdit={() => setEditBooking(booking)}
                        onDelete={handleDeleteClick}
                        isLoading={deleteMutation.isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={CalendarClock}
                  title="No upcoming bookings"
                  description="Approved bookings will appear here"
                />
              )}
            </TabsContent>

            <TabsContent value="all">
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : allBookings.length > 0 ? (
                <div className="space-y-4">
                  <AnimatePresence>
                    {allBookings.map(booking => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        isAdmin={true}
                        onApprove={handleApprove}
                        onReject={handleRejectClick}
                        onEdit={() => setEditBooking(booking)}
                        onDelete={handleDeleteClick}
                        isLoading={updateMutation.isPending || deleteMutation.isPending}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  title="No results found"
                  description="Try a different search term"
                />
              )}
            </TabsContent>
          </Tabs>
        </motion.div>

        <EditBookingModal
          open={!!editBooking}
          onClose={() => setEditBooking(null)}
          booking={editBooking}
          club={club}
          allBookings={bookings}
          onSave={handleEditBooking}
          isLoading={updateMutation.isPending}
        />

        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Reject Booking</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g., Rink maintenance scheduled..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="mt-2"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmReject}
                className="bg-red-600 hover:bg-red-700"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
            <DialogHeader>
              <DialogTitle>Delete Booking</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-600">
                Are you sure you want to delete this booking? This action cannot be undone.
              </p>
              {bookingToDelete && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
                  <p><span className="font-medium">Rink:</span> {bookingToDelete.rink_number}</p>
                  <p><span className="font-medium">Date:</span> {bookingToDelete.date}</p>
                  <p><span className="font-medium">Booked by:</span> {bookingToDelete.booker_name}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmDelete}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete Booking
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}