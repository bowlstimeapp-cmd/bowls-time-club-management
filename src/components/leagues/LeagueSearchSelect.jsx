import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Trophy, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Searchable league selector — Popover + search Input pattern from ClubSearchSelect.
 * Props:
 *   leagues: array of active League objects
 *   value: 'all' or a league id
 *   onValueChange: (id | 'all') => void
 */
export default function LeagueSearchSelect({ leagues = [], value, onValueChange, placeholder = 'See all' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selected = leagues.find(l => l.id === value);
  const displayName = selected ? selected.name : placeholder;

  const filtered = search.trim()
    ? leagues.filter(l => l.name?.toLowerCase().includes(search.toLowerCase()))
    : leagues;

  const handleSelect = (id) => {
    onValueChange(id || 'all');
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
            {displayName}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-80" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search leagues..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto">
          <button
            className={cn(
              "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
              !value && "bg-emerald-50 text-emerald-700"
            )}
            onClick={() => handleSelect('all')}
          >
            <Trophy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            <span>See all</span>
          </button>
          {filtered.map(league => (
            <button
              key={league.id}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                value === league.id && "bg-emerald-50 text-emerald-700"
              )}
              onClick={() => handleSelect(league.id)}
            >
              <Trophy className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{league.name}</span>
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">No leagues found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}