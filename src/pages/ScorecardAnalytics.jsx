import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BarChart2, Target, Users, Zap, TrendingUp, Activity, Trophy, Lightbulb, ChevronDown } from 'lucide-react';
import { computeAnalytics } from '@/lib/bowlsAnalytics';
import StatCard from '@/components/analytics/StatCard';
import PpiGauge from '@/components/analytics/PpiGauge';
import FormChart from '@/components/analytics/FormChart';
import MomentumChart from '@/components/analytics/MomentumChart';
import EndHeatmap from '@/components/analytics/EndHeatmap';
import AnalyticsRadar from '@/components/analytics/RadarChart';
import H2HList from '@/components/analytics/H2HList';
import InsightCard from '@/components/analytics/InsightCard';
import MatchResultsList from '@/components/analytics/MatchResultsList';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart2 },
  { id: 'form', label: 'Form', icon: TrendingUp },
  { id: 'match', label: 'Match Analysis', icon: Activity },
  { id: 'rivals', label: 'Rivals', icon: Users },
  { id: 'insights', label: 'Insights', icon: Lightbulb },
];

export default function ScorecardAnalytics() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedMatchIdx, setSelectedMatchIdx] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { base44.auth.me().then(setUser); }, []);

  const { data: scorecards = [], isLoading } = useQuery({
    queryKey: ['analyticsCards', user?.email],
    queryFn: () => base44.entities.Scorecard.filter({ saved_by: user.email }),
    enabled: !!user?.email,
    staleTime: 30000,
  });

  const analytics = user ? computeAnalytics(scorecards, user.email) : null;

  const displayName = user
    ? (user.first_name ? `${user.first_name}${user.surname ? ' ' + user.surname : ''}` : user.full_name || user.email?.split('@')[0])
    : '';

  const selectedMatch = analytics && selectedMatchIdx !== null
    ? analytics.matches[analytics.matches.length - 1 - selectedMatchIdx]
    : analytics?.matches?.[analytics.matches.length - 1];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4 sticky top-0 z-30">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/ScorecardHub')} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Performance Analytics</h1>
            {displayName && <p className="text-xs text-gray-400">{displayName}</p>}
          </div>
          <div className="flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span className="text-sm font-bold text-emerald-700">{analytics?.total || 0} matches</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto mt-3">
          <div className="flex gap-1 overflow-x-auto scrollbar-hide">
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    activeTab === t.id ? 'bg-emerald-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">

        {/* No data state */}
        {!analytics && !isLoading && (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
              <BarChart2 className="w-8 h-8 text-gray-400" />
            </div>
            <h2 className="text-lg font-bold text-gray-700 mb-2">No completed matches yet</h2>
            <p className="text-sm text-gray-400 max-w-xs mx-auto">Save your first scorecard to unlock your performance analytics dashboard.</p>
            <button
              onClick={() => navigate('/ScorecardHub')}
              className="mt-6 bg-emerald-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-emerald-700 transition-colors"
            >
              Go to Scorecard Hub
            </button>
          </div>
        )}

        {/* OVERVIEW TAB */}
        {analytics && activeTab === 'overview' && (
          <>
            {/* PPI Gauge + Radar */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="flex-1 flex flex-col items-center">
                  <PpiGauge ppi={analytics.ppi} />
                </div>
                <div className="flex-1 w-full">
                  <AnalyticsRadar analytics={analytics} />
                </div>
              </div>
            </div>

            {/* Core stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Win Rate" value={`${Math.round(analytics.winPct)}%`} sub={`${analytics.wins}W – ${analytics.losses}L`} accent="emerald" icon={Trophy} />
              <StatCard label="Ends Won" value={`${Math.round(analytics.endsWonPct)}%`} sub={`${analytics.totalEndsWon} of ${analytics.totalEnds}`} accent="blue" icon={Target} />
              <StatCard label="Avg Shots/End" value={analytics.avgShotsPerEnd.toFixed(2)} sub="scored per end" accent="purple" />
              <StatCard label="Avg Conceded" value={analytics.avgConcededPerEnd.toFixed(2)} sub="opponent per end" accent="amber" />
              <StatCard label="Avg Margin" value={analytics.avgMargin > 0 ? `+${analytics.avgMargin.toFixed(1)}` : analytics.avgMargin.toFixed(1)} sub="per match" accent={analytics.avgMargin > 0 ? 'emerald' : 'red'} />
              <StatCard label="Consistency" value={`${Math.round(analytics.consistencyRating)}/100`} sub={analytics.stdDev.toFixed(2) + ' std dev'} accent="slate" icon={Activity} />
            </div>

            {/* Records */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Career Records</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">{analytics.biggestWin}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Biggest Win</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{analytics.biggestComeback}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Biggest Comeback</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{analytics.highestScoringEnd}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Best End Score</p>
                </div>
              </div>
            </div>

            {/* Clutch metrics */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Clutch & Closing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Win when leading @ halfway</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${analytics.winWhenLeadingHalfway}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{Math.round(analytics.winWhenLeadingHalfway)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Win when trailing @ halfway</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: `${analytics.winWhenTrailingHalfway}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{Math.round(analytics.winWhenTrailingHalfway)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Multi-shot end rate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${analytics.multiShotRate}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{Math.round(analytics.multiShotRate)}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">Big end concession rate</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-red-400 rounded-full" style={{ width: `${analytics.bigConcessionRate}%` }} />
                    </div>
                    <span className="text-sm font-bold text-gray-700">{Math.round(analytics.bigConcessionRate)}%</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400 mb-1">Closer Rating</p>
                <p className="text-3xl font-bold text-emerald-700">{Math.round(analytics.closerRating)}<span className="text-base font-normal text-gray-400">/100</span></p>
              </div>
            </div>

            {/* End Heatmap */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">End Scoring Heatmap</h3>
              <EndHeatmap matches={analytics.matches} />
            </div>
          </>
        )}

        {/* FORM TAB */}
        {analytics && activeTab === 'form' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">Win % Over Time</h3>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                  analytics.formTrend === 'improving' ? 'bg-emerald-100 text-emerald-700' :
                  analytics.formTrend === 'declining' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                }`}>
                  {analytics.formTrend === 'improving' ? '↑ Improving' : analytics.formTrend === 'declining' ? '↓ Declining' : '→ Stable'}
                </span>
              </div>
              <FormChart data={analytics.formOverTime} />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-bold text-emerald-700">{Math.round(analytics.rollingWin5)}%</p>
                <p className="text-xs text-gray-400 mt-0.5">Last 5 Win %</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-bold text-blue-700">{Math.round(analytics.rollingWin10)}%</p>
                <p className="text-xs text-gray-400 mt-0.5">Last 10 Win %</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
                <p className="text-xl font-bold text-purple-700">{analytics.rollingAvgShots5.toFixed(1)}</p>
                <p className="text-xs text-gray-400 mt-0.5">L5 Shots/End</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Recent Results</h3>
              <MatchResultsList matches={analytics.matches} limit={15} />
            </div>
          </>
        )}

        {/* MATCH ANALYSIS TAB */}
        {analytics && activeTab === 'match' && (
          <>
            {/* Match selector */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-700">Match Momentum</h3>
                <div className="relative">
                  <select
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 pr-6 appearance-none bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    value={selectedMatchIdx ?? ''}
                    onChange={e => setSelectedMatchIdx(e.target.value === '' ? null : parseInt(e.target.value))}
                  >
                    <option value="">Latest match</option>
                    {[...analytics.matches].reverse().map((m, i) => (
                      <option key={m.id || i} value={i}>
                        vs {m.opponentName} ({m.won ? 'W' : 'L'} {m.myTotal}–{m.oppTotal})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-2 pointer-events-none" />
                </div>
              </div>
              {selectedMatch ? (
                <>
                  <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-700">{selectedMatch.myTotal}</p>
                      <p className="text-xs text-gray-400">You</p>
                    </div>
                    <div className="flex-1 text-center">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${selectedMatch.won ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {selectedMatch.won ? 'WIN' : 'LOSS'}
                      </span>
                      <p className="text-xs text-gray-400 mt-1">vs {selectedMatch.opponentName}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-gray-500">{selectedMatch.oppTotal}</p>
                      <p className="text-xs text-gray-400">Them</p>
                    </div>
                  </div>
                  <MomentumChart momentum={selectedMatch.momentum} turningPoints={selectedMatch.turningPoints} />
                  {selectedMatch.turningPoints.length > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                      <p className="text-xs font-semibold text-amber-700 mb-1">🔄 Turning Points</p>
                      {selectedMatch.turningPoints.map((tp, i) => (
                        <p key={i} className="text-xs text-amber-600">End {tp.end}: {tp.leadChange ? 'Lead changed hands' : `Score swing of ${tp.diffChange} shots`}</p>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <div className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-lg font-bold text-gray-700">{selectedMatch.endsWon}</p>
                      <p className="text-xs text-gray-400">Ends Won</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-lg font-bold text-gray-700">{selectedMatch.maxWinStreak}</p>
                      <p className="text-xs text-gray-400">Best Streak</p>
                    </div>
                    <div className="text-center p-2 bg-gray-50 rounded-xl">
                      <p className="text-lg font-bold text-gray-700">{selectedMatch.multiShotEnds}</p>
                      <p className="text-xs text-gray-400">Multi-Shot Ends</p>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-8">Select a match to view momentum</p>
              )}
            </div>

            {/* End scoring heatmap */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Scoring Heatmap (All Matches)</h3>
              <EndHeatmap matches={analytics.matches} />
            </div>
          </>
        )}

        {/* RIVALS TAB */}
        {analytics && activeTab === 'rivals' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Head-to-Head Records</h3>
              <H2HList h2h={analytics.h2h} />
            </div>

            {analytics.h2h.length >= 2 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-4">Rivalry Insights</h3>
                <div className="space-y-3">
                  {(() => {
                    const withPlayed = analytics.h2h.filter(h => h.played >= 2);
                    if (withPlayed.length === 0) return <p className="text-sm text-gray-400">Play at least 2 matches against an opponent to see rivalry insights.</p>;
                    const toughest = withPlayed.reduce((b, h) => h.winPct < b.winPct ? h : b, withPlayed[0]);
                    const easiest = withPlayed.reduce((b, h) => h.winPct > b.winPct ? h : b, withPlayed[0]);
                    const closest = withPlayed.reduce((b, h) => Math.abs(h.winPct - 50) < Math.abs(b.winPct - 50) ? h : b, withPlayed[0]);
                    return [
                      <div key="tough" className="flex items-center gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
                        <span className="text-lg">⚔️</span>
                        <div><p className="text-xs font-semibold text-red-700">Toughest Opponent</p><p className="text-sm text-red-600 font-bold">{toughest.name} — {Math.round(toughest.winPct)}% win rate</p></div>
                      </div>,
                      easiest.name !== toughest.name && (
                        <div key="easy" className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="text-lg">🏆</span>
                          <div><p className="text-xs font-semibold text-emerald-700">Favourite Opponent</p><p className="text-sm text-emerald-600 font-bold">{easiest.name} — {Math.round(easiest.winPct)}% win rate</p></div>
                        </div>
                      ),
                      <div key="close" className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
                        <span className="text-lg">🤝</span>
                        <div><p className="text-xs font-semibold text-blue-700">Closest Rivalry</p><p className="text-sm text-blue-600 font-bold">{closest.name} — {Math.round(closest.winPct)}% win rate</p></div>
                      </div>,
                    ];
                  })()}
                </div>
              </div>
            )}
          </>
        )}

        {/* INSIGHTS TAB */}
        {analytics && activeTab === 'insights' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-bold text-gray-700">Smart Insights</h3>
              </div>
              {analytics.insights.length > 0 ? (
                <div className="space-y-2">
                  {analytics.insights.map((ins, i) => <InsightCard key={i} insight={ins} />)}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Save more matches to unlock personalised insights.</p>
              )}
            </div>

            {/* Full stat breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-700 mb-4">Full Stats Breakdown</h3>
              <div className="space-y-2">
                {[
                  ['Matches Played', analytics.total],
                  ['Wins', analytics.wins],
                  ['Losses', analytics.losses],
                  ['Win %', `${Math.round(analytics.winPct)}%`],
                  ['Total Ends Played', analytics.totalEnds],
                  ['Ends Won', analytics.totalEndsWon],
                  ['Ends Won %', `${Math.round(analytics.endsWonPct)}%`],
                  ['Total Shots Scored', analytics.matches.reduce((s, m) => s + m.myTotal, 0)],
                  ['Total Shots Conceded', analytics.matches.reduce((s, m) => s + m.oppTotal, 0)],
                  ['Avg Shots / End', analytics.avgShotsPerEnd.toFixed(2)],
                  ['Avg Conceded / End', analytics.avgConcededPerEnd.toFixed(2)],
                  ['Avg Match Margin', analytics.avgMargin.toFixed(1)],
                  ['Multi-Shot End Rate', `${Math.round(analytics.multiShotRate)}%`],
                  ['Big Concession Rate', `${Math.round(analytics.bigConcessionRate)}%`],
                  ['Consistency Rating', `${Math.round(analytics.consistencyRating)}/100`],
                  ['Closer Rating', `${Math.round(analytics.closerRating)}/100`],
                  ['Performance Index', `${Math.round(analytics.ppi)}/100`],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className="text-sm font-bold text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}