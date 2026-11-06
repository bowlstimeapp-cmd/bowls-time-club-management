import React, { useMemo, useState } from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { Check, Minus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

// Checkbox that can also show the indeterminate (mixed) state with a dash
function TriStateCheckbox({ state, onCheckedChange }) {
  return (
    <CheckboxPrimitive.Root
      checked={state}
      onCheckedChange={onCheckedChange}
      onClick={(e) => e.stopPropagation()}
      aria-label="Select all admins in this club"
      className="h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=checked]:bg-primary data-[state=indeterminate]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:text-primary-foreground"
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        {state === 'indeterminate' ? <Minus className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export default function AdminRecipientsPanel({
  clubGroups,
  selectedKeys,
  selectedCount,
  selectedClubCount,
  loading,
  onToggleEmail,
  onToggleClub,
  onSetRecipients,
}) {
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  const visibleGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clubGroups.filter(g => {
      if (!showInactive && g.club.is_active === false) return false;
      if (!q) return true;
      if ((g.club.name || '').toLowerCase().includes(q)) return true;
      return g.admins.some(a => a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q));
    });
  }, [clubGroups, search, showInactive]);

  const handleSelectAll = () => {
    onSetRecipients(visibleGroups.flatMap(g => g.admins.map(a => a.email)));
  };

  const clubState = (group) => {
    const total = group.admins.length;
    const picked = group.admins.filter(a => selectedKeys.has(a.email.toLowerCase())).length;
    if (picked === 0) return false;
    if (picked === total) return true;
    return 'indeterminate';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-gray-900">Choose recipients</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {selectedCount} admin{selectedCount === 1 ? '' : 's'} selected from {selectedClubCount} club{selectedClubCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clubs, admins or emails"
          className="pl-8 h-9"
        />
      </div>

      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex gap-1.5">
          <Button variant="outline" size="sm" onClick={handleSelectAll} disabled={visibleGroups.length === 0}>
            Select all
          </Button>
          <Button variant="outline" size="sm" onClick={() => onSetRecipients([])} disabled={selectedCount === 0}>
            Clear all
          </Button>
        </div>
        <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
          <Switch checked={showInactive} onCheckedChange={setShowInactive} className="scale-90" />
          Show inactive
        </label>
      </div>

      {loading ? (
        <div className="space-y-2 py-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : visibleGroups.length === 0 ? (
        <p className="text-sm text-gray-500 py-8 text-center">No clubs with admins match this search.</p>
      ) : (
        <div className="max-h-[520px] overflow-y-auto -mx-1 px-1">
          <Accordion type="multiple" className="w-full">
            {visibleGroups.map((group) => {
              const total = group.admins.length;
              const picked = group.admins.filter(a => selectedKeys.has(a.email.toLowerCase())).length;
              return (
                <AccordionItem key={group.club.id} value={group.club.id}>
                  <h3 className="flex items-center gap-2">
                    <TriStateCheckbox
                      state={clubState(group)}
                      onCheckedChange={(state) => onToggleClub(group, state === true)}
                    />
                    <AccordionTrigger className="flex-1 hover:no-underline py-2.5">
                      <div className="flex-1 text-left pr-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">{group.club.name}</span>
                          {group.club.is_active === false && (
                            <span className="text-[10px] uppercase tracking-wide bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {total} admin{total === 1 ? '' : 's'} &middot; {picked} of {total} selected
                        </div>
                      </div>
                    </AccordionTrigger>
                  </h3>
                  <AccordionContent className="pb-2">
                    <div className="pl-6 space-y-0.5">
                      {group.admins.map((admin) => (
                        <label
                          key={admin.email.toLowerCase()}
                          className="flex items-start gap-2.5 px-2 py-1.5 rounded hover:bg-gray-50 cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedKeys.has(admin.email.toLowerCase())}
                            onCheckedChange={(checked) => onToggleEmail(admin.email, checked === true)}
                            className="mt-0.5"
                          />
                          <span className="min-w-0">
                            <span className="block text-sm text-gray-800 truncate">{admin.name}</span>
                            <span className="block text-xs text-gray-500 truncate">{admin.email}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </div>
      )}
    </div>
  );
}