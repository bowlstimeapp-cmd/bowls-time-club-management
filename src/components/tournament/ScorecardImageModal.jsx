import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function ScorecardImageModal({ imageUrl, title, onClose }) {
  return (
    <Dialog open={!!imageUrl} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title || 'Scorecard'}</DialogTitle>
        </DialogHeader>
        {imageUrl && (
          <img src={imageUrl} alt="Scorecard" className="w-full rounded-lg border border-gray-200" />
        )}
      </DialogContent>
    </Dialog>
  );
}