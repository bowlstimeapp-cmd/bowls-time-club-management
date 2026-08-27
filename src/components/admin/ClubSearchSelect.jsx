import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Building2, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Searchable club select — adapted from MemberSearchSelect.
 * Props:
 *   clubs: array of Club objects
 *   value: selected club id
 *   onValueChange: (id | null) => void
 *   placeholder: string
 */
export default function ClubSearchSelect({
  clubs = [],
  value,
  onValueChange,
  placeholder = "Select a club",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedClub = clubs.find(c => c.id === value);
  const displayName = selectedClub ? selectedClub.name : null;

  const filtered = search.trim()
    ? clubs.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))
    : clubs;

  const handleSelect = (id) => {
    onValueChange(id || null);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full sm:w-80 justify-between h-9 font-normal text-sm"
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {displayName || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search clubs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">No clubs found</p>
          ) : filtered.map(club => (
            <button
              key={club.id}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                value === club.id && "bg-emerald-50 text-emerald-700"
              )}
              onClick={() => handleSelect(club.id)}
            >
              <Building2 className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{club.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}