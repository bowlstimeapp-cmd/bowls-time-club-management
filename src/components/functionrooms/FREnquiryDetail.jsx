import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Mail, StickyNote, User, CalendarDays, Users, Building2, AlertTriangle, Loader2, Phone } from 'lucide-react';
import { STATUS_CONFIG, PIPELINE_STATUSES, CLOSED_STATUSES, getConflicts, addTimestampedNote } from './frUtils';
import FREmailDialog from './FREmailDialog';

export default function FREnquiryDetail({ booking, allBookings, onClose, clubId }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState('');
  const [assignedTo, setAssignedTo] = useState(booking?.assigned_to || '');
  const [emailOpen, setEmailOpen] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.FunctionRoomBooking.update(booking.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['functionRoomBookings', clubId] }),
  });

  if (!booking) return null;

  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG['new_enquiry'];
  const conflicts = getConflicts(booking, allBookings).filter(b => !CLOSED_STATUSES.includes(b.status));

  const handleStatusChange = (status) => {
    updateMutation.mutate({ status });
    toast.success('Status updated');
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    const updated = addTimestampedNote(booking.admin_notes, newNote.trim(), assignedTo || null);
    updateMutation.mutate({ admin_notes: updated });
    setNewNote('');
    toast.success('Note added');
  };

  const handleSaveAssignment = () => {
    updateMutation.mutate({ assigned_to: assignedTo });
    toast.success('Assignment saved');
  };

  return (
    <>
      <Dialog open={!!booking} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">
              {booking.room_name}
            </DialogTitle>
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.className}`}>{cfg.label}</span>
              <span className="text-sm text-gray-500">
                <CalendarDays className="w-3.5 h-3.5 inline mr-1" />
                {booking.date} · {booking.start_time}–{booking.end_time} ({booking.duration_hours}h)
              </span>
              {booking.source === 'api' && <Badge variant="outline" className="text-xs">via API</Badge>}
            </div>
          </DialogHeader>

          {/* Conflict Warning */}
          {conflicts.length > 0 && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <strong>Scheduling Conflict:</strong> This overlaps with {conflicts.map(c => c.contact_name).join(', ')}'s enquiry for the same room and time.
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Customer</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-gray-400" /><span className="font-medium">{booking.contact_name}</span></div>
                  <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-gray-400" /><a href={`mailto:${booking.contact_email}`} className="text-blue-600 hover:underline">{booking.contact_email}</a></div>
                  {booking.contact_phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-gray-400" /><span>{booking.contact_phone}</span></div>}
                  {booking.organisation && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-gray-400" /><span>{booking.organisation}</span></div>}
                  {booking.attendees && <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span>{booking.attendees} attendees</span></div>}
                </div>
              </div>
              {booking.purpose && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Event Purpose</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded p-2 italic">"{booking.purpose}"</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {/* Status */}
              <div>
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</Label>
                <Select value={booking.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PIPELINE_STATUSES.map(s => (
                      <SelectItem key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assign To */}
              <div>
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Assigned To</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="Staff name..." className="flex-1" />
                  <Button variant="outline" size="sm" onClick={handleSaveAssignment} disabled={updateMutation.isPending}>Save</Button>
                </div>
              </div>

              {/* Quick Actions */}
              <div>
                <Label className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Quick Actions</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
                    <Mail className="w-4 h-4 mr-1" /> Send Email
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEmailOpen(true)}>
                    <Mail className="w-4 h-4 mr-1" /> Follow-up
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <StickyNote className="w-3.5 h-3.5" /> Internal Notes
            </h4>
            <div className="flex gap-2">
              <Textarea
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add an internal note..."
                rows={2}
                className="flex-1 text-sm"
              />
              <Button
                variant="outline"
                className="self-end"
                onClick={handleAddNote}
                disabled={!newNote.trim() || updateMutation.isPending}
              >
                {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
              </Button>
            </div>
            {booking.admin_notes && (
              <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed max-h-48 overflow-y-auto">
                {booking.admin_notes}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {emailOpen && (
        <FREmailDialog
          booking={booking}
          open={emailOpen}
          onClose={() => setEmailOpen(false)}
        />
      )}
    </>
  );
}