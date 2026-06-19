import { rankedStandings } from './standingsEngine.js';
export function buildKnockoutSeedMap(standings) {
  const ranked = rankedStandings(standings);
  return {
    direct: ranked.slice(0, 8),
    playoffSeeded: ranked.slice(8, 16),
    playoffUnseeded: ranked.slice(16, 24),
    eliminated: ranked.slice(24)
  };
}
export function generatePlayoffPairs(standings) {
  const map = buildKnockoutSeedMap(standings);
  const seeded = map.playoffSeeded;
  const unseeded = [...map.playoffUnseeded].reverse();
  return seeded.map((team, i) => ({ stage: 'playoff', seeded: team, unseeded: unseeded[i] }));
}
export function describeUserPath(season) {
  if (!season.leagueRank) return '联赛阶段尚未结束。';
  if (season.leagueRank <= 8) return `你以第 ${season.leagueRank} 名直接进入 16 强。`;
  if (season.leagueRank <= 24) return `你以第 ${season.leagueRank} 名进入淘汰赛附加赛。`;
  return `你以第 ${season.leagueRank} 名结束联赛阶段，未能晋级。`;
}
