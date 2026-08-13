import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { Pin, PinOff, PlayCircle, Settings, Users, LifeBuoy } from 'lucide-react';

export default function NewClubWelcomeModal({ open, clubId, onTakeTour, onClose, onPin, onUnpin }) {
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-6">Welcome to your new club within Bowls Time!</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <p className="text-sm text-gray-600 leading-relaxed">
            We recommend learning about the rink booking by following the Bowls Time tour, taking a look at customising Club Settings, and adding other club members so they can take a look around too.
          </p>

          <div className="space-y-2">
            <Button
              onClick={() => { onTakeTour(); }}
              className="w-full bg-emerald-600 hover:bg-emerald-700 justify-start"
            >
              <PlayCircle className="w-4 h-4 mr-2" />
              Take the Bowls Time Tour
            </Button>

            <Link to={createPageUrl('ClubSettings') + `?clubId=${clubId}`} onClick={onClose}>
              <Button variant="outline" className="w-full justify-start">
                <Settings className="w-4 h-4 mr-2" />
                Customise Club Settings
              </Button>
            </Link>

            <Link to={createPageUrl('ClubAdmin') + `?clubId=${clubId}`} onClick={onClose}>
              <Button variant="outline" className="w-full justify-start">
                <Users className="w-4 h-4 mr-2" />
                Add Club Members
              </Button>
            </Link>

            <Link to={createPageUrl('HelpCentre')} onClick={onClose}>
              <Button variant="outline" className="w-full justify-start">
                <LifeBuoy className="w-4 h-4 mr-2" />
                Help Centre — User Guides &amp; Admin Guides
              </Button>
            </Link>
          </div>

          <p className="text-xs text-gray-500">
            User guides and admin guides are also available from the Help Centre at any time.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={onPin} className="flex-1">
            <Pin className="w-4 h-4 mr-2" />
            Pin this message
          </Button>
          <Button variant="outline" onClick={onUnpin} className="flex-1">
            <PinOff className="w-4 h-4 mr-2" />
            Unpin
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}