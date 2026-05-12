/**
 * Bowls Analytics Engine
 * Calculates all performance metrics from saved scorecard data.
 */

export function parseScores(scores) {
  return (scores || []).map(v => parseInt(v) || 0);
}

export function computeMatchStats(sc, userEmail) {
  const isHome = sc.home_player_email === userEmail;
  const myRaw = isHome ? sc.home_scores : sc.away_scores;
  const oppRaw = isHome ? sc.away_scores : sc.home_scores;
  const myScores = parseScores(myRaw);
  const oppScores = parseScores(oppRaw);

  // Only count ends where at least one side has a value
  const playedEnds = myScores.filter((v, i) => v > 0 || oppScores[i] > 0).length;
  const myTotal = myScores.reduce((s, v) => s + v, 0);
  const oppTotal = oppScores.reduce((s, v) => s + v, 0);
  const won = myTotal > oppTotal;
  const margin = myTotal - oppTotal;

  // Per-end analysis
  const endData = [];
  for (let i = 0; i < Math.max(myScores.length, oppScores.length); i++) {
    const my = myScores[i] || 0;
    const opp = oppScores[i] || 0;
    if (my === 0 && opp === 0) continue;
    const blank = my === 0 && opp === 0;
    const wonEnd = my > opp;
    const lostEnd = opp > my;
    endData.push({
      end: i + 1,
      my,
      opp,
      wonEnd,
      lostEnd,
      blank,
      diff: my - opp,
    });
  }

  // Cumulative momentum
  let cumMy = 0, cumOpp = 0;
  const momentum = endData.map(e => {
    cumMy += e.my;
    cumOpp += e.opp;
    return { end: e.end, myTotal: cumMy, oppTotal: cumOpp, diff: cumMy - cumOpp };
  });

  // Biggest deficit
  let biggestDeficit = 0;
  momentum.forEach(m => {
    if (m.diff < biggestDeficit) biggestDeficit = m.diff;
  });
  const biggestComeback = won && biggestDeficit < 0 ? Math.abs(biggestDeficit) : 0;

  // Scoring streaks
  let maxWinStreak = 0, curWinStreak = 0;
  let maxLoseStreak = 0, curLoseStreak = 0;
  endData.forEach(e => {
    if (e.wonEnd) { curWinStreak++; maxWinStreak = Math.max(maxWinStreak, curWinStreak); curLoseStreak = 0; }
    else if (e.lostEnd) { curLoseStreak++; maxLoseStreak = Math.max(maxLoseStreak, curLoseStreak); curWinStreak = 0; }
    else { curWinStreak = 0; curLoseStreak = 0; }
  });

  // Halfway analysis
  const halfwayIdx = Math.floor(endData.length / 2);
  const halfwayDiff = halfwayIdx > 0 ? momentum[halfwayIdx - 1]?.diff || 0 : 0;
  const leadingAtHalfway = halfwayDiff > 0;

  // Final 5 ends scoring
  const last5 = endData.slice(-5);
  const last5My = last5.reduce((s, e) => s + e.my, 0);
  const last5Opp = last5.reduce((s, e) => s + e.opp, 0);

  // Multi-shot ends
  const multiShotEnds = endData.filter(e => e.my >= 2).length;
  const bigConcessionEnds = endData.filter(e => e.opp >= 3).length;

  // Turning points
  const turningPoints = [];
  for (let i = 1; i < momentum.length; i++) {
    const prev = momentum[i - 1];
    const curr = momentum[i];
    const diffChange = Math.abs(curr.diff - prev.diff);
    const leadChange = (prev.diff > 0 && curr.diff <= 0) || (prev.diff < 0 && curr.diff >= 0);
    if (diffChange >= 3 || leadChange) {
      turningPoints.push({ end: curr.end, diffChange, leadChange, diff: curr.diff });
    }
  }

  return {
    won,
    myTotal,
    oppTotal,
    margin,
    playedEnds,
    endData,
    momentum,
    endsWon: endData.filter(e => e.wonEnd).length,
    endsLost: endData.filter(e => e.lostEnd).length,
    biggestComeback,
    biggestWin: won ? margin : 0,
    maxWinStreak,
    maxLoseStreak,
    leadingAtHalfway,
    halfwayDiff,
    last5My,
    last5Opp,
    multiShotEnds,
    bigConcessionEnds,
    highestScoringEnd: Math.max(...endData.map(e => e.my), 0),
    turningPoints,
    isHome,
    opponentName: isHome ? (sc.away_player || 'Unknown') : (sc.home_player || 'Unknown'),
    date: sc.created_date,
    matchCode: sc.match_code,
    id: sc.id,
  };
}

