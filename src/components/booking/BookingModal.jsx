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
import { Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const COMPETITION_TYPES = ['Club', 'County', 'National', 'Other'];

export default function BookingModal({ 
  open, 
  onClose, 
  selectedSlots = [],
  selectedDate, 
  onConfirm, 
  isLoading 
}) {
  const [notes, setNotes] = useState('');
  const [competitionType, setCompetitionType] = useState('Club');
  const [competitionOther, setCompetitionOther] = useState('');

  const handleConfirm = () => {
    onConfirm(notes, competitionType, competitionOther);
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
  };

  const handleClose = () => {
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
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
                {COMPETITION_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
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
            className="bg-emerald-600 hover:bg-emerald-700"
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