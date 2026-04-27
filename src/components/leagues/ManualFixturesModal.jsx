import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Upload, Download, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const EMPTY_ROW = { home_team_id: '', away_team_id: '', match_date: '', rink_number: '', _id: null };

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

export default function ManualFixturesModal({ open, onClose, league, teams, clubId, existingFixtures = [], rinkCount = 6 }) {
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);

  // Initialise rows from existingFixtures each time modal opens
  React.useEffect(() => {
    if (open) {
      if (existingFixtures.length > 0) {
        setRows(existingFixtures
          .filter(f => f.league_id === league?.id)
          .sort((a, b) => a.match_date.localeCompare(b.match_date))
          .map(f => ({
            home_team_id: f.home_team_id,
            away_team_id: f.away_team_id,
            match_date: f.match_date,
            rink_number: f.rink_number?.toString() || '',
            _id: f.id,
          }))
        );
      } else {
        setRows([{ ...EMPTY_ROW }]);
      }
    }
  }, [open, league?.id, existingFixtures]);

  const addRow = () => setRows(prev => [...prev, { ...EMPTY_ROW }]);

  const updateRow = (idx, field, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r));
  };

  const removeRow = (idx) => {
    setRows(prev => prev.filter((_, i) => i !== idx));
  };

  // Validation
  const getDuplicates = () => {
    const seen = new Map();
    const dupes = new Set();
    rows.forEach((r, i) => {
      if (!r.home_team_id || !r.away_team_id || !r.match_date) return;
      const key = `${r.home_team_id}|${r.away_team_id}|${r.match_date}`;
      if (seen.has(key)) { dupes.add(i); dupes.add(seen.get(key)); }
      else seen.set(key, i);
    });
    return dupes;
  };

  const getRowError = (row) => {
    if (row.home_team_id && row.away_team_id && row.home_team_id === row.away_team_id) return 'Same team';
    return null;
  };

  const duplicates = getDuplicates();
  const hasErrors = rows.some((r, i) => getRowError(r) || duplicates.has(i));

  const handleSave = async () => {
    const validRows = rows.filter(r => r.home_team_id && r.away_team_id && r.match_date);
    if (validRows.length === 0) { toast.error('Add at least one complete fixture'); return; }
    if (hasErrors) { toast.error('Fix errors before saving'); return; }

    setSaving(true);
    try {
      // Separate new vs existing
      const toCreate = validRows.filter(r => !r._id);
      const toUpdate = validRows.filter(r => r._id);
      // Find deleted fixtures
      const existingIds = new Set(existingFixtures.filter(f => f.league_id === league.id).map(f => f.id));
      const keptIds = new Set(rows.filter(r => r._id).map(r => r._id));
      const toDelete = [...existingIds].filter(id => !keptIds.has(id));

      // Delete removed
      await Promise.all(toDelete.map(id => base44.entities.LeagueFixture.delete(id)));

      // Update existing
      for (const r of toUpdate) {
        await base44.entities.LeagueFixture.update(r._id, {
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          match_date: r.match_date,
          rink_number: r.rink_number ? parseInt(r.rink_number) : null,
          status: 'scheduled',
        });
      }

      // Create new
      if (toCreate.length > 0) {
        await base44.entities.LeagueFixture.bulkCreate(toCreate.map(r => ({
          league_id: league.id,
          club_id: clubId,
          home_team_id: r.home_team_id,
          away_team_id: r.away_team_id,
          match_date: r.match_date,
          rink_number: r.rink_number ? parseInt(r.rink_number) : null,
          status: 'scheduled',
        })));
      }

      // Mark fixtures as generated
      await base44.entities.League.update(league.id, { fixtures_generated: true });
      toast.success(`Saved ${validRows.length} fixtures`);
      onClose(true); // true = refresh
    } catch (err) {
      toast.error('Failed to save fixtures: ' + err.message);
    }
    setSaving(false);
  };

  const downloadTemplate = () => {
    const header = 'HomeTeam,AwayTeam,Date (YYYY-MM-DD),Rink';
    const examples = teams.length >= 2
      ? [`${teams[0]?.name},${teams[1]?.name},2025-01-06,1`]
      : ['Team A,Team B,2025-01-06,1'];
    const blob = new Blob([[header, ...examples].join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'fixtures_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const lines = ev.target.result.split('\n').filter(l => l.trim());
      // Skip header
      const dataLines = lines.slice(1);
      const imported = [];
      const errors = [];
      dataLines.forEach((line, idx) => {
        const [home, away, date, rink] = parseCsvLine(line);
        const homeTeam = teams.find(t => t.name.toLowerCase() === home?.trim().toLowerCase());
        const awayTeam = teams.find(t => t.name.toLowerCase() === away?.trim().toLowerCase());
        if (!homeTeam) { errors.push(`Row ${idx + 2}: Unknown home team "${home}"`); return; }
        if (!awayTeam) { errors.push(`Row ${idx + 2}: Unknown away team "${away}"`); return; }
        if (!date?.trim().match(/^\d{4}-\d{2}-\d{2}$/)) { errors.push(`Row ${idx + 2}: Invalid date "${date}" (use YYYY-MM-DD)`); return; }
        imported.push({ home_team_id: homeTeam.id, away_team_id: awayTeam.id, match_date: date.trim(), rink_number: rink?.trim() || '', _id: null });
      });
      if (errors.length > 0) {
        toast.error(`Import issues:\n${errors.slice(0, 3).join('\n')}${errors.length > 3 ? `\n...and ${errors.length - 3} more` : ''}`);
      }
      if (imported.length > 0) {
        setRows(prev => {
          // Remove blank placeholder rows first
          const nonEmpty = prev.filter(r => r.home_team_id || r.away_team_id || r.match_date);
          return [...nonEmpty, ...imported];
        });
        toast.success(`Imported ${imported.length} fixture${imported.length !== 1 ? 's' : ''}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const teamName = (id) => teams.find(t => t.id === id)?.name || '—';
  const allRinks = Array.from({ length: rinkCount }, (_, i) => i + 1);

  return (
    <Dialog open={open} onOpenChange={() => onClose(false)}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-auto w-[calc(100%-1rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Manual Fixtures — {league?.name}
          </DialogTitle>
        </DialogHeader>

        {/* Actions bar */}
        <div className="flex flex-wrap items-center gap-2 pb-2 border-b">
          <Button size="sm" onClick={addRow} variant="outline">
            <Plus className="w-4 h-4 mr-1" /> Add Row
          </Button>
          <Button size="sm" variant="outline" onClick={downloadTemplate}>
            <Download className="w-4 h-4 mr-1" /> Download Template
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleCsvImport} />
          <span className="ml-auto text-sm text-slate-500">{rows.filter(r => r.home_team_id && r.away_team_id && r.match_date).length} valid fixture{rows.length !== 1 ? 's' : ''}</span>
        </div>

        {teams.length < 2 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Add at least 2 teams to this league before defining fixtures.
          </div>
        )}

        {/* CSV format hint */}
        <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2">
          <strong>CSV format:</strong> HomeTeam, AwayTeam, Date (YYYY-MM-DD), Rink — team names must exactly match the teams in this league.
        </div>

        {/* Fixture grid */}
        <div className="space-y-1">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_1fr_130px_80px_36px] gap-2 px-1 text-xs font-medium text-slate-500 uppercase">
            <div>Home Team</div>
            <div>Away Team</div>
            <div>Date</div>
            <div>Rink</div>
            <div></div>
          </div>

          {rows.map((row, idx) => {
            const isDupe = duplicates.has(idx);
            const rowErr = getRowError(row);
            const hasIssue = isDupe || rowErr;
            return (
              <div key={idx} className={`grid grid-cols-1 sm:grid-cols-[1fr_1fr_130px_80px_36px] gap-2 p-2 rounded-lg border ${hasIssue ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                {/* Home */}
                <div>
                  <Label className="sm:hidden text-xs text-slate-500">Home Team</Label>
                  <Select value={row.home_team_id} onValueChange={v => updateRow(idx, 'home_team_id', v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Home team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Away */}
                <div>
                  <Label className="sm:hidden text-xs text-slate-500">Away Team</Label>
                  <Select value={row.away_team_id} onValueChange={v => updateRow(idx, 'away_team_id', v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="Away team" />
                    </SelectTrigger>
                    <SelectContent>
                      {teams.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Date */}
                <div>
                  <Label className="sm:hidden text-xs text-slate-500">Date</Label>
                  <Input
                    type="date"
                    className="h-8 text-sm"
                    value={row.match_date}
                    onChange={e => updateRow(idx, 'match_date', e.target.value)}
                  />
                </div>
                {/* Rink */}
                <div>
                  <Label className="sm:hidden text-xs text-slate-500">Rink</Label>
                  <Select value={row.rink_number?.toString() || ''} onValueChange={v => updateRow(idx, 'rink_number', v)}>
                    <SelectTrigger className="h-8 text-sm">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={null}>—</SelectItem>
                      {allRinks.map(r => (
                        <SelectItem key={r} value={r.toString()}>Rink {r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {/* Remove */}
                <div className="flex items-center justify-end sm:justify-center">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => removeRow(idx)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {/* Inline error */}
                {hasIssue && (
                  <div className="sm:col-span-5 text-xs text-red-600 flex items-center gap-1 px-1">
                    <AlertTriangle className="w-3 h-3" />
                    {rowErr || (isDupe ? 'Duplicate fixture on this date' : '')}
                  </div>
                )}
              </div>
            );
          })}

          {rows.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              No fixtures yet. Click "Add Row" or import a CSV.
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onClose(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || hasErrors || teams.length < 2}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
            Save Fixtures
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}