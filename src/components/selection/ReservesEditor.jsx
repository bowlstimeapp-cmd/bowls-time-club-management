import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { X, Plus, UserPlus } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import SearchableMemberSelect from '@/components/selection/SearchableMemberSelect';

/**
 * Reserves card for the SelectionEditor — sits directly below the team grid.
 * Reserves are stored in their own fields (pick_reserves / reserves_mode /
 * reserves) and are never treated as players.
 */
export default function ReservesEditor({
  pickReserves,
  onPickReservesChange,
  reservesMode,
  onReservesModeChange,
  reserves,
  onReserveChange,
  onReserveRemove,
  onReserveTypeChange,
  onAddReserve,
  playerEmails = [],
  members = [],
  matchDate,
  unavailabilities = [],
  interestedEmails,
  selectionNames = {},
  defaultReserveType = 'home',
}) {
  const sorted = [...reserves].sort((a, b) => (a.slot || 0) - (b.slot || 0));
  const playerSet = new Set(playerEmails);

  const getMemberName = (m) =>
    m?.first_name && m?.surname ? `${m.first_name} ${m.surname}` : m?.user_name || m?.user_email;

  const getMemberNameByEmail = (email, positionKey) => {
    if (positionKey && selectionNames?.[positionKey]) return selectionNames[positionKey];
    const m = members.find((x) => x.user_email === email);
    return m?.user_name || email;
  };

  const isUnavailableOnDate = (memberEmail) => {
    if (!matchDate) return false;
    const date = typeof matchDate === 'string' ? parseISO(matchDate) : matchDate;
    return unavailabilities.some((u) =>
      u.user_email === memberEmail &&
      isWithinInterval(date, { start: parseISO(u.start_date), end: parseISO(u.end_date) })
    );
  };

  // A member can appear only once across the whole selection: exclude anyone
  // already picked as a player or as a reserve in another slot
  const optionsFor = (slot) =>
    members.filter((m) =>
      !playerSet.has(m.user_email) &&
      !reserves.some((r) => r.email === m.user_email && r.slot !== slot)
    );

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-600" />
          Reserves
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 p-3">
          <div>
            <Label className="text-sm font-medium">Pick reserves</Label>
            <p className="text-xs text-gray-500 mt-0.5">Add reserves to this selection</p>
          </div>
          <Switch checked={pickReserves} onCheckedChange={onPickReservesChange} />
        </div>

        {pickReserves && (
          <>
            <RadioGroup value={reservesMode} onValueChange={onReservesModeChange} className="space-y-2">
              <div className="flex items-start gap-2">
                <RadioGroupItem value="squad" id="reserves-squad" />
                <Label htmlFor="reserves-squad" className="font-normal text-sm">Not pick anyone specific - show 'Reserves from squad'</Label>
              </div>
              <div className="flex items-start gap-2">
                <RadioGroupItem value="named" id="reserves-named" />
                <Label htmlFor="reserves-named" className="font-normal text-sm">Select reserves (up to 5)</Label>
              </div>
            </RadioGroup>

            {reservesMode === 'named' && (
              <>
                <div className="space-y-2">
                  {sorted.map((r) => (
                    <div key={r.slot} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <SearchableMemberSelect
                          members={optionsFor(r.slot)}
                          value={r.email || null}
                          onValueChange={(email, member) => onReserveChange(r.slot, email, member)}
                          positionKey={`reserve_${r.slot}`}
                          isAvailableFn={() => true}
                          isUnavailableOnDateFn={isUnavailableOnDate}
                          getMemberName={getMemberName}
                          getMemberNameByEmail={getMemberNameByEmail}
                          placeholder="Select reserve"
                          interestedEmails={interestedEmails}
                        />
                      </div>
                      <RadioGroup
                        value={r.type || 'home'}
                        onValueChange={(v) => onReserveTypeChange(r.slot, v)}
                        className="flex items-center gap-4 shrink-0"
                      >
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="home" id={`res-h-${r.slot}`} className="h-4 w-4" />
                          <Label htmlFor={`res-h-${r.slot}`} className="text-xs font-normal cursor-pointer">Home reserve</Label>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <RadioGroupItem value="away" id={`res-a-${r.slot}`} className="h-4 w-4" />
                          <Label htmlFor={`res-a-${r.slot}`} className="text-xs font-normal cursor-pointer">Away reserve</Label>
                        </div>
                      </RadioGroup>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-gray-400 hover:text-red-500"
                        onClick={() => onReserveRemove(r.slot)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {reserves.length < 5 && (
                  <Button variant="outline" size="sm" onClick={() => onAddReserve(defaultReserveType)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Add reserve
                  </Button>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}