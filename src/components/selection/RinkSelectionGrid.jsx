import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';
import SearchableMemberSelect from '@/components/selection/SearchableMemberSelect';

export default function RinkSelectionGrid({ members, selections, selectedEmails, onSelectionChange, matchDate, unavailabilities = [], playersPerRink = 4, homeRinks = 2, awayRinks = 0 }) {
  const positions = ['Lead', '2', '3', 'Skip', '5', '6'].slice(0, playersPerRink);
  
  const rinks = [];
  for (let i = 1; i <= homeRinks; i++) {
    rinks.push({ number: i, tag: 'Home' });
  }
  for (let i = homeRinks + 1; i <= homeRinks + awayRinks; i++) {
    rinks.push({ number: i, tag: 'Away' });
  }

  const getPositionKey = (rink, position) => `rink${rink}_${position}`;

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

  if (rinks.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          No rinks configured for this match. Adjust Home/Away rinks in Match Details.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {rinks.map(rink => (
        <Card key={rink.number} className="overflow-hidden">
          <CardHeader className="bg-emerald-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Rink {rink.number}
              <Badge variant="outline" className={rink.tag === 'Home' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                {rink.tag}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {positions.map(position => {
              const positionKey = getPositionKey(rink.number, position);
              const selectedMember = selections[positionKey];
              
              return (
                <div key={position} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium text-gray-600 flex-shrink-0">
                    {position}
                  </div>
                  <SearchableMemberSelect
                    members={members}
                    value={selectedMember || null}
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