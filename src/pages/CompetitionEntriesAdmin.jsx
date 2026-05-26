import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Download, Users, ArrowLeft, Loader2, PoundSterling, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const TYPE_LABELS = { singles: 'Singles', pairs: 'Pairs', triples: 'Triples', fours: 'Fours' };
const TYPE_COLORS = {
  singles: 'bg-blue-100 text-blue-800',
  pairs: 'bg-purple-100 text-purple-800',
  triples: 'bg-amber-100 text-amber-800',
  fours: 'bg-emerald-100 text-emerald-800',
};

function downloadExcel(competitions, allEntries, filterCompId) {
  // Build rows for all competitions or a single one
  const compsToExport = filterCompId === 'all'
    ? competitions
    : competitions.filter(c => c.id === filterCompId);

  // Build CSV content (opens fine in Excel)
  const rows = [];
  rows.push(['Competition', 'Format', 'Deadline', 'Price (£)', 'Entry #', 'Lead Entrant', 'Lead Email', 'Team Members', 'Entry Date', 'Amount Owed (£)']);

  compsToExport.forEach(comp => {
    const entries = allEntries.filter(e => e.competition_id === comp.id);
    if (entries.length === 0) {
      rows.push([comp.name, TYPE_LABELS[comp.type] || comp.type, comp.registration_deadline || '', comp.price_per_entry || 0, 'No entries', '', '', '', '', '']);
    } else {
      entries.forEach((entry, i) => {
        const teamStr = (entry.team_members || []).map(m => m.name || m.email).join(', ');
        const entryDate = entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy HH:mm') : '';
        const amountOwed = comp.price_per_entry || 0;
        rows.push([
          comp.name,
          TYPE_LABELS[comp.type] || comp.type,
          comp.registration_deadline ? format(parseISO(comp.registration_deadline), 'dd/MM/yyyy') : '',
          comp.price_per_entry || 0,
          i + 1,
          entry.member_name || entry.user_email,
          entry.user_email,
          teamStr,
          entryDate,
          amountOwed,
        ]);
      });
    }
  });

  const csvContent = rows.map(row =>
    row.map(cell => {
      const val = String(cell ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    }).join(',')
  ).join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `competition-entries-${filterCompId === 'all' ? 'all' : competitions.find(c => c.id === filterCompId)?.name || 'export'}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  toast.success('Excel/CSV downloaded');
}

export default function CompetitionEntriesAdmin() {
  const [searchParams] = useSearchParams();
  const clubId = searchParams.get('clubId');
  const [user, setUser] = useState(null);
  const [filterComp, setFilterComp] = useState('all');
  const [removingEntryId, setRemovingEntryId] = useState(null);
  const queryClient = useQueryClient();

  const removeEntryMutation = useMutation({
    mutationFn: ({ entryId }) => base44.functions.invoke('adminRemoveCompetitionEntry', { clubId, entryId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['compEntries', clubId] });
      toast.success('Entry removed');
      setRemovingEntryId(null);
    },
    onError: () => {
      toast.error('Failed to remove entry');
      setRemovingEntryId(null);
    },
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myMembership } = useQuery({
    queryKey: ['myClubMembership', clubId, user?.email],
    queryFn: async () => {
      const m = await base44.entities.ClubMembership.filter({ club_id: clubId, user_email: user.email });
      return m[0];
    },
    enabled: !!clubId && !!user?.email,
  });

  const { data: club } = useQuery({
    queryKey: ['club', clubId],
    queryFn: async () => {
      const clubs = await base44.entities.Club.filter({ id: clubId });
      return clubs[0];
    },
    enabled: !!clubId,
  });

  const { data: competitions = [], isLoading: compsLoading } = useQuery({
    queryKey: ['compRegs', clubId],
    queryFn: () => base44.entities.CompetitionRegistration.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const { data: allEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['compEntries', clubId],
    queryFn: () => base44.entities.CompetitionEntry.filter({ club_id: clubId }),
    enabled: !!clubId,
  });

  const isAdmin = myMembership?.role === 'admin';
  const isLoading = compsLoading || entriesLoading;

  if (!isLoading && myMembership && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Admin access required.</p>
      </div>
    );
  }

  const filteredComps = filterComp === 'all' ? competitions : competitions.filter(c => c.id === filterComp);

  // Summary stats
  const totalEntries = allEntries.length;
  const totalRevenue = allEntries.reduce((sum, entry) => {
    const comp = competitions.find(c => c.id === entry.competition_id);
    return sum + (comp?.price_per_entry || 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to={createPageUrl('CompetitionRegistration') + `?clubId=${clubId}`}>
            <Button variant="ghost" size="sm" className="gap-1">
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">Competition Entries Admin</h1>
            <p className="text-sm text-gray-500">{club?.name}</p>
          </div>
          <Button
            onClick={() => downloadExcel(competitions, allEntries, filterComp)}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
            disabled={isLoading || competitions.length === 0}
          >
            <Download className="w-4 h-4" />
            Download Excel
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Competitions</p>
              <p className="text-2xl font-bold text-gray-900">{competitions.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Total Entries</p>
              <p className="text-2xl font-bold text-gray-900">{totalEntries}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Total Owed</p>
              <p className="text-2xl font-bold text-emerald-600">£{totalRevenue.toFixed(2)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">Unique Entrants</p>
              <p className="text-2xl font-bold text-gray-900">
                {new Set(allEntries.map(e => e.user_email)).size}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-sm text-gray-600 font-medium">Filter:</span>
          <Select value={filterComp} onValueChange={setFilterComp}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="All competitions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Competitions</SelectItem>
              {competitions.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tables per competition */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredComps.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No competitions found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {filteredComps.map(comp => {
              const entries = allEntries.filter(e => e.competition_id === comp.id);
              const compRevenue = entries.reduce((sum) => sum + (comp.price_per_entry || 0), 0);
              const open = !comp.registration_deadline || new Date() <= new Date(comp.registration_deadline);

              return (
                <Card key={comp.id}>
                  <CardHeader className="pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-base">{comp.name}</CardTitle>
                        <Badge className={TYPE_COLORS[comp.type]}>{TYPE_LABELS[comp.type]}</Badge>
                        <Badge className={open ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}>
                          {open ? 'Open' : 'Closed'}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {comp.registration_deadline && (
                          <span>Deadline: {format(parseISO(comp.registration_deadline), 'd MMM yyyy')}</span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {entries.length} / {comp.max_entries || '∞'}
                        </span>
                        {comp.price_per_entry > 0 && (
                          <span className="flex items-center gap-1 font-medium text-emerald-600">
                            <PoundSterling className="w-3.5 h-3.5" />
                            £{compRevenue.toFixed(2)} owed
                          </span>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {entries.length === 0 ? (
                      <p className="text-sm text-gray-400 italic py-2">No entries yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-gray-500 text-xs uppercase tracking-wide">
                              <th className="pb-2 pr-4">#</th>
                              <th className="pb-2 pr-4">Name</th>
                              <th className="pb-2 pr-4">Email</th>
                              <th className="pb-2 pr-4">Team Members</th>
                              <th className="pb-2 pr-4">Entered</th>
                              {comp.price_per_entry > 0 && <th className="pb-2 pr-4">Amount Owed</th>}
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {entries.map((entry, i) => (
                              <tr key={entry.id} className="hover:bg-gray-50">
                                <td className="py-2 pr-4 text-gray-400">{i + 1}</td>
                                <td className="py-2 pr-4 font-medium text-gray-900">
                                  {entry.member_name || entry.user_email}
                                </td>
                                <td className="py-2 pr-4 text-gray-500">{entry.user_email}</td>
                                <td className="py-2 pr-4 text-gray-500">
                                  {(entry.team_members || []).length > 0
                                    ? (entry.team_members || []).map(m => m.name || m.email).join(', ')
                                    : <span className="text-gray-300">—</span>
                                  }
                                </td>
                                <td className="py-2 pr-4 text-gray-500">
                                  {entry.entry_date ? format(new Date(entry.entry_date), 'dd/MM/yyyy') : '—'}
                                </td>
                                {comp.price_per_entry > 0 && (
                                  <td className="py-2 pr-4 font-medium text-emerald-600">
                                    £{(comp.price_per_entry).toFixed(2)}
                                  </td>
                                )}
                                <td className="py-2">
                                  <button
                                    className="text-red-400 hover:text-red-600 disabled:opacity-40"
                                    disabled={removingEntryId === entry.id}
                                    onClick={() => {
                                      setRemovingEntryId(entry.id);
                                      removeEntryMutation.mutate({ entryId: entry.id });
                                    }}
                                    title="Remove entry"
                                  >
                                    {removingEntryId === entry.id
                                      ? <Loader2 className="w-4 h-4 animate-spin" />
                                      : <Trash2 className="w-4 h-4" />}
                                  </button>
                                </td>
                                </tr>
                            ))}
                          </tbody>
                          {comp.price_per_entry > 0 && (
                            <tfoot>
                              <tr className="border-t">
                                <td colSpan={5} className="pt-2 text-right text-xs text-gray-500 font-medium pr-4">Total:</td>
                                <td className="pt-2 font-bold text-emerald-600">£{compRevenue.toFixed(2)}</td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}