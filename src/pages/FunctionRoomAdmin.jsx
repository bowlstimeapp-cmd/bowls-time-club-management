import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DoorOpen, Plus, Pencil, Trash2, Loader2, ShieldAlert, LayoutDashboard, List, CalendarDays } from 'lucide-react';
import { toast } from 'sonner';

import FRDashboard from '@/components/functionrooms/FRDashboard';
import FREnquiryList from '@/components/functionrooms/FREnquiryList';
import FREnquiryDetail from '@/components/functionrooms/FREnquiryDetail';
import FRCalendar from '@/components/functionrooms/FRCalendar';

const EMPTY_ROOM = {
  name: '', description: '', capacity: '', price_per_hour: '',
  is_active: true, auto_approve: false, available_from: '09:00', available_to: '22:00',
};

export default function FunctionRoomAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();

  const [user, setUser] = React.useState(null);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser); }, []);

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

  const { data: bookings = [] } = useQuery({
    queryKey: ['functionRoomBookings', clubId],
    queryFn: () => base44.entities.FunctionRoomBooking.filter({ club_id: clubId }, '-created_date', 200),
    enabled: !!clubId,
    refetchInterval: 30000,
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
    if (editingRoom) updateRoomMutation.mutate({ id: editingRoom.id, data });
    else createRoomMutation.mutate(data);
  };

  const newCount = bookings.filter(b => ['new_enquiry', 'pending'].includes(b.status)).length;

  const handleViewEnquiry = (b) => setSelectedEnquiry(b);

  // Sync selectedEnquiry with latest data so notes/status refresh live
  const liveSelectedEnquiry = selectedEnquiry
    ? bookings.find(b => b.id === selectedEnquiry.id) || selectedEnquiry
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 flex items-center gap-3">
              <DoorOpen className="w-8 h-8 text-emerald-600" />
              Function Room Bookings
            </h1>
            <p className="text-gray-500 text-sm">Manage enquiries, bookings and rooms</p>
          </div>
        </div>

        <Tabs defaultValue="dashboard">
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard" className="flex items-center gap-1.5">
              <LayoutDashboard className="w-4 h-4" /> Dashboard
            </TabsTrigger>
            <TabsTrigger value="enquiries" className="flex items-center gap-1.5 relative">
              <List className="w-4 h-4" /> Enquiries
              {newCount > 0 && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 inline-flex items-center justify-center">{newCount}</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="calendar" className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4" /> Calendar
            </TabsTrigger>
            <TabsTrigger value="rooms">Rooms</TabsTrigger>
          </TabsList>

          {/* Dashboard */}
          <TabsContent value="dashboard">
            <FRDashboard bookings={bookings} onViewEnquiry={handleViewEnquiry} />
          </TabsContent>

          {/* Enquiries */}
          <TabsContent value="enquiries">
            <FREnquiryList bookings={bookings} onSelect={handleViewEnquiry} />
          </TabsContent>

          {/* Calendar */}
          <TabsContent value="calendar">
            <FRCalendar bookings={bookings} onViewEnquiry={handleViewEnquiry} />
          </TabsContent>

          {/* Rooms */}
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
      </div>

      {/* Enquiry Detail Dialog */}
      {liveSelectedEnquiry && (
        <FREnquiryDetail
          booking={liveSelectedEnquiry}
          allBookings={bookings}
          onClose={() => setSelectedEnquiry(null)}
          clubId={clubId}
        />
      )}

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
    </div>
  );
}