export function computeAnalytics(scorecards, userEmail) {
  const matches = scorecards
    .filter(sc => sc.is_complete)
    .map(sc => computeMatchStats(sc, userEmail))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  if (matches.length === 0) return null;

  const total = matches.length;
  const wins = matches.filter(m => m.won).length;
  const losses = total - wins;
  const winPct = total > 0 ? (wins / total) * 100 : 0;

  const totalEnds = matches.reduce((s, m) => s + m.playedEnds, 0);
  const totalEndsWon = matches.reduce((s, m) => s + m.endsWon, 0);
  const endsWonPct = totalEnds > 0 ? (totalEndsWon / totalEnds) * 100 : 0;

  const totalShots = matches.reduce((s, m) => s + m.myTotal, 0);
  const totalConceded = matches.reduce((s, m) => s + m.oppTotal, 0);
  const avgShotsPerEnd = totalEnds > 0 ? totalShots / totalEnds : 0;
  const avgConcededPerEnd = totalEnds > 0 ? totalConceded / totalEnds : 0;

  const avgMargin = total > 0 ? matches.reduce((s, m) => s + m.margin, 0) / total : 0;
  const biggestWin = Math.max(...matches.map(m => m.biggestWin));
  const biggestComeback = Math.max(...matches.map(m => m.biggestComeback));
  const highestScoringEnd = Math.max(...matches.map(m => m.highestScoringEnd));

  const totalMultiShot = matches.reduce((s, m) => s + m.multiShotEnds, 0);
  const multiShotRate = totalEnds > 0 ? (totalMultiShot / totalEnds) * 100 : 0;

  const totalBigConcession = matches.reduce((s, m) => s + m.bigConcessionEnds, 0);
  const bigConcessionRate = totalEnds > 0 ? (totalBigConcession / totalEnds) * 100 : 0;

  // Consistency: standard deviation of per-end scores across all matches
  const allEndScores = matches.flatMap(m => m.endData.map(e => e.my));
  const mean = allEndScores.length > 0 ? allEndScores.reduce((s, v) => s + v, 0) / allEndScores.length : 0;
  const variance = allEndScores.length > 0
    ? allEndScores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / allEndScores.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const consistencyRating = Math.max(0, Math.min(100, 100 - (stdDev * 15)));

  // Clutch metrics
  const matchesLeadingHalfway = matches.filter(m => m.leadingAtHalfway);
  const matchesTrailingHalfway = matches.filter(m => !m.leadingAtHalfway && m.halfwayDiff < 0);
  const winWhenLeadingHalfway = matchesLeadingHalfway.length > 0
    ? (matchesLeadingHalfway.filter(m => m.won).length / matchesLeadingHalfway.length) * 100 : 0;
  const winWhenTrailingHalfway = matchesTrailingHalfway.length > 0
    ? (matchesTrailingHalfway.filter(m => m.won).length / matchesTrailingHalfway.length) * 100 : 0;

  const avgLast5My = total > 0 ? matches.reduce((s, m) => s + m.last5My, 0) / total : 0;
  const avgLast5Opp = total > 0 ? matches.reduce((s, m) => s + m.last5Opp, 0) / total : 0;

  // Closer rating: combo of win-when-leading + low late concessions
  const closerRating = (winWhenLeadingHalfway * 0.6) + (Math.max(0, 100 - (avgLast5Opp * 12)) * 0.4);

  // Head-to-head
  const h2hMap = {};
  matches.forEach(m => {
    const opp = m.opponentName;
    if (!h2hMap[opp]) h2hMap[opp] = { wins: 0, losses: 0, totalMargin: 0, totalEndsWon: 0, totalEnds: 0 };
    if (m.won) h2hMap[opp].wins++; else h2hMap[opp].losses++;
    h2hMap[opp].totalMargin += m.margin;
    h2hMap[opp].totalEndsWon += m.endsWon;
    h2hMap[opp].totalEnds += m.playedEnds;
  });
  const h2h = Object.entries(h2hMap).map(([name, d]) => ({
    name,
    wins: d.wins,
    losses: d.losses,
    played: d.wins + d.losses,
    winPct: ((d.wins / (d.wins + d.losses)) * 100),
    avgMargin: d.totalMargin / (d.wins + d.losses),
    endsWonPct: d.totalEnds > 0 ? (d.totalEndsWon / d.totalEnds) * 100 : 0,
  })).sort((a, b) => b.played - a.played);

  // Rolling form (last 5, last 10)
  const last5Matches = matches.slice(-5);
  const last10Matches = matches.slice(-10);
  const rollingWin5 = last5Matches.length > 0 ? (last5Matches.filter(m => m.won).length / last5Matches.length) * 100 : 0;
  const rollingWin10 = last10Matches.length > 0 ? (last10Matches.filter(m => m.won).length / last10Matches.length) * 100 : 0;
  const rollingAvgShots5 = last5Matches.length > 0
    ? last5Matches.reduce((s, m) => s + (m.playedEnds > 0 ? m.myTotal / m.playedEnds : 0), 0) / last5Matches.length : 0;

  // Form trend: compare rolling5 to overall
  const formTrend = rollingWin5 > winPct + 10 ? 'improving' : rollingWin5 < winPct - 10 ? 'declining' : 'stable';

  // Player Performance Index (0-100)
  const normWin = winPct;
  const normConsistency = consistencyRating;
  const normScoring = Math.min(100, avgShotsPerEnd * 25);
  const normDefence = Math.max(0, 100 - (avgConcededPerEnd * 25));
  const normClutch = closerRating;
  const normForm = rollingWin5;
  const ppi = (normWin * 0.25) + (normConsistency * 0.20) + (normScoring * 0.15) +
    (normDefence * 0.15) + (normClutch * 0.15) + (normForm * 0.10);

  // Time-series for charts
  const formOverTime = matches.map((m, idx) => {
    const slice = matches.slice(0, idx + 1);
    const wPct = (slice.filter(x => x.won).length / slice.length) * 100;
    return { date: m.date, winPct: wPct, margin: m.margin, shots: m.myTotal, conceded: m.oppTotal, result: m.won ? 1 : 0 };
  });

  // Smart insights
  const insights = generateInsights({
    winPct, endsWonPct, avgShotsPerEnd, avgConcededPerEnd, consistencyRating,
    multiShotRate, bigConcessionRate, winWhenLeadingHalfway, winWhenTrailingHalfway,
    formTrend, closerRating, rollingWin5, avgLast5My, avgLast5Opp, h2h, matches, biggestComeback,
  });

  return {
    total, wins, losses, winPct,
    totalEnds, totalEndsWon, endsWonPct,
    avgShotsPerEnd, avgConcededPerEnd, avgMargin,
    biggestWin, biggestComeback, highestScoringEnd,
    multiShotRate, bigConcessionRate,
    consistencyRating, stdDev,
    winWhenLeadingHalfway, winWhenTrailingHalfway,
    avgLast5My, avgLast5Opp, closerRating,
    h2h, formTrend, rollingWin5, rollingWin10, rollingAvgShots5,
    ppi, formOverTime, matches, insights,
  };
}

