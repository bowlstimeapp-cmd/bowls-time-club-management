import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { SECTIONS } from '@/pages/HelpCentre';
import { PAGE_HELP, AUDIENCE_CLUB_ADMIN } from '@/lib/pageHelpMap';
import { isPageDismissed, markSessionDismissed, addLocalDismissed } from '@/lib/helpPopupStorage';
import { useSeniorMode } from '@/lib/SeniorModeContext';
import { useAccessibility } from '@/lib/AccessibilityContext';
import { cn } from '@/lib/utils';

const SHOW_DELAY_MS = 600;

const boldify = (text) =>
  text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium text-gray-900">$1</strong>');

const tipify = (text) =>
  text.replace(/\*\*(.*?)\*\*/g, '<strong class="font-medium text-amber-900">$1</strong>');

function resolveSection(entry) {
  const section = SECTIONS.find(s => s.id === entry.sectionId);
  if (!section) {
    console.warn(`[PageHelpPopup] No Help Centre section with id "${entry.sectionId}"`);
    return { section: null, steps: [] };
  }
  if (!entry.steps || entry.steps.length === 0) return { section, steps: section.steps };

  const steps = entry.steps
    .map(heading => {
      const found = section.steps.find(s => s.heading === heading);
      if (!found) {
        console.warn(`[PageHelpPopup] Step "${heading}" not found in section "${section.id}"`);
      }
      return found;
    })
    .filter(Boolean);

  return { section, steps };
}

function tourIsActive() {
  try {
    return (
      localStorage.getItem('bowlstime_tour_paused') === 'true' ||
      localStorage.getItem('bowlstime_tour_step') !== null
    );
  } catch {
    return false;
  }
}

function anotherDialogIsOpen() {
  return !!document.querySelector('[role="dialog"][data-state="open"]');
}

