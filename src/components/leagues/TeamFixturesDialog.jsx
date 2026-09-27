import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Printer, ClipboardList } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ROTA_COLUMNS = 8;

const escapeHtml = (str) => String(str ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// All fixtures for one team within a league (home and away), date order
export const getTeamLeagueFixtures = (fixtures, league, team) =>
  (fixtures || [])
    .filter(f => f.league_id === league.id &&
      (f.home_team_id === team.id || f.away_team_id === team.id) &&
      f.status !== 'cancelled')
    .sort((a, b) => a.match_date.localeCompare(b.match_date) || (a.leg || 1) - (b.leg || 1));

const openPrintWindow = (title, bodyHtml, extraCss = '') => {
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; }
  ${extraCss}
</style>
</head>
<body>${bodyHtml}</body>
</html>`;
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
};

// Printable copy of the team's fixture list
export const printFixtures = (league, team, list, teams) => {
  const rows = list.map(f => {
    const isHome = f.home_team_id === team.id;
    const opp = teams.find(t => t.id === (isHome ? f.away_team_id : f.home_team_id))?.name || 'TBD';
    const myScore = isHome ? f.home_score : f.away_score;
    const oppScore = isHome ? f.away_score : f.home_score;
    const result = f.status === 'completed' && myScore != null && oppScore != null
      ? `${myScore} – ${oppScore}`
      : '';
    return `<tr>
      <td>${format(parseISO(f.match_date), 'EEE d MMM yyyy')}</td>
      <td>${escapeHtml(opp)}</td>
      <td class="center">${isHome ? 'Home' : 'Away'}</td>
      <td class="center">${f.rink_number ?? '—'}</td>
      <td class="center">${escapeHtml(league.start_time || '')}</td>
      <td class="center">${result}</td>
    </tr>`;
  }).join('');

  const bodyHtml = `
    <h1>${escapeHtml(team.name)} — Fixtures</h1>
    <p class="sub">${escapeHtml(league.name)}${league.start_date && league.end_date ? ` · ${format(parseISO(league.start_date), 'd MMM')} – ${format(parseISO(league.end_date), 'd MMM yyyy')}` : ''}</p>
    <table>
      <thead>
        <tr><th>Date</th><th>Opponent</th><th class="center">Venue</th><th class="center">Rink</th><th class="center">Start</th><th class="center">Result</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  openPrintWindow(`${team.name} Fixtures`, bodyHtml, `
    @page { size: A4 portrait; margin: 12mm; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { font-size: 13px; color: #444; margin: 0 0 14px; }
    table { border-collapse: collapse; width: 100%; font-size: 13px; }
    th, td { border: 1px solid #333; padding: 6px 8px; }
    th { background: #eee; text-align: left; }
    .center { text-align: center; }`);
};