function generateInsights(data) {
  const insights = [];

  if (data.winPct >= 70) insights.push({ type: 'strength', text: `You win ${Math.round(data.winPct)}% of your matches — an excellent record.` });
  else if (data.winPct <= 35) insights.push({ type: 'weakness', text: `Your win rate is ${Math.round(data.winPct)}% — there's room to improve.` });

  if (data.multiShotRate >= 30) insights.push({ type: 'strength', text: `You score 2+ shots in ${Math.round(data.multiShotRate)}% of ends — a strong attacking threat.` });
  if (data.bigConcessionRate >= 25) insights.push({ type: 'weakness', text: `You concede 3+ shots in ${Math.round(data.bigConcessionRate)}% of ends — big ends are a vulnerability.` });

  if (data.consistencyRating >= 75) insights.push({ type: 'strength', text: `Your consistency rating is ${Math.round(data.consistencyRating)}/100 — you are a reliable, steady scorer.` });
  else if (data.consistencyRating < 50) insights.push({ type: 'insight', text: `Your scoring variance is high — you tend to be a streaky player.` });

  if (data.winWhenLeadingHalfway >= 80) insights.push({ type: 'strength', text: `You close out matches strongly — winning ${Math.round(data.winWhenLeadingHalfway)}% when leading at halfway.` });
  if (data.winWhenTrailingHalfway >= 40) insights.push({ type: 'strength', text: `You are resilient — you win ${Math.round(data.winWhenTrailingHalfway)}% of matches even when trailing at halfway.` });
  if (data.winWhenLeadingHalfway < 55 && data.winWhenLeadingHalfway > 0) insights.push({ type: 'weakness', text: `You struggle to convert leads — you lose leads at halfway too often.` });

  if (data.formTrend === 'improving') insights.push({ type: 'trend', text: `Your recent form is improving — you are winning ${Math.round(data.rollingWin5)}% of your last 5 matches.` });
  if (data.formTrend === 'declining') insights.push({ type: 'trend', text: `Your recent form is declining — win rate over last 5 is ${Math.round(data.rollingWin5)}%.` });

  if (data.avgLast5Opp > data.avgConcededPerEnd * 1.3) insights.push({ type: 'weakness', text: `You concede more shots late in games — focus on defensive play in the final ends.` });
  if (data.avgLast5My > data.avgShotsPerEnd * 1.2) insights.push({ type: 'strength', text: `You score more shots in the final ends — a strong closer.` });

  if (data.biggestComeback > 8) insights.push({ type: 'strength', text: `Your biggest comeback was from ${data.biggestComeback} shots down — remarkable resilience.` });

  if (data.h2h.length > 0) {
    const toughest = data.h2h.reduce((best, h) => h.winPct < best.winPct ? h : best, data.h2h[0]);
    const easiest = data.h2h.reduce((best, h) => h.winPct > best.winPct ? h : best, data.h2h[0]);
    if (toughest.played >= 2) insights.push({ type: 'insight', text: `Your toughest opponent is ${toughest.name} — you win just ${Math.round(toughest.winPct)}% against them.` });
    if (easiest.played >= 2 && easiest.name !== toughest.name) insights.push({ type: 'insight', text: `You perform best against ${easiest.name} — winning ${Math.round(easiest.winPct)}% of encounters.` });
  }

  if (data.endsWonPct >= 55) insights.push({ type: 'strength', text: `You win ${Math.round(data.endsWonPct)}% of all ends played — a dominant end-by-end performer.` });

  return insights.slice(0, 8);
}