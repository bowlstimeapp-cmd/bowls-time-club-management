import React from 'react';
import { Link } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import { ONBOARDING_ITEMS } from '@/lib/onboardingChecklist';
import { PlayCircle, Settings, Users, Shield, LifeBuoy, CheckCircle2, ArrowRight } from 'lucide-react';

const ICON_MAP = {
  PlayCircle,
  Settings,
  Users,
  Shield,
  LifeBuoy,
};

export default function OnboardingModal({ open, clubId, completedItems = [], onClose, onDismissSession, onTakeTour }) {
  if (!open) return null;

  const completedSet = new Set(completedItems);
  const completedCount = ONBOARDING_ITEMS.filter(item => completedSet.has(item.key)).length;

  const getItemLink = (item) => {
    if (!item.page) return null;
    if (item.page === 'HelpCentre') return createPageUrl('HelpCentre');
    return createPageUrl(item.page) + `?clubId=${clubId}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg mx-4 sm:mx-auto">
        <DialogHeader>
          <DialogTitle className="text-xl pr-6">Get your club set up</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Progress indicator */}
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-gray-600">
              {completedCount} of {ONBOARDING_ITEMS.length} complete
            </p>
            <div className="flex-1 max-w-[120px] h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${(completedCount / ONBOARDING_ITEMS.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            {ONBOARDING_ITEMS.map((item) => {
              const Icon = ICON_MAP[item.icon];
              const isComplete = completedSet.has(item.key);
              const link = getItemLink(item);

              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${isComplete ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-gray-200'}`}
                >
                  {isComplete ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  ) : (
                    <Icon className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <span className={`text-sm font-medium flex-1 ${isComplete ? 'text-gray-500' : 'text-gray-900'}`}>
                    {item.label}
                  </span>
                  {item.key === 'tour' ? (
                    <Button size="sm" variant="outline" onClick={onTakeTour}>
                      <PlayCircle className="w-3.5 h-3.5 mr-1" />
                      Take Tour
                    </Button>
                  ) : link ? (
                    <Link to={link} onClick={onClose}>
                      <Button size="sm" variant="outline">
                        <ArrowRight className="w-3.5 h-3.5 mr-1" />
                        Go
                      </Button>
                    </Link>
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* View Full Checklist */}
          <Link to={createPageUrl('OnboardingChecklist') + `?clubId=${clubId}`} onClick={onClose}>
            <Button variant="link" className="w-full text-sm text-gray-500 p-0">
              View Full Checklist
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>

        {/* Footer */}
        <div className="flex gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Remind me next time
          </Button>
          <Button variant="ghost" onClick={onDismissSession} className="flex-1 text-gray-500">
            Don't show again this session
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}