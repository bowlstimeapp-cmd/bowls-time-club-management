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

export default function TopClubSelectionGrid({ members, selections, selectedEmails, onSelectionChange }) {
  const getPositionKey = (eventId, position) => `${eventId}_${position}`;

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isAvailable = (memberEmail, currentPosition) => {
    const currentValue = selections[currentPosition];
    if (currentValue === memberEmail) return true;
    return !selectedEmails.includes(memberEmail);
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
                          {selectedMember ? getMemberName(selectedMember) : 'Select'}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={null}>-- Clear --</SelectItem>
                        {members.map(member => {
                          const available = isAvailable(member.user_email, positionKey);
                          return (
                            <SelectItem 
                              key={member.id} 
                              value={member.user_email}
                              disabled={!available}
                              className={!available ? 'opacity-50' : ''}
                            >
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                {member.user_name}
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