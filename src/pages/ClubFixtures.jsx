import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, CalendarDays, Plus, Pencil, Trash2, Calendar, ClipboardList, Star } from 'lucide-react';
import { toast } from 'sonner';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { createPageUrl } from '@/utils';
import FixtureFormModal from '@/components/fixtures/FixtureFormModal';
import BookRinksModal from '@/components/fixtures/BookRinksModal';
import FixtureInterestButton from '@/components/fixtures/FixtureInterestButton';
import useFixtureInterests from '@/hooks/useFixtureInterests';
import useClubCompetitions from '@/hooks/useClubCompetitions';

export default function ClubFixtures() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingFixture, setEditingFixture] = useState(null);
  const [showBookRinksModal, setShowBookRinksModal] = useState(false);
  const [bookRinksFixture, setBookRinksFixture] = useState(null);

  useEffect(() => { base44.auth.me().then(setUser).catch(() => {}); }, []);

  const { data: membership } = useQuery({
    queryKey: ['myMembership', clubId, user?.email],
    queryFn: async () => { const m = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email }); return m[0]; },
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => { const c = await base44.entities.Club.filter({ id: clubId }); return c[0]; },
    enabled: !!clubId,
  });

  const { data: fixtures = [], isLoading: fixturesLoading } = useQuery({
    queryKey: ['clubFixtures', clubId],
    queryFn: async () => base44.entities.ClubFixture.filter({ club_id: clubId }, 'date', 200),
    enabled: !!clubId,
  });

  const { clubCompetitions: competitions, platformCompetitions } = useClubCompetitions(clubId);

  const allCompetitions = useMemo(() => [...competitions, ...platformCompetitions], [competitions, platformCompetitions]);

  // Team selections already linked to a fixture (so the button can open instead of create)
  const { data: selections = [] } = useQuery({
    queryKey: ['clubSelectionsForFixtures', clubId],
    queryFn: () => base44.entities.TeamSelection.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const isClubAdmin = membership?.role === 'admin' && membership?.status === 'approved';
  const isSelector = membership?.role === 'selector' || isClubAdmin;
  const competitionMap = useMemo(() => { const map = {}; allCompetitions.forEach(c => { map[c.id] = c; }); return map; }, [allCompetitions]);

  const { interests, canSeeAll, toggle } = useFixtureInterests(clubId);

  const interestsByFixture = useMemo(() => {
    const map = {};
    interests.forEach(i => { (map[i.fixture_id] = map[i.fixture_id] || []).push(i); });
    return map;
  }, [interests]);

  const selectionByFixture = useMemo(() => {
    const map = {};
    selections.forEach(s => { if (s.fixture_id && !map[s.fixture_id]) map[s.fixture_id] = s; });
    return map;
  }, [selections]);

  const today = format(new Date(), 'yyyy-MM-dd');

  const openSelection = (fixture) => {
    const linked = selectionByFixture[fixture.id];
    const query = linked
      ? `?clubId=${clubId}&selectionId=${linked.id}`
      : `?clubId=${clubId}&fixtureId=${fixture.id}`;
    navigate(createPageUrl('SelectionEditor') + query);
  };

  const handleDelete = async (fixture) => {
    if (!window.confirm('Delete this fixture? Linked selections and bookings will NOT be deleted.')) return;
    try {
      const res = await base44.functions.invoke('deleteFixture', { fixtureId: fixture.id, club_id: clubId });
      if (res.data.success) { toast.success('Fixture deleted'); queryClient.invalidateQueries(['clubFixtures', clubId]); }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete fixture');
    }
  };

  if (!user) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fixtures</h1>
          <p className="text-sm text-gray-500 mt-1">Club fixture list with rink booking and auto-draft selection</p>
        </div>
        {isClubAdmin && (
          <Button onClick={() => { setEditingFixture(null); setShowFormModal(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Fixture
          </Button>
        )}
      </div>

      {fixturesLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
      ) : fixtures.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <CalendarDays className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p>No fixtures yet{isClubAdmin ? '. Click "Add Fixture" to create one.' : '.'}</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-white overflow-x-auto">
          <table className="w-full min-w-[760px]">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Match type</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Opponent</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Date</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Venue</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Interested</th>
                <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Notes</th>
                {isClubAdmin && <th className="text-right px-4 py-3 text-sm font-semibold text-gray-600">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {fixtures.map(fixture => {
                const comp = competitionMap[fixture.competition_id];
                const rowInterests = interestsByFixture[fixture.id] || [];
                const iAmInterested = rowInterests.some(i => i.user_email === user.email);
                const isPast = fixture.date < today;
                const linkedSelection = selectionByFixture[fixture.id];
                return (
                  <tr key={fixture.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{comp?.name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{fixture.opponent || '—'}</td>
                    <td className="px-4 py-3 text-sm">{format(parseISO(fixture.date), 'EEE d MMM yyyy')}</td>
                    <td className="px-4 py-3 text-sm">{fixture.time}{fixture.finish_time ? ` – ${fixture.finish_time}` : ''}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                        fixture.venue === 'Home' ? 'bg-emerald-100 text-emerald-700' :
                        fixture.venue === 'Away' ? 'bg-blue-100 text-blue-700' :
                        'bg-purple-100 text-purple-700'
                      }`}>{fixture.venue}</span>
                    </td>
                    <td className="px-4 py-3 text-sm align-top">
                      {canSeeAll ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                            {rowInterests.length}
                          </div>
                          {rowInterests.length > 0 && (
                            <p className="text-xs text-gray-500 max-w-[14rem]">
                              {rowInterests.slice(0, 3).map(i => i.member_name).join(', ')}
                              {rowInterests.length > 3 ? ` +${rowInterests.length - 3} more` : ''}
                            </p>
                          )}
                        </div>
                      ) : (
                        <FixtureInterestButton
                          interested={iAmInterested}
                          onToggle={() => toggle(fixture.id)}
                          disabled={isPast}
                        />
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{fixture.notes || '—'}</td>
                    {(isClubAdmin || isSelector) && (
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <Button size="sm" variant="outline" className="mr-1" onClick={() => openSelection(fixture)}>
                          <ClipboardList className="w-3 h-3 mr-1" />
                          {linkedSelection ? 'Selection' : 'Pick Team'}
                        </Button>
                        {isClubAdmin && fixture.venue !== 'Away' && (
                          <Button size="sm" variant="outline" className="mr-1" onClick={() => { setBookRinksFixture(fixture); setShowBookRinksModal(true); }}>
                            <Calendar className="w-3 h-3 mr-1" /> Book Rinks
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" className="mr-1" onClick={() => { setEditingFixture(fixture); setShowFormModal(true); }}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(fixture)}>
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <FixtureFormModal
        open={showFormModal}
        onClose={() => setShowFormModal(false)}
        fixture={editingFixture}
        competitions={allCompetitions}
        clubId={clubId}
        onSaved={() => queryClient.invalidateQueries(['clubFixtures', clubId])}
      />
      <BookRinksModal
        open={showBookRinksModal}
        onClose={() => setShowBookRinksModal(false)}
        fixture={bookRinksFixture}
        competition={bookRinksFixture ? competitionMap[bookRinksFixture.competition_id] : null}
        club={club}
        onBooked={() => {}}
      />
    </div>
  );
}