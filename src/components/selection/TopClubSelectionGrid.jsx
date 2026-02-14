import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Trophy } from 'lucide-react';
import { parseISO, isWithinInterval } from 'date-fns';

const TOP_CLUB_EVENTS = [
  { 
    id: 'mens_two_wood', 
    name: "Men's Two Wood", 
    positions: ['Player'] 
  },
  { 
    id: 'ladies_two_wood', 
    name: "Ladies Two Wood", 
    positions: ['Player'] 
  },
  { 
    id: 'pairs', 
    name: 'Pairs', 
    positions: ['Lead', 'Skip'] 
  },
  { 
    id: 'triple', 
    name: 'Triple', 
    positions: ['Lead', '2', 'Skip'] 
  },
  { 
    id: 'fours', 
    name: 'Fours', 
    positions: ['Lead', '2', '3', 'Skip'] 
  },
];

export default function TopClubSelectionGrid({ members, selections, selectedEmails, onSelectionChange, matchDate, unavailabilities = [] }) {
  const getPositionKey = (eventId, position) => `${eventId}_${position}`;

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
                    <div className="text-sm font-medium text-gray-600">
                      {position}
                    </div>
                    <Select
                      value={selectedMember || ''}
                      onValueChange={(value) => onSelectionChange(positionKey, value || null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select">
                          {selectedMember ? getMemberNameByEmail(selectedMember) : 'Select'}
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
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}