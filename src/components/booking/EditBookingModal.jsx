import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, AlertTriangle } from 'lucide-react';

export default function EditBookingModal({ 
  open, 
  onClose, 
  booking, 
  club,
  allBookings = [],
  onSave, 
  isLoading 
}) {
  const [rinkNumber, setRinkNumber] = useState(booking?.rink_number || 1);
  const [date, setDate] = useState(booking?.date || '');
  const [startTime, setStartTime] = useState(booking?.start_time || '');
  const [conflictError, setConflictError] = useState(false);

  useEffect(() => {
    if (booking) {
      setRinkNumber(booking.rink_number);
      setDate(booking.date);
      setStartTime(booking.start_time);
      setConflictError(false);
    }
  }, [booking]);

  const generateTimeSlots = () => {
    if (!club) return [];
    const slots = [];
    const [openHour] = (club.opening_time || '10:00').split(':').map(Number);
    const [closeHour] = (club.closing_time || '21:00').split(':').map(Number);
    const duration = club.session_duration || 2;
    
    for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const checkForConflict = () => {
    // Check if there's already a booking for this rink, date, and time
    const conflict = allBookings.find(b => 
      b.id !== booking?.id && // Not the current booking
      b.rink_number === parseInt(rinkNumber) &&
      b.date === date &&
      b.start_time === startTime &&
      (b.status === 'approved' || b.status === 'pending')
    );
    return conflict;
  };

  const handleSave = () => {
    const conflict = checkForConflict();
    if (conflict) {
      setConflictError(true);
      return;
    }
    
    const duration = club?.session_duration || 2;
    const [startHour] = startTime.split(':').map(Number);
    const endTime = `${String(startHour + duration).padStart(2, '0')}:00`;
    
    setConflictError(false);
    onSave({
      rink_number: parseInt(rinkNumber),
      date,
      start_time: startTime,
      end_time: endTime
    });
  };

  // Clear conflict error when user changes selection
  useEffect(() => {
    setConflictError(false);
  }, [rinkNumber, date, startTime]);

  if (!booking) return null;

  const rinks = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);
  const timeSlots = generateTimeSlots();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Booking</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label>Rink</Label>
            <Select value={String(rinkNumber)} onValueChange={(v) => setRinkNumber(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {rinks.map(rink => (
                  <SelectItem key={rink} value={String(rink)}>Rink {rink}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <Label>Time Slot</Label>
            <Select value={startTime} onValueChange={setStartTime}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeSlots.map(time => {
                  const [hour] = time.split(':').map(Number);
                  const duration = club?.session_duration || 2;
                  const formatHour = (h) => h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
                  return (
                    <SelectItem key={time} value={time}>
                      {formatHour(hour)} - {formatHour(hour + duration)}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 text-sm">
            <p><span className="font-medium">Booked by:</span> {booking.booker_name}</p>
            <p><span className="font-medium">Email:</span> {booking.booker_email}</p>
          </div>

          {conflictError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Rink already booked at this time</p>
                <p className="text-sm text-red-600">Please choose another time or rink.</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}