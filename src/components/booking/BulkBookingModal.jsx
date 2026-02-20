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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const COMPETITION_TYPES = ['Club', 'County', 'National', 'Other'];

export default function BulkBookingModal({ 
  open, 
  onClose, 
  selectedDate,
  club,
  onConfirm, 
  isLoading 
}) {
  const [notes, setNotes] = useState('');
  const [competitionType, setCompetitionType] = useState('Club');
  const [competitionOther, setCompetitionOther] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [selectedRinks, setSelectedRinks] = useState([]);

  const handleConfirm = () => {
    if (selectedRinks.length === 0) {
      toast.error('Please select at least one rink');
      return;
    }
    if (!startTime || !endTime) {
      toast.error('Please select start and end times');
      return;
    }
    if (endTime <= startTime) {
      toast.error('End time must be after start time');
      return;
    }

    // Validate booking is not in the past
    const now = new Date();
    const bookingDateTime = new Date(selectedDate);
    const [hours, minutes] = startTime.split(':');
    bookingDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
    
    if (bookingDateTime <= now) {
      toast.error('Cannot create bookings in the past');
      return;
    }

    onConfirm({
      notes,
      competitionType,
      competitionOther,
      startTime,
      endTime,
      rinks: selectedRinks
    });
    
    // Reset form
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
    setStartTime('');
    setEndTime('');
    setSelectedRinks([]);
  };

  const handleClose = () => {
    setNotes('');
    setCompetitionType('Club');
    setCompetitionOther('');
    setStartTime('');
    setEndTime('');
    setSelectedRinks([]);
    onClose();
  };

  const toggleRink = (rinkNumber) => {
    setSelectedRinks(prev => 
      prev.includes(rinkNumber) 
        ? prev.filter(r => r !== rinkNumber)
        : [...prev, rinkNumber].sort((a, b) => a - b)
    );
  };

  const rinkCount = club?.rink_count || 6;
  const rinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Bulk Booking Request
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Book multiple rinks for the same time period
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-3 text-gray-700">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span className="font-medium">{format(selectedDate, 'EEEE, d MMMM yyyy')}</span>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Select Rinks *</Label>
            <div className="grid grid-cols-3 gap-2">
              {rinks.map(rinkNumber => (
                <div
                  key={rinkNumber}
                  className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRink(rinkNumber)}
                >
                  <Checkbox 
                    checked={selectedRinks.includes(rinkNumber)}
                    onCheckedChange={() => toggleRink(rinkNumber)}
                  />
                  <span className="text-sm">Rink {rinkNumber}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Start Time *</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label>End Time *</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
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
              `Book ${selectedRinks.length} Rink${selectedRinks.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}