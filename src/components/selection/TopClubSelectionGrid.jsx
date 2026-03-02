import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import SearchableMemberSelect from '@/components/selection/SearchableMemberSelect';

const TOP_CLUB_EVENTS = [
  { id: 'mens_two_wood', name: "Men's Two Wood", positions: ['Player'] },
  { id: 'ladies_two_wood', name: "Ladies Two Wood", positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triple', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

export default function TopClubSelectionGrid({ members, selections, selectedEmails, onSelectionChange, matchDate, unavailabilities = [] }) {
  const getPositionKey = (eventId, position) => `${eventId}_${position}`;
  const getMemberName = (member) => member?.user_name || member?.user_email || 'Unknown';
  const getMemberNameByEmail = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isAvailable = (memberEmail, currentPosition) => {
    const currentValue = selections[currentPosition];
    if (currentValue === memberEmail) return true;
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
    <div className="space-y-4">
      {TOP_CLUB_EVENTS.map(event => (
        <Card key={event.id} className="overflow-hidden">
          <CardHeader className="bg-indigo-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-600" />
              {event.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {event.positions.map(position => {
                const positionKey = getPositionKey(event.id, position);
                const selectedMember = selections[positionKey];
                return (
                  <div key={position} className="space-y-1">
                    <div className="text-sm font-medium text-gray-600">{position}</div>
                    <SearchableMemberSelect
                      members={members}
                      value={selectedMember || null}
                      onValueChange={(email) => onSelectionChange(positionKey, email)}
                      positionKey={positionKey}
                      isAvailableFn={isAvailable}
                      isUnavailableOnDateFn={isUnavailableOnDate}
                      getMemberName={getMemberName}
                      getMemberNameByEmail={getMemberNameByEmail}
                      placeholder="Select"
                    />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}