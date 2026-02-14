import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Trophy, User, Users, CheckCircle, XCircle, Home, Plane } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const RINK_POSITIONS = ['Lead', '2', '3', 'Skip'];
const RINKS = [
  { number: 1, tag: 'Home' },
  { number: 2, tag: 'Home' },
  { number: 3, tag: 'Away' },
  { number: 4, tag: 'Away' },
];

const TOP_CLUB_EVENTS = [
  { id: 'mens_two_wood', name: "Men's Two Wood", positions: ['Player'] },
  { id: 'ladies_two_wood', name: "Ladies Two Wood", positions: ['Player'] },
  { id: 'pairs', name: 'Pairs', positions: ['Lead', 'Skip'] },
  { id: 'triple', name: 'Triple', positions: ['Lead', '2', 'Skip'] },
  { id: 'fours', name: 'Fours', positions: ['Lead', '2', '3', 'Skip'] },
];

const competitionColors = {
  'Bramley': 'bg-emerald-100 text-emerald-800 border-emerald-200',
  'Wessex League': 'bg-blue-100 text-blue-800 border-blue-200',
  'Denny': 'bg-purple-100 text-purple-800 border-purple-200',
  'Top Club': 'bg-amber-100 text-amber-800 border-amber-200',
};

export default function SelectionView() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const selectionId = searchParams.get('selectionId');
  const navigate = useNavigate();

  useEffect(() => {
    if (!clubId || !selectionId) {
      navigate(createPageUrl('ClubSelector'));
    }
  }, [clubId, selectionId, navigate]);

  const { data: selection, isLoading } = useQuery({
    queryKey: ['selection', selectionId],
    queryFn: async () => {
      const selections = await base44.entities.TeamSelection.filter({ id: selectionId });
      return selections[0];
    },
    enabled: !!selectionId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['clubMembers', clubId],
    queryFn: () => base44.entities.ClubMembership.filter({ 
      club_id: clubId, 
      status: 'approved' 
    }),
    enabled: !!clubId,
  });

  const { data: availabilities = [] } = useQuery({
    queryKey: ['selectionAvailabilities', selectionId],
    queryFn: () => base44.entities.MemberAvailability.filter({ selection_id: selectionId }),
    enabled: !!selectionId,
  });

  const getMemberName = (email) => {
    if (!email) return 'TBD';
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const getAvailability = (email) => {
    if (!email) return null;
    const availability = availabilities.find(a => a.user_email === email);
    return availability?.is_available;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50 p-8">
        <Skeleton className="h-12 w-64 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!selection) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Selection not found</p>
      </div>
    );
  }

  const isTopClub = selection.competition === 'Top Club';
  const selections = selection.selections || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link 
            to={createPageUrl('Selection') + `?clubId=${clubId}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Selections
          </Link>
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge className={`border text-base px-3 py-1 ${competitionColors[selection.competition]}`}>
                  <Trophy className="w-4 h-4 mr-2" />
                  {selection.competition}
                </Badge>
                {selection.status === 'draft' && (
                  <Badge variant="secondary">Draft</Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                {selection.match_name || 'Team Selection'}
              </h1>
              <p className="text-gray-600 flex items-center gap-2 mt-1">
                <Calendar className="w-4 h-4" />
                {format(parseISO(selection.match_date), 'EEEE, d MMMM yyyy')}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {isTopClub ? (
            <div className="space-y-4">
              {TOP_CLUB_EVENTS.map(event => (
                <Card key={event.id}>
                  <CardHeader className="bg-indigo-50 py-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-indigo-600" />
                      {event.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="flex flex-wrap gap-4">
                      {event.positions.map(position => {
                        const positionKey = `${event.id}_${position}`;
                        const memberEmail = selections[positionKey];
                        return (
                          <div key={position} className="flex items-center gap-2 bg-gray-50 rounded-lg px-4 py-2">
                            <span className="text-sm font-medium text-gray-500">{position}:</span>
                            <span className="font-medium flex items-center gap-1">
                              {getAvailability(memberEmail) === true ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : getAvailability(memberEmail) === false ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                              {getMemberName(memberEmail)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {RINKS.map(rink => (
                <Card key={rink.number}>
                  <CardHeader className="bg-emerald-50 py-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Users className="w-5 h-5 text-emerald-600" />
                      Rink {rink.number}
                      <Badge variant="outline" className={rink.tag === 'Home' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                        {rink.tag}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="space-y-2">
                      {RINK_POSITIONS.map(position => {
                        const positionKey = `rink${rink.number}_${position}`;
                        const memberEmail = selections[positionKey];
                        return (
                        <div key={position} className="flex items-center justify-between py-2 border-b last:border-0">
                            <span className="text-sm font-medium text-gray-500 w-12">{position}</span>
                            <span className="font-medium flex items-center gap-2">
                              {getAvailability(memberEmail) === true ? (
                                <CheckCircle className="w-4 h-4 text-emerald-600" />
                              ) : getAvailability(memberEmail) === false ? (
                                <XCircle className="w-4 h-4 text-red-500" />
                              ) : (
                                <User className="w-4 h-4 text-gray-400" />
                              )}
                              {getMemberName(memberEmail)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}