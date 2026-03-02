import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SearchableMemberSelect({
  members,
  value,
  onValueChange,
  positionKey,
  isAvailableFn,
  isUnavailableOnDateFn,
  getMemberName,
  getMemberNameByEmail,
  placeholder = "Select member"
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredMembers = search.trim()
    ? members.filter(m => getMemberName(m).toLowerCase().includes(search.toLowerCase()))
    : members;

  const handleSelect = (email) => {
    onValueChange(email || null);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setSearch(''); }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="flex-1 justify-between h-9 font-normal text-sm min-w-0"
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {value ? getMemberNameByEmail(value) : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-56" align="start">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-8 text-xs"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto">
          <button
            className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic border-b"
            onClick={() => handleSelect(null)}
          >
            — Clear —
          </button>
          {filteredMembers.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">No members found</p>
          ) : filteredMembers.map(member => {
            const available = isAvailableFn(member.user_email, positionKey);
            const unavailableDate = isUnavailableOnDateFn(member.user_email);
            return (
              <button
                key={member.id}
                className={cn(
                  "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                  !available && "opacity-40 cursor-not-allowed",
                  value === member.user_email && "bg-emerald-50 text-emerald-700"
                )}
                onClick={() => available && handleSelect(member.user_email)}
                disabled={!available}
              >
                {unavailableDate ? (
                  <span className="text-red-500 font-bold text-xs w-5 flex-shrink-0">NA</span>
                ) : (
                  <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                )}
                <span className="truncate">
                  {getMemberName(member)}
                  {!available && <span className="text-xs text-gray-400 ml-1">(selected)</span>}
                </span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}