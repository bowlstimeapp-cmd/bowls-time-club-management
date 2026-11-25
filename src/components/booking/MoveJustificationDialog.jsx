import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

export default function MoveJustificationDialog({
  open,
  booking,
  newRink,
  newStartTime,
  onSend,
  onSkip,
  isSending = false,
}) {
  const [step, setStep] = useState('ask');
  const [justification, setJustification] = useState('');

  useEffect(() => {
    if (open) {
      setStep('ask');
      setJustification('');
    }
  }, [open]);

  const summary = booking
    ? `Rink ${booking.rink_number} at ${booking.start_time} → Rink ${newRink} at ${newStartTime}`
    : '';

  const canSend = justification.trim().length > 0 && !isSending;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen && !isSending) onSkip();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Email {booking?.booker_name} about this move?</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">{summary}</p>

          {step === 'ask' ? (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <Button variant="outline" onClick={onSkip} className="w-full sm:w-auto">
                No, don't email
              </Button>
              <Button
                onClick={() => setStep('message')}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
              >
                Yes, add a message
              </Button>
            </div>
          ) : (
            <>
              <div>
                <Label htmlFor="move-justification" className="text-base font-semibold">
                  Justification for the member
                </Label>
                <Textarea
                  id="move-justification"
                  rows={4}
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Rink 3 is being resurfaced, so we've moved your session to Rink 4"
                  className="mt-2 text-base"
                />
              </div>
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('ask')}
                  disabled={isSending}
                  className="w-full sm:w-auto"
                >
                  Back
                </Button>
                <Button
                  onClick={() => onSend(justification.trim())}
                  disabled={!canSend}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    'Send'
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}