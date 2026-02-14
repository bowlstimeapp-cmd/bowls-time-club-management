import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { User, Users } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';

const POSITIONS = ['Lead', '2', '3', 'Skip'];
const RINKS = [
  { number: 1, tag: 'Home' },
  { number: 2, tag: 'Home' },
  { number: 3, tag: 'Away' },
  { number: 4, tag: 'Away' },
];

export default function RinkSelectionGrid({ members, selections, selectedEmails, onSelectionChange, matchDate, unavailabilities = [] }) {
  const getPositionKey = (rink, position) => `rink${rink}_${position}`;

  const getMemberName = (member) => {
    return member?.user_name || member?.user_email || 'Unknown';
  };

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
      isWithinInterval(date, {
        start: parseISO(u.start_date),
        end: parseISO(u.end_date)
      })
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {RINKS.map(rink => (
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
            {POSITIONS.map(position => {
              const positionKey = getPositionKey(rink.number, position);
              const selectedMember = selections[positionKey];
              
              return (
                <div key={position} className="flex items-center gap-3">
                  <div className="w-16 text-sm font-medium text-gray-600">
                    {position}
                  </div>
                  <Select
                    value={selectedMember || ''}
                    onValueChange={(value) => onSelectionChange(positionKey, value || null)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select member">
                        {selectedMember ? getMemberNameByEmail(selectedMember) : 'Select member'}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>-- Clear --</SelectItem>
                      {members.map(member => {
                        const available = isAvailable(member.user_email, positionKey);
                        const unavailableDate = isUnavailableOnDate(member.user_email);
                        return (
                          <SelectItem 
                            key={member.id} 
                            value={member.user_email}
                            disabled={!available}
                            className={!available ? 'opacity-50' : ''}
                          >
                            <div className="flex items-center gap-2">
                              {unavailableDate ? (
                                <span className="text-red-600 font-bold text-xs">NA</span>
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                              {getMemberName(member)}
                              {!available && ' (selected)'}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}