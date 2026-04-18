import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, BarChart3, Settings2, Loader2 } from 'lucide-react';
import { calculateLeagueTable, getScoringRules } from '@/lib/leagueScoring';
import { buildLeagueTableData, printLeagueTable } from '@/lib/leagueTableTemplates';
import LeagueTableTemplateSettings from './LeagueTableTemplateSettings';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function LeagueTableDialog({ open, onOpenChange, league, teams, fixtures, club, clubId }) {
  const [activeTab, setActiveTab] = useState('table');
  const [isPrinting, setIsPrinting] = useState(false);
  const [pendingSettings, setPendingSettings] = useState(null);
  const queryClient = useQueryClient();

  const updateClubMutation = useMutation({
    mutationFn: (data) => base44.entities.Club.update(clubId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['club', clubId] });
      toast.success('Print settings saved');
    },
  });

  if (!league) return null;

  const leagueTeams = teams.filter(t => t.league_id === league.id);
  const leagueFixtures = fixtures.filter(f => f.league_id === league.id);
  const table = calculateLeagueTable(league, leagueTeams, leagueFixtures);
  const scoringRules = getScoringRules(league);

  // Merge pending settings into effective club for printing
  const effectiveClub = pendingSettings ? { ...club, ...pendingSettings } : club;

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      // Save settings first if there are pending changes
      if (pendingSettings) {
        await base44.entities.Club.update(clubId, pendingSettings);
        queryClient.invalidateQueries({ queryKey: ['club', clubId] });
        setPendingSettings(null);
      }
      const data = buildLeagueTableData({ league, club: effectiveClub, tableEntries: table });
      await printLeagueTable(data, effectiveClub);
    } catch (e) {
      toast.error('Failed to generate print preview');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleSettingsChange = (settings) => {
    setPendingSettings(settings);
  };

  const handleSaveSettings = () => {
    if (pendingSettings) {
      updateClubMutation.mutate(pendingSettings);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap pr-6">
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-600" />
              {league.name} — League Table
            </DialogTitle>
            <Button
              size="sm"
              onClick={handlePrint}
              disabled={isPrinting}
              className="bg-emerald-600 hover:bg-emerald-700 shrink-0"
            >
              {isPrinting ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Printer className="w-4 h-4 mr-1.5" />
              )}
              Print Table
            </Button>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="table" className="flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-1.5">
              <Settings2 className="w-4 h-4" />
              Print Settings
            </TabsTrigger>
          </TabsList>

          {/* ── Table Tab ── */}
          <TabsContent value="table">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 bg-gray-50 text-center">Pos</th>
                    <th className="border p-2 bg-gray-50 text-left">Team</th>
                    <th className="border p-2 bg-gray-50 text-center">P</th>
                    <th className="border p-2 bg-gray-50 text-center">W</th>
                    <th className="border p-2 bg-gray-50 text-center">D</th>
                    <th className="border p-2 bg-gray-50 text-center">L</th>
                    <th className="border p-2 bg-gray-50 text-center">PF</th>
                    <th className="border p-2 bg-gray-50 text-center">PA</th>
                    <th className="border p-2 bg-gray-50 text-center">+/-</th>
                    <th className="border p-2 bg-gray-50 text-center">Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((entry, idx) => (
                    <tr key={entry.team.id} className={idx % 2 === 1 ? 'bg-gray-50' : ''}>
                      <td className="border p-2 text-center font-medium">{idx + 1}</td>
                      <td className="border p-2 font-medium">{entry.team.name}</td>
                      <td className="border p-2 text-center">{entry.played}</td>
                      <td className="border p-2 text-center">{entry.won}</td>
                      <td className="border p-2 text-center">{entry.drawn}</td>
                      <td className="border p-2 text-center">{entry.lost}</td>
                      <td className="border p-2 text-center">{entry.pointsFor}</td>
                      <td className="border p-2 text-center">{entry.pointsAgainst}</td>
                      <td className="border p-2 text-center">{entry.pointsDiff > 0 ? '+' : ''}{entry.pointsDiff}</td>
                      <td className="border p-2 text-center font-bold">{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {scoringRules.length > 0 && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg border text-sm text-gray-600">
                <p className="font-semibold text-gray-700 mb-1">Scoring Rules:</p>
                <ul className="space-y-0.5">
                  {scoringRules.map((rule, i) => <li key={i}>• {rule}</li>)}
                </ul>
              </div>
            )}
          </TabsContent>

          {/* ── Print Settings Tab ── */}
          <TabsContent value="settings">
            <LeagueTableTemplateSettings
              club={effectiveClub}
              league={league}
              onChange={handleSettingsChange}
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button
                variant="outline"
                onClick={handleSaveSettings}
                disabled={!pendingSettings || updateClubMutation.isPending}
              >
                {updateClubMutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                Save Settings
              </Button>
              <Button
                onClick={handlePrint}
                disabled={isPrinting}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isPrinting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Printer className="w-4 h-4 mr-1.5" />}
                Print Table
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}