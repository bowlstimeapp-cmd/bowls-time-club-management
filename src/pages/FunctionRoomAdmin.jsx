import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DoorOpen, Plus, Pencil, Trash2, CheckCircle, XCircle, Clock, Loader2, ShieldAlert, Users, MessageSquare, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-700 border-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-600 border-gray-200',
};

const EMPTY_ROOM = { name: '', description: '', capacity: '', price_per_hour: '', is_active: true, auto_approve: false, available_from: '09:00', available_to: '22:00' };

export default function FunctionRoomAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();

  const [user, setUser] = useState(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [adminNotesOpen, setAdminNotesOpen] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  React.useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => {
      const m = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return m[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: rooms = [], isLoading: roomsLoading } = useQuery({
    queryKey: ['functionRooms', clubId],
    queryFn: () => base44.entities.FunctionRoom.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ['functionRoomBookings', clubId],
    queryFn: () => base44.entities.FunctionRoomBooking.filter({ club_id: clubId }, '-created_date', 100),
    enabled: !!clubId,
  });

  const createRoomMutation = useMutation({
    mutationFn: (data) => base44.entities.FunctionRoom.create({ ...data, club_id: clubId }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['functionRooms', clubId] }); toast.success('Room created'); setRoomModalOpen(false); },
  });

  const updateRoomMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FunctionRoom.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['functionRooms', clubId] }); toast.success('Room updated'); setRoomModalOpen(false); },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: (id) => base44.entities.FunctionRoom.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['functionRooms', clubId] }); toast.success('Room deleted'); },
  });

  const updateBookingMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.FunctionRoomBooking.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['functionRoomBookings', clubId] }); toast.success('Booking updated'); setAdminNotesOpen(null); },
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';

  if (user && !isClubAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <ShieldAlert className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">Club admin access required.</p>
          <Link to={createPageUrl('BookRink') + `?clubId=${clubId}`}><Button>Go to Bookings</Button></Link>
        </div>
      </div>
    );
  }

  const handleOpenRoomModal = (room = null) => {
    setEditingRoom(room);
    setRoomForm(room ? {
      name: room.name, description: room.description || '', capacity: room.capacity || '',
      price_per_hour: room.price_per_hour ? room.price_per_hour / 100 : '',
      is_active: room.is_active !== false, auto_approve: room.auto_approve || false,
      available_from: room.available_from || '09:00', available_to: room.available_to || '22:00',
    } : EMPTY_ROOM);
    setRoomModalOpen(true);
  };

  const handleSaveRoom = () => {
    const data = {
      ...roomForm,
      capacity: roomForm.capacity ? parseInt(roomForm.capacity) : null,
      price_per_hour: roomForm.price_per_hour ? Math.round(parseFloat(roomForm.price_per_hour) * 100) : null,
    };
    if (editingRoom) {
      updateRoomMutation.mutate({ id: editingRoom.id, data });
    } else {
      createRoomMutation.mutate(data);
    }
  };

  const handleApprove = (booking) => updateBookingMutation.mutate({ id: booking.id, data: { status: 'approved' } });
  const handleReject = (booking) => updateBookingMutation.mutate({ id: booking.id, data: { status: 'rejected' } });
  const handleSaveNotes = () => updateBookingMutation.mutate({ id: adminNotesOpen, data: { admin_notes: adminNotes } });

  const filteredBookings = statusFilter === 'all' ? bookings : bookings.filter(b => b.status === statusFilter);
  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <DoorOpen className="w-8 h-8 text-emerald-600" />
              Function Room Bookings
            </h1>
            <p className="text-gray-600">Manage rooms and booking requests</p>
          </div>
        </motion.div>

        <Tabs defaultValue="bookings">
          <TabsList className="mb-6">
            <TabsTrigger value="bookings" className="relative">
              Booking Requests
              {pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{pendingCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
          </TabsList>

          {/* ── BOOKINGS TAB ── */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <CardTitle>All Booking Requests</CardTitle>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : filteredBookings.length === 0 ? (
                  <div className="text-center py-12">
                    <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500">No booking requests found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredBookings.map(booking => {
                      const room = rooms.find(r => r.id === booking.room_id);
                      return (
                        <div key={booking.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between gap-4 flex-wrap">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900">{booking.room_name || room?.name}</span>
                                <Badge className={`text-xs border ${STATUS_COLORS[booking.status]}`}>{booking.status}</Badge>
                                {booking.source === 'api' && <Badge variant="outline" className="text-xs">via API</Badge>}
                              </div>
                              <p className="text-sm text-gray-600">
                                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                                {booking.date} · {booking.start_time}–{booking.end_time} ({booking.duration_hours}h)
                              </p>
                              <p className="text-sm text-gray-700 mt-1 font-medium">{booking.contact_name}</p>
                              <p className="text-xs text-gray-500">{booking.contact_email}{booking.contact_phone ? ` · ${booking.contact_phone}` : ''}</p>
                              {booking.organisation && <p className="text-xs text-gray-500">{booking.organisation}</p>}
                              {booking.purpose && <p className="text-xs text-gray-600 mt-1 italic">"{booking.purpose}"</p>}
                              {booking.attendees && <p className="text-xs text-gray-500 mt-0.5"><Users className="w-3 h-3 inline mr-1" />{booking.attendees} attendees</p>}
                              {booking.admin_notes && (
                                <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded px-2 py-1">
                                  <strong>Note:</strong> {booking.admin_notes}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button variant="outline" size="sm" onClick={() => { setAdminNotesOpen(booking.id); setAdminNotes(booking.admin_notes || ''); }}>
                                <MessageSquare className="w-4 h-4" />
                              </Button>
                              {booking.status === 'pending' && (
                                <>
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => handleApprove(booking)} disabled={updateBookingMutation.isPending}>
                                    <CheckCircle className="w-4 h-4 mr-1" /> Approve
                                  </Button>
                                  <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleReject(booking)} disabled={updateBookingMutation.isPending}>
                                    <XCircle className="w-4 h-4 mr-1" /> Reject
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── ROOMS TAB ── */}
          <TabsContent value="rooms">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Function Rooms</CardTitle>
                  <Button onClick={() => handleOpenRoomModal()} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="w-4 h-4 mr-2" /> Add Room
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {roomsLoading ? (
                  <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />)}</div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-12">
                    <DoorOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="text-gray-500 mb-4">No function rooms defined yet</p>
                    <Button onClick={() => handleOpenRoomModal()} className="bg-emerald-600 hover:bg-emerald-700"><Plus className="w-4 h-4 mr-2" />Add First Room</Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {rooms.map(room => (
                      <div key={room.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{room.name}</h3>
                            <Badge variant={room.is_active !== false ? 'default' : 'secondary'}>{room.is_active !== false ? 'Active' : 'Inactive'}</Badge>
                            {room.auto_approve && <Badge className="bg-blue-100 text-blue-700 border-blue-200">Auto-approve</Badge>}
                          </div>
                          <p className="text-sm text-gray-500">
                            {room.capacity ? `Capacity: ${room.capacity}` : ''}
                            {room.capacity && room.price_per_hour ? ' · ' : ''}
                            {room.price_per_hour ? `£${(room.price_per_hour / 100).toFixed(0)}/hr` : ''}
                            {(room.capacity || room.price_per_hour) && (room.available_from || room.available_to) ? ' · ' : ''}
                            {room.available_from && room.available_to ? `${room.available_from}–${room.available_to}` : ''}
                          </p>
                          {room.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{room.description}</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleOpenRoomModal(room)}><Pencil className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => deleteRoomMutation.mutate(room.id)}><Trash2 className="w-4 h-4" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Room Modal */}
        <Dialog open={roomModalOpen} onOpenChange={setRoomModalOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room' : 'Add Function Room'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Room Name *</Label>
                <Input value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Main Hall" />
              </div>
              <div>
                <Label>Description</Label>
                <Textarea value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} placeholder="Description of the room..." rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Capacity</Label>
                  <Input type="number" min="1" value={roomForm.capacity} onChange={e => setRoomForm({ ...roomForm, capacity: e.target.value })} placeholder="e.g. 100" />
                </div>
                <div>
                  <Label>Price per Hour (£)</Label>
                  <Input type="number" min="0" step="0.50" value={roomForm.price_per_hour} onChange={e => setRoomForm({ ...roomForm, price_per_hour: e.target.value })} placeholder="e.g. 25.00" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Available From</Label>
                  <Input type="time" value={roomForm.available_from} onChange={e => setRoomForm({ ...roomForm, available_from: e.target.value })} />
                </div>
                <div>
                  <Label>Available To</Label>
                  <Input type="time" value={roomForm.available_to} onChange={e => setRoomForm({ ...roomForm, available_to: e.target.value })} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <Label>Room Active</Label>
                <Switch checked={roomForm.is_active} onCheckedChange={v => setRoomForm({ ...roomForm, is_active: v })} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto-approve Bookings</Label>
                  <p className="text-xs text-gray-500">Approve requests automatically without admin sign-off</p>
                </div>
                <Switch checked={roomForm.auto_approve} onCheckedChange={v => setRoomForm({ ...roomForm, auto_approve: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoomModalOpen(false)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveRoom} disabled={!roomForm.name || createRoomMutation.isPending || updateRoomMutation.isPending}>
                {(createRoomMutation.isPending || updateRoomMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingRoom ? 'Save Changes' : 'Create Room'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Admin Notes Dialog */}
        <Dialog open={!!adminNotesOpen} onOpenChange={() => setAdminNotesOpen(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Admin Notes</DialogTitle></DialogHeader>
            <Textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} placeholder="Add internal notes about this booking..." rows={4} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdminNotesOpen(null)}>Cancel</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleSaveNotes} disabled={updateBookingMutation.isPending}>Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}