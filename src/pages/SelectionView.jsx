import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Calendar, Trophy, User, Users, CheckCircle, XCircle, Home, Plane, Printer } from 'lucide-react';
import PlayerAccoladeHover from '@/components/accolades/PlayerAccoladeHover';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
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
  const printRef = React.useRef();
  const [user, setUser] = React.useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

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

  const { data: availabilities = [], refetch: refetchAvailabilities } = useQuery({
    queryKey: ['selectionAvailabilities', selectionId],
    queryFn: () => base44.entities.MemberAvailability.filter({ selection_id: selectionId }),
    enabled: !!selectionId,
  });

  const availabilityMutation = useMutation({
    mutationFn: async (isAvailable) => {
      const existing = availabilities.find(a => a.user_email === user?.email);
      if (existing) {
        return base44.entities.MemberAvailability.update(existing.id, { is_available: isAvailable });
      } else {
        return base44.entities.MemberAvailability.create({
          club_id: clubId,
          selection_id: selectionId,
          user_email: user.email,
          is_available: isAvailable,
        });
      }
    },
    onSuccess: (_, isAvailable) => {
      queryClient.invalidateQueries({ queryKey: ['selectionAvailabilities', selectionId] });
      toast.success(isAvailable ? 'Marked as available' : 'Marked as unavailable');
    },
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: allCompetitions = [] } = useQuery({
    queryKey: ['allCompetitions', clubId],
    queryFn: async () => {
      const [clubComps, platformComps] = await Promise.all([
        base44.entities.Competition.filter({ club_id: clubId }),
        base44.entities.Competition.list().then(all => all.filter(c => !c.club_id)),
      ]);
      return [...clubComps, ...platformComps];
    },
    enabled: !!clubId,
  });

  const { data: accoladeList = [] } = useQuery({
    queryKey: ['clubAccolades', clubId],
    queryFn: () => base44.entities.ClubAccolade.filter({ club_id: clubId }),
    enabled: !!clubId && !!club?.module_accolades,
  });

  const { data: accoladeAssignments = [] } = useQuery({
    queryKey: ['clubAccoladeAssignments', clubId],
    queryFn: () => base44.entities.ClubAccoladeAssignment.filter({ club_id: clubId }),
    enabled: !!clubId && !!club?.module_accolades,
  });

  const handlePrint = () => {
    if (!selection) return;

    const sel = selection.selections || {};
    const isTC = selection.competition === 'Top Club';
    const activeComp = allCompetitions.find(c => c.name === selection?.competition);
    const homeRinks = activeComp ? activeComp.home_rinks : (selection?.home_rinks || 2);
    const awayRinks = isTC ? 0 : (activeComp ? (activeComp.away_rinks || 0) : 0);
    const ppr = activeComp?.players_per_rink || 4;
    const positions = ['Lead', '2', '3', 'Skip', '5', '6'].slice(0, ppr);
    const rinks = [
      ...Array.from({ length: homeRinks }, (_, i) => ({ number: i + 1, tag: 'Home' })),
      ...Array.from({ length: awayRinks }, (_, i) => ({ number: homeRinks + i + 1, tag: 'Away' })),
    ];

    const avail = (email) => {
      if (!email) return '';
      const a = availabilities.find(x => x.user_email === email);
      if (a?.is_available === true) return ' <span style="color:#16a34a;font-size:11px;">✓ Available</span>';
      if (a?.is_available === false) return ' <span style="color:#dc2626;font-size:11px;">✗ Unavailable</span>';
      return '';
    };

    const captainBadge = (email) =>
      isCaptain(email) ? ' <span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#fef3c7;color:#b45309;font-size:10px;font-weight:bold;margin-left:4px;">C</span>' : '';

    let bodyHtml = '';

    if (isTC) {
      bodyHtml = TOP_CLUB_EVENTS.map(event => `
        <div class="card">
          <div class="card-header indigo-header">
            <span class="card-title">&#127942; ${event.name}</span>
          </div>
          <div class="card-body">
            <div class="player-chips">
              ${event.positions.map(pos => {
                const email = sel[`${event.id}_${pos}`];
                return `<div class="chip"><span class="pos-label">${pos}:</span> <span class="player-name">${getMemberName(email)}${avail(email)}${captainBadge(email)}</span></div>`;
              }).join('')}
            </div>
          </div>
        </div>
      `).join('');
    } else {
      const cards = rinks.map(rink => {
        const isHome = rink.tag === 'Home';
        const tagStyle = isHome
          ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;'
          : 'background:#fff7ed;color:#c2410c;border:1px solid #fed7aa;';
        const rows = positions.map(pos => {
          const email = sel[`rink${rink.number}_${pos}`];
          return `
            <div class="position-row">
              <span class="pos-label">${pos}</span>
              <span class="player-name">${getMemberName(email)}${avail(email)}${captainBadge(email)}</span>
            </div>`;
        }).join('');
        return `
          <div class="card">
            <div class="card-header green-header">
              <span class="card-title">&#128101; Rink ${rink.number}</span>
              <span class="rink-tag" style="${tagStyle}">${rink.tag}</span>
            </div>
            <div class="card-body">${rows}</div>
          </div>`;
      });

      // two-column grid
      bodyHtml = `<div class="rink-grid">${cards.join('')}</div>`;
    }

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${selection.competition} - ${selection.match_name || 'Team Selection'}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; font-size: 13px; }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { max-height: 72px; margin-bottom: 10px; }
            .club-name { font-size: 18px; font-weight: bold; margin-bottom: 4px; }
            .match-title { font-size: 15px; font-weight: 600; margin-bottom: 2px; }
            .match-date { font-size: 13px; color: #555; }
            .comp-badge { display: inline-block; font-size: 12px; font-weight: 600; border-radius: 4px; padding: 2px 10px; margin-bottom: 8px; border: 1px solid #ccc; }
            .rink-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
            .card { border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; break-inside: avoid; }
            .card-header { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between; }
            .green-header { background: #ecfdf5; border-bottom: 1px solid #d1fae5; }
            .indigo-header { background: #eef2ff; border-bottom: 1px solid #c7d2fe; }
            .card-title { font-weight: 700; font-size: 14px; }
            .rink-tag { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
            .card-body { padding: 10px 14px; }
            .position-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
            .position-row:last-child { border-bottom: none; }
            .pos-label { color: #6b7280; font-size: 12px; font-weight: 500; min-width: 36px; }
            .player-name { font-weight: 500; }
            .player-chips { display: flex; flex-wrap: wrap; gap: 8px; }
            .chip { background: #f9fafb; border-radius: 6px; padding: 5px 10px; font-size: 12px; display: flex; align-items: center; gap: 4px; }
          </style>
        </head>
        <body>
          <div class="header">
            ${club?.logo_url ? `<img src="${club.logo_url}" class="logo" alt="${club?.name}" />` : ''}
            <div class="club-name">${club?.name || ''}</div>
            <div class="comp-badge">${selection.competition}</div>
            <div class="match-title">${selection.match_name || 'Team Selection'}</div>
            <div class="match-date">${format(parseISO(selection.match_date), 'EEEE, d MMMM yyyy')}</div>
          </div>
          ${bodyHtml}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getMemberName = (email) => {
    if (!email) return 'TBD';
    const member = members.find(m => m.user_email === email);
    return member?.user_name || email;
  };

  const isCaptain = (email) => {
    if (!email || !selection) return false;
    return email === selection.home_captain_email || email === selection.away_captain_email;
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

  const activeComp = allCompetitions.find(c => c.name === selection?.competition);
  // Use competition entity as source of truth when available, fall back to selection fields
  const homeRinksCount = activeComp ? activeComp.home_rinks : (selection?.home_rinks || 2);
  const awayRinksCount = isTopClub ? 0 : (activeComp ? (activeComp.away_rinks || 0) : 0);
  const playersPerRink = activeComp?.players_per_rink || 4;
  const dynamicRinks = [
    ...Array.from({ length: homeRinksCount }, (_, i) => ({ number: i + 1, tag: 'Home' })),
    ...Array.from({ length: awayRinksCount }, (_, i) => ({ number: homeRinksCount + i + 1, tag: 'Away' })),
  ];
  const rinkPositions = ['Lead', '2', '3', 'Skip', '5', '6'].slice(0, playersPerRink);

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
            <div className="flex items-center gap-2">
              {(() => {
                const allEmails = Object.values(selection.selections || {}).filter(Boolean);
                const isSelected = user && allEmails.includes(user.email);
                if (!isSelected) return null;
                const myAvailability = availabilities.find(a => a.user_email === user.email);
                const isPending = availabilityMutation.isPending;
                return (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={myAvailability?.is_available === true ? 'default' : 'outline'}
                      className={myAvailability?.is_available === true ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
                      disabled={isPending}
                      onClick={() => availabilityMutation.mutate(true)}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Available
                    </Button>
                    <Button
                      size="sm"
                      variant={myAvailability?.is_available === false ? 'destructive' : 'outline'}
                      disabled={isPending}
                      onClick={() => availabilityMutation.mutate(false)}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Unavailable
                    </Button>
                  </div>
                );
              })()}
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div ref={printRef} className="print-content">
            <div className="header hidden print:block text-center mb-4">
              {club?.logo_url && (
                <img src={club.logo_url} alt={club.name} className="logo mx-auto max-h-20 mb-2" />
              )}
              <h1 className="text-xl font-bold">{club?.name}</h1>
              <h2 className="text-lg">{selection.competition} - {selection.match_name || 'Team Selection'}</h2>
              <p>{format(parseISO(selection.match_date), 'EEEE, d MMMM yyyy')}</p>
            </div>
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
              {dynamicRinks.map(rink => (
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
                      {rinkPositions.map(position => {
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
                              <PlayerAccoladeHover email={memberEmail} accolades={accoladeList} assignments={accoladeAssignments}>
                                  {getMemberName(memberEmail)}
                                </PlayerAccoladeHover>
                                  {isCaptain(memberEmail) && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold" title="Captain">C</span>
                              )}
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
          </div>
        </motion.div>
      </div>
    </div>
  );
}