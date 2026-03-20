import React, { useState, useMemo, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, CheckCircle, SkipForward, ArrowRight, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

export default function RinkClashModal({
  open, clashes = [], nonClashingBookings = [], allBookings = [],
  club, onProceed, onClose, isLoading,
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

  const allTimeSlots = useMemo(() => {
    const slots = [];
    const [openHour] = (club?.opening_time || '10:00').split(':').map(Number);
    const [closeHour] = (club?.closing_time || '21:00').split(':').map(Number);
    const duration = club?.session_duration || 2;
    for (let hour = openHour; hour + duration <= closeHour; hour += duration) {
      slots.push(`${String(hour).padStart(2, '0')}:00`);
    }
    return slots;
  }, [club]);

  const formatTimeRange = (startTime) => {
    const [hours] = startTime.split(':');
    const hour = parseInt(hours);
    const duration = club?.session_duration || 2;
    const endHour = hour + duration;
    const fmt = (h) => h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
    return `${fmt(hour)} – ${fmt(endHour)}`;
  };

  /**
   * Compute which rink:date:time slots are effectively occupied,
   * accounting for resolutions already made (use_suggestion or moved).
   * This ensures that accepting a suggestion for clash A removes that
   * rink from clash B's options.
   */
  const effectiveOccupied = useMemo(() => {
    const occupied = new Set();

    // All existing bookings
    allBookings.forEach(b => {
      if (b.status !== 'cancelled' && b.status !== 'rejected') {
        occupied.add(`${b.date}:${b.rink_number}:${b.start_time}`);
      }
    });

    // Non-clashing proposed bookings (will be created)
    nonClashingBookings.forEach(b => {
      occupied.add(`${b.date}:${b.rink_number}:${b.start_time}`);
    });

    // Resolution effects
    Object.entries(resolutions).forEach(([idxStr, res]) => {
      const clash = clashes[parseInt(idxStr)];
      if (!clash) return;
      if (res.type === 'use_suggestion' && res.rink) {
        // Proposed booking uses the suggested rink — that slot is now taken
        occupied.add(`${clash.proposedBooking.date}:${res.rink}:${clash.proposedBooking.start_time}`);
      }
      if (res.type === 'moved' && res.newRink && res.newTime) {
        // Existing booking was physically moved to a new slot — that slot is now taken
        occupied.add(`${clash.existingBooking.date}:${res.newRink}:${res.newTime}`);
        // Original clash slot stays occupied (proposed booking will fill it)
      }
    });

    return occupied;
  }, [allBookings, nonClashingBookings, clashes, resolutions]);

  /** Dynamically compute ALL free rinks for a clash given current resolutions */
  const getDynamicAvailableRinks = (clash) => {
    const { date, start_time } = clash.proposedBooking;
    return rinks.filter(r => !effectiveOccupied.has(`${date}:${r}:${start_time}`));
  };

  /** Available times on a specific rink+date, excluding occupied slots */
  const getAvailableTimesForRink = (date, rink) =>
    allTimeSlots.filter(t => !effectiveOccupied.has(`${date}:${rink}:${t}`));

  /** Available rinks at a specific time+date */
  const getAvailableRinksForTime = (date, time) =>
    rinks.filter(r => !effectiveOccupied.has(`${date}:${r}:${time}`));

  const resolvedCount = clashes.filter((_, i) => resolutions[i]?.type).length;
  const allResolved = clashes.length > 0 && resolvedCount === clashes.length;

  const handleResolve = (index, type, extraData = {}) => {
    setResolutions(prev => ({ ...prev, [index]: { type, ...extraData } }));
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
    if (expandedMove === index) {
      setExpandedMove(null);
    } else {
      setExpandedMove(index);
      setMoveRink('');
      setMoveTime('');
    }
  };

  const handleMoveBooking = async (index) => {
    const clash = clashes[index];
    if (!moveRink || !moveTime) {
      toast.error('Please select a rink and time');
      return;
    }

    const date = clash.existingBooking.date;
    if (effectiveOccupied.has(`${date}:${parseInt(moveRink)}:${moveTime}`)) {
      toast.error(`Rink ${moveRink} at ${formatTimeRange(moveTime)} is not available`);
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

      handleResolve(index, 'moved', { newRink: parseInt(moveRink), newTime: moveTime });
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
        bookingsToCreate.push({ ...clash.proposedBooking, rink_number: resolution.rink });
      } else if (resolution.type === 'moved') {
        bookingsToCreate.push(clash.proposedBooking);
      }
      // 'skip' → omit
    });
    onProceed(bookingsToCreate);
  };

  const proceedCount = nonClashingBookings.length +
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
            const availableRinks = getDynamicAvailableRinks(clash);

            const date = clash.existingBooking.date;
            const availTimesForRink = moveRink ? getAvailableTimesForRink(date, parseInt(moveRink)) : allTimeSlots;
            const availRinksForTime = moveTime ? getAvailableRinksForTime(date, moveTime) : rinks;

            return (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-colors ${isResolved ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}
              >
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
                      {resolution.type === 'use_suggestion' && `→ Rink ${resolution.rink}`}
                      {resolution.type === 'moved' && `Existing → Rink ${resolution.newRink}`}
                      {resolution.type === 'skip' && 'Skipped'}
                    </Badge>
                  )}
                </div>

                {!isResolved && (
                  <div className="ml-6 space-y-2">
                    {availableRinks.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-gray-600">
                          {availableRinks.length === 1
                            ? `Rink ${availableRinks[0]} is free at this time`
                            : `Rinks ${availableRinks.slice(0, -1).join(', ')} and ${availableRinks[availableRinks.length - 1]} are free at this time`}
                        </span>
                        {availableRinks.map(r => (
                          <Button
                            key={r}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleResolve(index, 'use_suggestion', { rink: r })}
                          >
                            Use Rink {r}
                          </Button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-red-600 font-medium">No alternative rink available at this time</p>
                    )}

                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openMoveForm(index)}>
                        {isExpanded ? 'Hide' : 'Move Existing Booking'}
                      </Button>
                      <Button
                        size="sm" variant="ghost"
                        className="h-7 text-xs text-gray-500 hover:text-gray-700"
                        onClick={() => handleResolve(index, 'skip')}
                      >
                        <SkipForward className="w-3 h-3 mr-1" />
                        Skip This Slot
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 p-3 bg-white rounded-lg border space-y-3">
                        <p className="text-xs font-medium text-gray-700">
                          Move <span className="font-semibold">{clash.existingBooking.booker_name}</span>'s booking to an available slot:
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-xs">New Rink</Label>
                            <Select
                              value={moveRink}
                              onValueChange={(v) => {
                                setMoveRink(v);
                                // Auto-clear time if it's no longer available on the new rink
                                if (moveTime && effectiveOccupied.has(`${date}:${parseInt(v)}:${moveTime}`)) {
                                  setMoveTime('');
                                }
                              }}
                            >
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder="Select rink…" />
                              </SelectTrigger>
                              <SelectContent>
                                {(moveTime ? availRinksForTime : rinks).map(r => (
                                  <SelectItem key={r} value={String(r)}>Rink {r}</SelectItem>
                                ))}
                                {moveTime && availRinksForTime.length === 0 && (
                                  <div className="px-2 py-2 text-xs text-red-500 text-center">No rinks free at this time</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs">New Time</Label>
                            <Select value={moveTime} onValueChange={setMoveTime}>
                              <SelectTrigger className="h-8 text-xs mt-1">
                                <SelectValue placeholder="Select time…" />
                              </SelectTrigger>
                              <SelectContent>
                                {availTimesForRink.map(t => (
                                  <SelectItem key={t} value={t}>{formatTimeRange(t)}</SelectItem>
                                ))}
                                {availTimesForRink.length === 0 && (
                                  <div className="px-2 py-2 text-xs text-red-500 text-center">No times free on this rink</div>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        {!moveRink && !moveTime && (
                          <p className="text-xs text-gray-500">Select a rink to see available times, or select a time to see available rinks.</p>
                        )}
                        <Button
                          size="sm"
                          className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleMoveBooking(index)}
                          disabled={movingIndex === index || !moveRink || !moveTime}
                        >
                          {movingIndex === index
                            ? <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            : <ArrowRight className="w-3 h-3 mr-1" />}
                          Confirm Move
                        </Button>
                      </div>
                    )}
                  </div>
                )}

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
            Proceed ({proceedCount} booking{proceedCount !== 1 ? 's' : ''})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}