// On phones every step starts collapsed so the guide opens as a short list
function isMobileViewport() {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

export default function PageHelpPopup({ pageName, user, clubId, isClubAdmin, isSelector, suppress }) {
  const [open, setOpen] = useState(false);
  const [openStep, setOpenStep] = useState('');
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { seniorMode } = useSeniorMode();
  const { preset } = useAccessibility();

  const large = seniorMode || preset === 'senior' || preset === 'maximum';
  const extraLarge = preset === 'maximum';

  const entry = PAGE_HELP[pageName];
  const { section, steps } = useMemo(() => (entry ? resolveSection(entry) : { section: null, steps: [] }), [pageName]);

  const audienceAllows = entry
    ? entry.audience === AUDIENCE_CLUB_ADMIN
      ? !!isClubAdmin
      : !!(isClubAdmin || isSelector)
    : false;

  useEffect(() => {
    if (!entry || !section || steps.length === 0) return undefined;
    if (suppress) return undefined;
    if (!audienceAllows) return undefined;
    if (user?.tour_completed !== true) return undefined;
    if (user?.help_popups_enabled === false) return undefined;
    if (tourIsActive()) return undefined;

    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      if (isPageDismissed(pageName, user)) return;
      if (anotherDialogIsOpen()) return;
      setDontShowAgain(false);
      setOpenStep(isMobileViewport() ? '' : steps[0].heading);
      setOpen(true);
    }, SHOW_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pageName, suppress, audienceAllows, user?.email, user?.tour_completed, user?.help_popups_enabled, steps.length]);

  // Close whenever the user navigates to a different page
  useEffect(() => {
    setOpen(false);
  }, [pageName]);

  if (!entry || !section || steps.length === 0) return null;

  const handleClose = () => {
    markSessionDismissed(pageName);
    setOpen(false);
  };

  const handleGotIt = async () => {
    markSessionDismissed(pageName);
    if (dontShowAgain) {
      const merged = Array.from(new Set([...(user?.dismissed_help_popups || []), pageName]));
      try {
        await base44.auth.updateMe({ dismissed_help_popups: merged });
      } catch {
        addLocalDismissed(pageName);
      }
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) handleClose(); }}>
      <DialogContent
        className={cn(
          'p-0 gap-0 flex flex-col max-h-[92dvh] overflow-hidden',
          large ? 'max-w-3xl' : 'max-w-2xl'
        )}
      >
        {/* Header */}
        <div className="flex items-start gap-3 border-b border-gray-200 bg-emerald-50 px-5 py-4 pr-12 shrink-0">
          <span className={cn('leading-none shrink-0', large ? 'text-3xl' : 'text-2xl')} aria-hidden="true">
            {section.icon}
          </span>
          <div className="min-w-0">
            <DialogTitle className={cn('font-bold text-gray-900 leading-snug', large ? 'text-2xl' : 'text-xl')}>
              Quick guide: {section.title}
            </DialogTitle>
            <DialogDescription className={cn('mt-1 text-gray-600 leading-relaxed', large ? 'text-base' : 'text-sm')}>
              {section.intro}
            </DialogDescription>
          </div>
        </div>

        {/* Body */}
        <div className={cn('flex-1 overflow-y-auto overscroll-contain px-4 py-4', large ? 'sm:px-5' : 'sm:px-5')}>
          <Accordion
            type="single"
            collapsible
            value={openStep}
            onValueChange={setOpenStep}
            className="space-y-2"
          >
            {steps.map((step, index) => (
              <AccordionItem
                key={step.heading}
                value={step.heading}
                className={cn('rounded-lg border bg-white px-3', extraLarge ? 'border-2 border-gray-300' : 'border-gray-200')}
              >
                <AccordionTrigger
                  className={cn(
                    'text-left font-semibold text-gray-900 hover:no-underline py-3',
                    large ? 'text-lg' : 'text-base'
                  )}
                >
                  <span>{index + 1}. {step.heading}</span>
                </AccordionTrigger>
                <AccordionContent className="pb-3">
                  <ol className="space-y-2">
                    {step.instructions.map((instruction, i) => (
                      <li
                        key={i}
                        className={cn('flex gap-2.5 text-gray-700', large ? 'text-base' : 'text-sm')}
                      >
                        <span className={cn(
                          'flex-shrink-0 mt-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center',
                          large ? 'w-6 h-6 text-sm' : 'w-5 h-5 text-xs'
                        )}>
                          {i + 1}
                        </span>
                        <span
                          className="leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: boldify(instruction) }}
                        />
                      </li>
                    ))}
                  </ol>
                  {step.tip && (
                    <div className={cn(
                      'mt-3 flex gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2',
                      extraLarge && 'border-2 border-amber-200'
                    )}>
                      <span className={cn('font-semibold text-amber-700', large ? 'text-base' : 'text-sm')}>💡 Tip:</span>
                      <span
                        className={cn('text-amber-800 leading-relaxed', large ? 'text-base' : 'text-sm')}
                        dangerouslySetInnerHTML={{ __html: tipify(step.tip) }}
                      />
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <Link
            to={createPageUrl('HelpCentre')}
            onClick={handleClose}
            className={cn(
              'mt-4 inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2',
              large ? 'text-base' : 'text-sm'
            )}
          >
            Open the full Help Centre
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4 sm:px-5">
          <label
            htmlFor="help-popup-dont-show"
            className={cn(
              'flex items-center gap-3 cursor-pointer select-none py-1',
              large ? 'text-lg' : 'text-base'
            )}
          >
            <Checkbox
              id="help-popup-dont-show"
              checked={dontShowAgain}
              onCheckedChange={(value) => setDontShowAgain(value === true)}
              className={cn('shrink-0', large ? 'h-7 w-7' : 'h-6 w-6')}
            />
            <span className="font-medium text-gray-800">Don't show this again on this page</span>
          </label>
          <Button
            onClick={handleGotIt}
            className={cn(
              'mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold',
              large ? 'h-12 text-lg' : 'h-11 text-base'
            )}
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}