// Printable blank rota: fixture details on the left, 8 empty columns for captains
// to write player names and tick who is playing each week
export const printBlankRota = (league, team, list, teams) => {
  const fixtureRows = list.map(f => {
    const isHome = f.home_team_id === team.id;
    const opp = teams.find(t => t.id === (isHome ? f.away_team_id : f.home_team_id))?.name || 'TBD';
    const ticks = Array.from({ length: ROTA_COLUMNS }, () => '<td class="tick"><div class="box"></div></td>').join('');
    return `<tr>
      <td class="fixture">
        <div class="f-date">${format(parseISO(f.match_date), 'EEE d MMM yyyy')}${league.start_time ? ` · ${escapeHtml(league.start_time)}` : ''}</div>
        <div class="f-detail">${isHome ? 'vs' : 'at'} ${escapeHtml(opp)} · ${isHome ? 'Home' : 'Away'}${f.rink_number ? ` · Rink ${f.rink_number}` : ''}</div>
      </td>
      ${ticks}
    </tr>`;
  }).join('');

  const nameCells = Array.from({ length: ROTA_COLUMNS }, () => '<th class="name-cell"><div class="name-label">Name</div><div class="name-line"></div></th>').join('');

  const bodyHtml = `
    <div class="header">
      <div>
        <h1>${escapeHtml(team.name)} — Player Rota</h1>
        <p class="sub">${escapeHtml(league.name)}${team.captain_name ? ` · Captain: ${escapeHtml(team.captain_name)}` : ''}</p>
      </div>
    </div>
    <table>
      <thead>
        <tr><th class="fixture-head">Fixture</th>${nameCells}</tr>
      </thead>
      <tbody>${fixtureRows}</tbody>
    </table>
    <p class="note">Write each player's name in a column above, then tick the box for each fixture they are playing in.</p>`;

  openPrintWindow(`${team.name} Rota`, bodyHtml, `
    @page { size: A4 landscape; margin: 10mm; }
    .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
    h1 { font-size: 18px; margin: 0 0 2px; }
    .sub { font-size: 12px; color: #444; margin: 0; }
    table { border-collapse: collapse; width: 100%; table-layout: fixed; }
    th, td { border: 1px solid #333; padding: 4px 6px; }
    .fixture-head { width: 30%; background: #eee; font-size: 11px; text-align: left; }
    .fixture { font-size: 11px; }
    .f-date { font-weight: bold; }
    .f-detail { color: #333; margin-top: 2px; }
    .name-cell { text-align: center; background: #eee; padding: 6px 4px; }
    .name-label { font-size: 10px; color: #444; margin-bottom: 4px; }
    .name-line { border-bottom: 1px solid #111; height: 16px; margin: 0 4px; }
    .tick { text-align: center; vertical-align: middle; height: 34px; }
    .box { width: 16px; height: 16px; border: 2px solid #111; margin: 0 auto; border-radius: 2px; }
    .note { font-size: 10px; color: #555; margin-top: 6px; }`);
};

export default function TeamFixturesDialog({ open, onClose, league, team, fixtures, teams }) {
  if (!league || !team) return null;

  const list = getTeamLeagueFixtures(fixtures, league, team);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto mx-4 sm:mx-auto w-[calc(100%-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{team.name} — Fixtures</DialogTitle>
          <p className="text-sm text-gray-500 -mt-1">{league.name}</p>
        </DialogHeader>
        <div className="space-y-2">
          {list.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No fixtures for this team yet</p>
          ) : (
            list.map(f => {
              const isHome = f.home_team_id === team.id;
              const opp = teams.find(t => t.id === (isHome ? f.away_team_id : f.home_team_id))?.name || 'TBD';
              const myScore = isHome ? f.home_score : f.away_score;
              const oppScore = isHome ? f.away_score : f.home_score;
              return (
                <div key={f.id} className="flex items-center justify-between p-3 border rounded-lg gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {isHome ? 'vs' : 'at'} {opp}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                      <span>{format(parseISO(f.match_date), 'EEE d MMM yyyy')}</span>
                      <Badge className={`px-1.5 py-0 text-xs ${isHome ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                        {isHome ? 'Home' : 'Away'}
                      </Badge>
                      {f.rink_number && <span>Rink {f.rink_number}</span>}
                      {league.is_double_rink && f.leg && <span>Leg {f.leg}</span>}
                    </div>
                  </div>
                  {f.status === 'completed' && myScore != null && oppScore != null ? (
                    <Badge className="bg-emerald-100 text-emerald-700 shrink-0">{myScore} – {oppScore}</Badge>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={list.length === 0}
            onClick={() => printBlankRota(league, team, list, teams)}
          >
            <ClipboardList className="w-4 h-4 mr-2" />
            Print Blank Rota
          </Button>
          <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700"
            disabled={list.length === 0}
            onClick={() => printFixtures(league, team, list, teams)}
          >
            <Printer className="w-4 h-4 mr-2" />
            Print Fixtures
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}