import React from 'react';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function InfoTooltip({ content, children }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children || (
            <button 
              type="button"
              className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors ml-1"
              onClick={(e) => e.preventDefault()}
            >
              <Info className="w-3 h-3" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}