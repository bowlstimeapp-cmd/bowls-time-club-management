import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const BASE_COMPETITION_TYPES = ['Club', 'County', 'National', 'Roll-up', 'Other'];
const FORMAT_OPTIONS = ['Singles', 'Pairs', 'Triples', 'Fours'];

export default function BookingModal({ 
  open, 
  onClose, 
  selectedSlots = [],
  selectedDate, 
  onConfirm, 
  isLoading,
  club,
  members = [],
  currentUserEmail
}) {
  const [notes, setNotes] = useState('');
  const [competitionType, setCompetitionType] = useState('Club');
  const [competitionOther, setCompetitionOther] = useState('');
  const [bookingFormat, setBookingFormat] = useState('');
  const [rollupMembers, setRollupMembers] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');

  const competitionTypes = club?.open_rollups && club?.private_rollups
    ? [...BASE_COMPETITION_TYPES.slice(0, 4), 'Private Roll-up', ...BASE_COMPETITION_TYPES.slice(4)]
    : BASE_COMPETITION_TYPES;

  const isRollup = competitionType === 'Roll-up';

  const filteredMembers = members.filter(m => 
    m.user_email !== currentUserEmail &&
    !rollupMembers.find(r => r.email === m.user_email) &&
    (memberSearch === '' || 
      `${m.first_name || ''} ${m.surname || ''} ${m.user_name || ''} ${m.user_email}`.toLowerCase().includes(memberSearch.toLowerCase()))
  );

  const addRollupMember = (member) => {
    if (rollupMembers.length >= 7) {
      toast.error('Maximum 8 people per roll-up (including you)');
      return;
    }
    const name = member.first_name && member.surname 
      ? `${member.first_name} ${member.surname}` 
      : (member.user_name || member.user_email);
    setRollupMembers(prev => [...prev, { email: member.user_email, name }]);
    setMemberSearch('');
  };

  const removeRollupMember = (email) => {
    setRollupMembers(prev => prev.filter(m => m.email !== email));
  };

  const handleConfirm = () => {
    // Validate booking is not in the past
    if (!selectedSlots || selectedSlots.length === 0) return;
    
    const now = new Date();
    const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
    const firstSlot = sortedSlots[0];
    
    // Combine selected date with start time to create full datetime
    const bookingDateTime = new Date(selectedDate);
    const [hours, minutes] = firstSlot.slot.start.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (bookingDateTime <= now) {
      toast.error('Cannot create bookings in the past');
      return;
    }
    
    onConfirm(notes, competitionType, competitionOther, rollupMembers, bookingFormat);
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
    setBookingFormat('');
    setRollupMembers([]);
    setMemberSearch('');
  };

  const handleClose = () => {
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
    setBookingFormat('');
    setRollupMembers([]);
    setMemberSearch('');
    onClose();
  };

  if (!selectedSlots || selectedSlots.length === 0) return null;

  // Sort slots by index to get time range
  const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const rink = firstSlot.rink;

  const formatHour = (time) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    return hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };

  const timeRangeLabel = selectedSlots.length === 1 
    ? firstSlot.slot.label
    : `${formatHour(firstSlot.slot.start)} - ${formatHour(lastSlot.slot.end)}`;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Request Booking
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {selectedSlots.length > 1 
              ? `Booking ${selectedSlots.length} consecutive slots`
              : 'Your booking will be sent for approval'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3 text-gray-700">
              <MapPin className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">Rink {rink}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
            </div>
            <div className="flex items-center gap-3 text-gray-700">
              <Clock className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">{timeRangeLabel}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Competition Type *</Label>
            <Select value={competitionType} onValueChange={setCompetitionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {competitionTypes.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Format</Label>
            <Select value={bookingFormat} onValueChange={setBookingFormat}>
              <SelectTrigger>
                <SelectValue placeholder="Select format (optional)" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map(f => (
                  <SelectItem key={f} value={f}>{f}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {competitionType === 'Other' && (
            <div className="space-y-2">
              <Label>Please specify</Label>
              <Input
                value={competitionOther}
                onChange={(e) => setCompetitionOther(e.target.value)}
                placeholder="Enter game type..."
              />
            </div>
          )}

          {(isRollup || competitionType === 'Private Roll-up') && club?.open_rollups && competitionType !== 'Private Roll-up' && (
            <div className="space-y-2">
              <Label>Select Members Joining ({rollupMembers.length + 1}/8)</Label>
              <p className="text-xs text-gray-500">You are automatically included. Select up to 7 more members.</p>
              {rollupMembers.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2">
                  {rollupMembers.map(m => (
                    <Badge key={m.email} variant="secondary" className="flex items-center gap-1 pr-1">
                      {m.name}
                      <button onClick={() => removeRollupMember(m.email)} className="ml-1 hover:text-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              {rollupMembers.length < 7 && (
                <div className="relative">
                  <Input
                    placeholder="Search members to add..."
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                  />
                  {memberSearch && filteredMembers.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {filteredMembers.slice(0, 8).map(m => {
                        const name = m.first_name && m.surname ? `${m.first_name} ${m.surname}` : (m.user_name || m.user_email);
                        return (
                          <button
                            key={m.user_email}
                            type="button"
                            onClick={() => addRollupMember(m)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm"
                          >
                            {name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-gray-700">
              Notes (optional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Any special requirements or information..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={isLoading || (competitionType === 'Other' && !competitionOther.trim())}
            className="bg-emerald-600 hover:bg-emerald-700 min-h-0"
            disabled={isLoading || (competitionType === 'Other' && !competitionOther.trim())}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Request'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}