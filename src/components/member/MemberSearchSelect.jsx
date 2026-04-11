import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, User, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Simple searchable member select — no availability logic.
 * Props:
 *   members: array of ClubMembership objects
 *   value: selected email string
 *   onValueChange: (email | null) => void
 *   placeholder: string
 *   clearLabel: string (default "— None —")
 */
export default function MemberSearchSelect({
  members = [],
  value,
  onValueChange,
  placeholder = "Select member",
  clearLabel = "— None —",
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const getMemberName = (m) =>
    m.first_name && m.surname ? `${m.first_name} ${m.surname}` : m.user_name || m.user_email;

  const selectedMember = members.find(m => m.user_email === value);
  const displayName = selectedMember ? getMemberName(selectedMember) : null;

  const filtered = search.trim()
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
          className="w-full justify-between h-9 font-normal text-sm"
        >
          <span className={cn("truncate", !value && "text-gray-400")}>
            {displayName || placeholder}
          </span>
          <ChevronDown className="w-4 h-4 opacity-50 flex-shrink-0 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
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
        <div className="max-h-56 overflow-y-auto">
          <button
            className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 italic border-b"
            onClick={() => handleSelect(null)}
          >
            {clearLabel}
          </button>
          {filtered.length === 0 ? (
            <p className="px-3 py-3 text-xs text-gray-400 text-center">No members found</p>
          ) : filtered.map(member => (
            <button
              key={member.id || member.user_email}
              className={cn(
                "w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors",
                value === member.user_email && "bg-emerald-50 text-emerald-700"
              )}
              onClick={() => handleSelect(member.user_email)}
            >
              <User className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <span className="truncate">{getMemberName(member)}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}