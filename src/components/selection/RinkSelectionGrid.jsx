import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users } from 'lucide-react';

const POSITIONS = ['Lead', '2', '3', 'Skip'];
const RINKS = [1, 2, 3, 4];

export default function RinkSelectionGrid({ members, selections, selectedEmails, onSelectionChange }) {
  const getPositionKey = (rink, position) => `rink${rink}_${position}`;

  const getMemberName = (member) => {
    return member?.user_name || member?.user_email || 'Unknown';
  };

  const getMemberNameByEmail = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isAvailable = (memberEmail, currentPosition) => {
    // Available if not selected elsewhere in this selection
    const currentValue = selections[currentPosition];
    if (currentValue === memberEmail) return true;
    return !selectedEmails.includes(memberEmail);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {RINKS.map(rink => (
        <Card key={rink} className="overflow-hidden">
          <CardHeader className="bg-emerald-50 py-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Rink {rink}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {POSITIONS.map(position => {
              const positionKey = getPositionKey(rink, position);
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
                        return (
                          <SelectItem 
                            key={member.id} 
                            value={member.user_email}
                            disabled={!available}
                            className={!available ? 'opacity-50' : ''}
                          >
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
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