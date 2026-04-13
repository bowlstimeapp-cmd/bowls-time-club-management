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
import { Calendar, Clock, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const FLASH_STYLE = `
  @keyframes tourFlash {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.25; }
  }
`;

function TourFlashOverlay({ rect, color = '#10b981', bgColor = 'rgba(16,185,129,0.18)' }) {
  if (!rect) return null;
  return (
    <>
      <style>{FLASH_STYLE}</style>
      <div
        style={{
          position: 'fixed',
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          zIndex: 9300,
          border: `2px dashed ${color}`,
          borderRadius: 8,
          backgroundColor: bgColor,
          boxShadow: `0 0 0 4px ${color}33`,
          pointerEvents: 'none',
          animation: 'tourFlash 1s ease-in-out infinite',
        }}
      />
    </>
  );
}

/**
 * Tour-specific booking modal.
 * tourSubStep: 'select' → highlight dropdown (step 3)
 * tourSubStep: 'submit' → highlight submit button (step 4)
 */
export default function TourBookingModal({
  open,
  selectedSlots = [],
  selectedDate,
  onConfirm,
  club,
  tourSubStep,      // 'select' | 'submit'
  onSubStepChange,
}) {
  const [competitionType, setCompetitionType] = useState('');
  const selectTriggerRef = useRef(null);
  const submitBtnRef = useRef(null);
  const [selectRect, setSelectRect] = useState(null);
  const [submitRect, setSubmitRect] = useState(null);

  useEffect(() => {
    if (!open) { setCompetitionType(''); return; }
    const measure = () => {
      if (selectTriggerRef.current) setSelectRect(selectTriggerRef.current.getBoundingClientRect());
      if (submitBtnRef.current) setSubmitRect(submitBtnRef.current.getBoundingClientRect());
    };
    measure();
    const t = setTimeout(measure, 120);
    window.addEventListener('resize', measure);
    return () => { clearTimeout(t); window.removeEventListener('resize', measure); };
  }, [open, tourSubStep, competitionType]);

  const handleCompetitionChange = (val) => {
    if (val !== 'Private Roll-up') return;
    setCompetitionType(val);
    onSubStepChange('submit');
  };

  const handleSubmit = () => {
    onConfirm('Private Roll-up');
    setCompetitionType('');
  };

  if (!open || !selectedSlots || selectedSlots.length === 0) return null;

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

          <DialogFooter>
            <Button
              ref={submitBtnRef}
              onClick={handleSubmit}
              disabled={tourSubStep !== 'submit'}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Flashing highlight overlays */}
      {tourSubStep === 'select' && <TourFlashOverlay rect={selectRect} />}
      {tourSubStep === 'submit' && <TourFlashOverlay rect={submitRect} />}
    </>
  );
}