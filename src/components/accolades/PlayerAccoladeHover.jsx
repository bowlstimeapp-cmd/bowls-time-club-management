import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function PlayerAccoladeHover({ email, accolades = [], assignments = [], children }) {
  if (!email) return children;

  // Count assignments for this user
  const myAssignments = assignments.filter(a => a.user_email === email);
  const grouped = {};
  myAssignments.forEach(a => {
    grouped[a.accolade_id] = (grouped[a.accolade_id] || 0) + 1;
  });

  const badges = Object.entries(grouped).map(([accoladeId, count]) => {
    const accolade = accolades.find(a => a.id === accoladeId);
    return accolade ? { accolade, count } : null;
  }).filter(Boolean);

  if (badges.length === 0) return children;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default underline decoration-dotted decoration-amber-400 underline-offset-2">
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-white border shadow-lg p-3 max-w-xs">
          <p className="text-xs font-semibold text-gray-500 mb-2">Accolades</p>
          <div className="flex flex-wrap gap-2">
            {badges.map(({ accolade, count }) => (
              <div key={accolade.id} className="flex flex-col items-center bg-amber-50 border border-amber-200 rounded-lg px-2 py-1 min-w-[56px] text-center">
                <span className="text-xl">{accolade.emoji || '🏆'}</span>
                <span className="text-xs font-medium text-amber-900 leading-tight">{accolade.name}</span>
                {count > 1 && (
                  <span className="text-xs font-bold bg-amber-400 text-white rounded-full px-1.5 mt-0.5">{count}x</span>
                )}
              </div>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}