import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import SearchableMemberSelect from '@/components/selection/SearchableMemberSelect';

// Fixed rink definitions for Fantastic 5s
const FANTASTIC5S_RINKS = [
  { number: 1, label: 'Singles',  positions: ['Player'] },
  { number: 2, label: 'Fours',    positions: ['Lead', '2', '3', 'Skip'] },
  { number: 3, label: 'Pairs',    positions: ['Lead', 'Skip'] },
  { number: 4, label: 'Triples',  positions: ['Lead', '2', 'Skip'] },
];

export default function Fantastic5sSelectionGrid({ members, selections, selectedEmails, onSelectionChange, matchDate, unavailabilities = [] }) {
  const getPositionKey = (rinkNum, position) => `rink${rinkNum}_${position}`;

  const getMemberName = (member) => member?.user_name || member?.user_email || 'Unknown';
  const getMemberNameByEmail = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isAvailable = (memberEmail, currentPosition) => {
    if (selections[currentPosition] === memberEmail) return true;
    return !selectedEmails.includes(memberEmail);
  };

  const isUnavailableOnDate = (memberEmail) => {
    if (!matchDate) return false;
    const date = typeof matchDate === 'string' ? parseISO(matchDate) : matchDate;
    return unavailabilities.some(u =>
      u.user_email === memberEmail &&
      isWithinInterval(date, { start: parseISO(u.start_date), end: parseISO(u.end_date) })
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {FANTASTIC5S_RINKS.map(rink => (
        <Card key={rink.number} className="overflow-hidden">
          <CardHeader className="bg-emerald-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Rink {rink.number}
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                {rink.label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {rink.positions.map(position => {
              const positionKey = getPositionKey(rink.number, position);
              return (
                <div key={position} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium text-gray-600 flex-shrink-0">
                    {position}
                  </div>
                  <SearchableMemberSelect
                    members={members}
                    value={selections[positionKey] || null}
                    onValueChange={(email) => onSelectionChange(positionKey, email)}
                    positionKey={positionKey}
                    isAvailableFn={isAvailable}
                    isUnavailableOnDateFn={isUnavailableOnDate}
                    getMemberName={getMemberName}
                    getMemberNameByEmail={getMemberNameByEmail}
                    placeholder="Select member"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}