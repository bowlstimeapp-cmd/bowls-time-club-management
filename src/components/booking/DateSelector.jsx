import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronLeft, ChevronRight, CalendarIcon } from 'lucide-react';
import { format, addDays, subDays, isBefore, startOfToday } from 'date-fns';
import { cn } from '@/lib/utils';

export default function DateSelector({ selectedDate, onDateChange }) {
  const today = startOfToday();
  const canGoPrevious = !isBefore(subDays(selectedDate, 1), today);

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange(subDays(selectedDate, 1))}
          disabled={!canGoPrevious}
          className="h-10 w-10"
        >
          <ChevronLeft className="w-4 h-4" />
        </Button>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "min-w-[200px] justify-start text-left font-medium",
                "hover:bg-emerald-50 hover:border-emerald-300"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4 text-emerald-600" />
              {format(selectedDate, 'EEEE, d MMMM yyyy')}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && onDateChange(date)}
              disabled={(date) => isBefore(date, today)}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange(addDays(selectedDate, 1))}
          className="h-10 w-10"
        >
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <Button
        variant="ghost"
        onClick={() => onDateChange(today)}
        className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
      >
        Today
      </Button>
    </div>
  );
}