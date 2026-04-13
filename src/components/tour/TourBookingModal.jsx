import React, { useState, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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

/**
 * A tour-specific booking modal that:
 * - Only allows selecting "Private Roll-up"
 * - Highlights the competition type dropdown, then the submit button
 * - tourSubStep: 'select' | 'submit'
 * - Shows tour guidance overlay text
 */
export default function TourBookingModal({
  open,
  selectedSlots = [],
  selectedDate,
  onConfirm,
  club,
  tourSubStep, // 'select' | 'submit'
  onSubStepChange,
}) {
  const [competitionType, setCompetitionType] = useState('');
  const selectTriggerRef = useRef(null);
  const submitBtnRef = useRef(null);
  const [selectRect, setSelectRect] = useState(null);
  const [submitRect, setSubmitRect] = useState(null);

  useEffect(() => {
    if (!open) return;
    const measure = () => {
      if (selectTriggerRef.current) setSelectRect(selectTriggerRef.current.getBoundingClientRect());
      if (submitBtnRef.current) setSubmitRect(submitBtnRef.current.getBoundingClientRect());
    };
    measure();
    const t = setTimeout(measure, 100);
    window.addEventListener('resize', measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
    };
  }, [open, tourSubStep, competitionType]);

  const handleCompetitionChange = (val) => {
    if (val !== 'Private Roll-up') return; // only allow private roll-up
    setCompetitionType(val);
    onSubStepChange('submit');
    // re-measure after state update
    setTimeout(() => {
      if (submitBtnRef.current) setSubmitRect(submitBtnRef.current.getBoundingClientRect());
    }, 100);
  };

  const handleSubmit = () => {
    onConfirm('Private Roll-up');
    setCompetitionType('');
  };

  if (!selectedSlots || selectedSlots.length === 0) return null;

  const sortedSlots = [...selectedSlots].sort((a, b) => a.slotIndex - b.slotIndex);
  const firstSlot = sortedSlots[0];
  const lastSlot = sortedSlots[sortedSlots.length - 1];
  const rink = firstSlot.rink;

  const formatHour = (time) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    return hour < 12 ? `${hour}am` : hour === 12 ? '12pm' : `${hour - 12}pm`;
  };
  const timeRangeLabel = sortedSlots.length === 1
    ? firstSlot.slot.label
    : `${formatHour(firstSlot.slot.start)} - ${formatHour(lastSlot.slot.end)}`;

  return (
    <>
      <Dialog open={open}>
        <DialogContent
          className="sm:max-w-md max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900">Request Booking</DialogTitle>
            <DialogDescription className="text-gray-500">
              {sortedSlots.length > 1 ? `Booking ${sortedSlots.length} consecutive slots` : 'Your booking will be sent for approval'}
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
              <Select
                value={competitionType}
                onValueChange={handleCompetitionChange}
                disabled={tourSubStep === 'submit'}
              >
                <SelectTrigger ref={selectTriggerRef}>
                  <SelectValue placeholder="Select competition type..." />
                </SelectTrigger>
                <SelectContent style={{ zIndex: 9200 }}>
                  {['Club', 'County', 'National', 'Roll-up', 'Private Roll-up', 'Other'].map(type => (
                    <SelectItem
                      key={type}
                      value={type}
                      disabled={type !== 'Private Roll-up'}
                      className={type === 'Private Roll-up' ? 'font-semibold text-emerald-700' : 'opacity-40'}
                    >
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              ref={submitBtnRef}
              onClick={handleSubmit}
              disabled={tourSubStep !== 'submit'}
              className="bg-emerald-600 hover:bg-emerald-700 min-h-0"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tour highlight overlays on top of modal */}
      {open && tourSubStep === 'select' && selectRect && (
        <div
          style={{
            position: 'fixed',
            top: selectRect.top - 4,
            left: selectRect.left - 4,
            width: selectRect.width + 8,
            height: selectRect.height + 8,
            zIndex: 9300,
            border: '2px dashed #10b981',
            borderRadius: 8,
            boxShadow: '0 0 0 4px rgba(16,185,129,0.2)',
            pointerEvents: 'none',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}
      {open && tourSubStep === 'submit' && submitRect && (
        <div
          style={{
            position: 'fixed',
            top: submitRect.top - 4,
            left: submitRect.left - 4,
            width: submitRect.width + 8,
            height: submitRect.height + 8,
            zIndex: 9300,
            border: '2px dashed #10b981',
            borderRadius: 8,
            boxShadow: '0 0 0 4px rgba(16,185,129,0.2)',
            pointerEvents: 'none',
            animation: 'pulse 1.5s infinite',
          }}
        />
      )}
    </>
  );
}