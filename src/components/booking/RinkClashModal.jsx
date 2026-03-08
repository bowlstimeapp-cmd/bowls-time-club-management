import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle, SkipForward, ArrowRight, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function RinkClashModal({
  open,
  clashes = [],
  nonClashingBookings = [],
  allBookings = [],
  club,
  onProceed,
  onClose,
  isLoading,
}) {
  const [resolutions, setResolutions] = useState({});
  const [expandedMove, setExpandedMove] = useState(null);
  const [moveRink, setMoveRink] = useState('');
  const [moveTime, setMoveTime] = useState('');
  const [movingIndex, setMovingIndex] = useState(null);

  useEffect(() => {
    if (open) {
      setResolutions({});
      setExpandedMove(null);
      setMoveRink('');
      setMoveTime('');
    }
  }, [open]);

  const rinks = Array.from({ length: club?.rink_count || 6 }, (_, i) => i + 1);

  const generateTimeSlots = () => {
    const slots = [];
    const [openHour] = (club?.opening_time || '10:00').split(':').map(Number);
    const [closeHour] = (club?.closing_time || '21:00').split(':').map(Number);
    const duration = club?.session_duration || 2;
    for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  };

  const formatTimeRange = (startTime) => {
    const [hours] = startTime.split(':');
    const hour = parseInt(hours);
    const duration = club?.session_duration || 2;
    const endHour = hour + duration;
    const fmt = (h) => h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    return `${fmt(hour)} – ${fmt(endHour)}`;
  };

  const resolvedCount = clashes.filter((_, i) => resolutions[i]?.type).length;
  const allResolved = clashes.length > 0 && resolvedCount === clashes.length;

  const handleResolve = (index, type) => {
    setResolutions(prev => ({ ...prev, [index]: { type } }));
    if (expandedMove === index) setExpandedMove(null);
  };

  const handleUndo = (index) => {
    setResolutions(prev => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  const openMoveForm = (index) => {
    const clash = clashes[index];
    setExpandedMove(expandedMove === index ? null : index);
    setMoveRink(String(clash.proposedBooking.rink_number));
    setMoveTime(clash.existingBooking.start_time);
  };

  const handleMoveBooking = async (index) => {
    const clash = clashes[index];
    if (!moveRink || !moveTime) {
      toast.error('Please select a rink and time');
      return;
    }

    // Check if target slot is already taken
    const conflict = allBookings.find(b =>
      b.id !== clash.existingBooking.id &&
      b.rink_number === parseInt(moveRink) &&
      b.date === clash.existingBooking.date &&
      b.start_time === moveTime &&
      b.status !== 'cancelled' &&
      b.status !== 'rejected'
    );

    if (conflict) {
      toast.error(`Rink ${moveRink} at ${moveTime} is already booked by ${conflict.booker_name}`);
      return;
    }

    setMovingIndex(index);
    try {
      const duration = club?.session_duration || 2;
      const [startHour] = moveTime.split(':').map(Number);
      const endTime = `${String(startHour + duration).padStart(2, '0')}:00`;

      await base44.entities.Booking.update(clash.existingBooking.id, {
        rink_number: parseInt(moveRink),
        start_time: moveTime,
        end_time: endTime,
      });

      handleResolve(index, 'moved');
      toast.success('Existing booking moved successfully');
    } finally {
      setMovingIndex(null);
    }
  };

  const handleProceed = () => {
    const bookingsToCreate = [...nonClashingBookings];

    clashes.forEach((clash, index) => {
      const resolution = resolutions[index];
      if (!resolution) return;

      if (resolution.type === 'use_suggestion') {
        bookingsToCreate.push({ ...clash.proposedBooking, rink_number: clash.suggestedRink });
      } else if (resolution.type === 'moved') {
        // Existing booking was moved out of the way — use original proposed slot
        bookingsToCreate.push(clash.proposedBooking);
      }
      // 'skip' → don't add
    });

    onProceed(bookingsToCreate);
  };

  const proceeedCount = nonClashingBookings.length +
    clashes.filter((_, i) => resolutions[i]?.type === 'use_suggestion' || resolutions[i]?.type === 'moved').length;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-700">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Rink Booking Clashes Detected
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-500">
          {resolvedCount} of {clashes.length} clashes resolved · {nonClashingBookings.length} slots have no clashes
        </p>

        <div className="space-y-3">
          {clashes.map((clash, index) => {
            const resolution = resolutions[index];
            const isResolved = !!resolution?.type;
            const isExpanded = expandedMove === index;

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-colors ${isResolved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
              >
                {/* Clash header */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      {isResolved
                        ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                      <span className="font-medium text-sm">
                        Rink {clash.proposedBooking.rink_number} — {format(parseISO(clash.proposedBooking.date), 'd MMM yyyy')} at {formatTimeRange(clash.proposedBooking.start_time)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 ml-6 mt-0.5">
                      Already booked by: <span className="font-medium">{clash.existingBooking.booker_name}</span>
                      {clash.existingBooking.competition_type && ` (${clash.existingBooking.competition_type})`}
                    </p>
                  </div>
                  {isResolved && (
                    <Badge className="bg-emerald-100 text-emerald-700 text-xs shrink-0 ml-2">
                      {resolution.type === 'use_suggestion' && `→ Rink ${clash.suggestedRink}`}
                      {resolution.type === 'moved' && 'Existing moved'}
                      {resolution.type === 'skip' && 'Skipped'}
                    </Badge>
                  )}
                </div>

                {/* Unresolved actions */}
                {!isResolved && (
                  <div className="ml-6 space-y-2">
                    {clash.suggestedRink ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600">
                          Suggested: Rink {clash.suggestedRink} is free at this time
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                          onClick={() => handleResolve(index, 'use_suggestion')}
                        >
                          Use Rink {clash.suggestedRink}
                        </Button>
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 font-medium">No alternative rink available at this time</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openMoveForm(index)}
                      >
                        {isExpanded ? 'Hide' : 'Move Existing Booking'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => handleResolve(index, 'skip')}
                      >
                        <SkipForward className="w-3 h-3 mr-1" />
                        Skip This Slot
                      </Button>
                    </div>

                    {/* Inline move form */}
                    {isExpanded && (
                      <div className="mt-2 p-3 bg-white rounded-lg border space-y-3">
                        <p className="text-xs font-medium text-gray-700">
                          Move the existing booking ({clash.existingBooking.booker_name}) to:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">New Rink</Label>
                            <Select value={moveRink} onValueChange={setMoveRink}>
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {rinks.map(r => (
                                  <SelectItem key={r} value={String(r)}>Rink {r}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">New Time</Label>
                            <Select value={moveTime} onValueChange={setMoveTime}>
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {generateTimeSlots().map(t => (
                                  <SelectItem key={t} value={t}>{t}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleMoveBooking(index)}
                          disabled={movingIndex === index}
                        >
                          {movingIndex === index ? (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <ArrowRight className="w-3 h-3 mr-1" />
                          )}
                          Confirm Move
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Resolved — undo */}
                {isResolved && (
                  <button
                    className="ml-6 text-xs text-gray-400 hover:text-gray-600 underline"
                    onClick={() => handleUndo(index)}
                  >
                    Undo
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading || movingIndex !== null}>
            Cancel
          </Button>
          <Button
            onClick={handleProceed}
            disabled={!allResolved || isLoading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Proceed ({proceeedCount} booking{proceeedCount !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}