import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Minus, Loader2 } from 'lucide-react';

export default function AdminAvailabilityModal({
  open,
  onClose,
  selection,
  members,
  availabilities,
  onSave,
  isSaving,
}) {
  // Local state: map of email -> true | false | undefined
  const [localAvailability, setLocalAvailability] = useState({});

  useEffect(() => {
    if (!open || !selection) return;
    // Initialise from current availabilities for selected players
    const selectedEmails = Object.values(selection.selections || {}).filter(Boolean);
    const init = {};
    selectedEmails.forEach(email => {
      const avail = availabilities.find(a => a.user_email === email);
      init[email] = avail ? avail.is_available : undefined;
    });
    setLocalAvailability(init);
  }, [open, selection, availabilities]);

  const selectedEmails = Object.values(selection?.selections || {}).filter(Boolean);

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    if (member?.first_name && member?.surname) return `${member.first_name} ${member.surname}`;
    return member?.user_name || email;
  };

  const toggle = (email, value) => {
    setLocalAvailability(prev => ({
      ...prev,
      // If clicking the same value, clear it back to undefined; otherwise set it
      [email]: prev[email] === value ? undefined : value,
    }));
  };

  const handleSave = () => {
    onSave(localAvailability);
  };

  const statusIcon = (status) => {
    if (status === true) return <CheckCircle className="w-4 h-4 text-emerald-600" />;
    if (status === false) return <XCircle className="w-4 h-4 text-red-600" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const statusLabel = (status) => {
    if (status === true) return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Available</Badge>;
    if (status === false) return <Badge className="bg-red-100 text-red-700 border-red-200">Unavailable</Badge>;
    return <Badge variant="outline" className="text-gray-400">Not set</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle>Set Player Availability</DialogTitle>
        </DialogHeader>

        {selectedEmails.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No players selected for this match.</p>
        ) : (
          <div className="space-y-2 py-2">
            {selectedEmails.map(email => {
              const status = localAvailability[email];
              return (
                <div key={email} className="flex items-center justify-between p-3 rounded-lg border bg-gray-50">
                  <div className="flex items-center gap-2">
                    {statusIcon(status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">{getMemberName(email)}</p>
                      <div className="mt-0.5">{statusLabel(status)}</div>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <Button
                      size="sm"
                      variant={status === true ? 'default' : 'outline'}
                      className={status === true ? 'bg-emerald-600 hover:bg-emerald-700 h-8 text-xs' : 'h-8 text-xs'}
                      onClick={() => toggle(email, true)}
                    >
                      ✓
                    </Button>
                    <Button
                      size="sm"
                      variant={status === false ? 'default' : 'outline'}
                      className={status === false ? 'bg-red-600 hover:bg-red-700 h-8 text-xs' : 'h-8 text-xs text-red-600'}
                      onClick={() => toggle(email, false)}
                    >
                      ✗
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Close</Button>
          <Button
            onClick={handleSave}
            disabled={isSaving || selectedEmails.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}