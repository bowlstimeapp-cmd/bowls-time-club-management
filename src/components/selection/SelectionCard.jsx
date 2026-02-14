import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Trophy, Pencil, Eye, CheckCircle, XCircle, ChevronDown, ChevronUp, User } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const competitionColors = {
  'Bramley': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Wessex League': 'bg-blue-100 text-blue-800 border-blue-200',
  'Denny': 'bg-purple-100 text-purple-800 border-purple-200',
  'Top Club': 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function SelectionCard({ 
  selection, 
  isSelector, 
  clubId, 
  myAvailability,
  onSetAvailability,
  isSettingAvailability,
  availabilities = [],
  members = []
}) {
  const [showAvailability, setShowAvailability] = useState(false);

  const countSelected = () => {
    return Object.values(selection.selections || {}).filter(Boolean).length;
  };

  const getMemberName = (email) => {
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const getAvailabilityStatus = (email) => {
    const availability = availabilities.find(a => a.user_email === email);
    return availability?.is_available;
  };

  const availableCount = availabilities.filter(a => a.is_available === true).length;
  const unavailableCount = availabilities.filter(a => a.is_available === false).length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={`border ${competitionColors[selection.competition]}`}>
                    <Trophy className="w-3 h-3 mr-1" />
                    {selection.competition}
                  </Badge>
                  <Badge variant={selection.status === 'published' ? 'default' : 'secondary'}>
                    {selection.status === 'published' ? 'Published' : 'Draft'}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(parseISO(selection.match_date), 'd MMMM yyyy')}
                  </span>
                  {selection.match_name && (
                    <span className="font-medium">{selection.match_name}</span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {countSelected()} players selected
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link to={createPageUrl('SelectionView') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>
                {isSelector && (
                  <Link to={createPageUrl('SelectionEditor') + `?clubId=${clubId}&selectionId=${selection.id}`}>
                    <Button variant="outline" size="sm">
                      <Pencil className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            {/* Availability Section - Only for published selections */}
            {selection.status === 'published' && onSetAvailability && (
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Your Availability:</span>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={myAvailability === true ? "default" : "outline"}
                      className={cn(
                        myAvailability === true && "bg-emerald-600 hover:bg-emerald-700"
                      )}
                      onClick={() => onSetAvailability(true)}
                      disabled={isSettingAvailability}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Available
                    </Button>
                    <Button
                      size="sm"
                      variant={myAvailability === false ? "default" : "outline"}
                      className={cn(
                        myAvailability === false && "bg-red-600 hover:bg-red-700"
                      )}
                      onClick={() => onSetAvailability(false)}
                      disabled={isSettingAvailability}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Unavailable
                    </Button>
                  </div>
                </div>

                {/* Show all members' availability */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAvailability(!showAvailability)}
                  className="w-full justify-between text-gray-600"
                >
                  <span className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="w-4 h-4" /> {availableCount}
                    </span>
                    <span className="flex items-center gap-1 text-red-600">
                      <XCircle className="w-4 h-4" /> {unavailableCount}
                    </span>
                  </span>
                  {showAvailability ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>

                {showAvailability && (
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {members.map(member => {
                      const status = getAvailabilityStatus(member.user_email);
                      return (
                        <div 
                          key={member.id}
                          className="flex items-center gap-2 text-sm p-2 rounded-lg bg-gray-50"
                        >
                          {status === true ? (
                            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                          ) : status === false ? (
                            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border-2 border-gray-300 flex-shrink-0" />
                          )}
                          <span className="truncate">{member.user_name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}