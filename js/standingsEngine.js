export function createStandings(teams) {
  return teams.map(team => ({
    teamId: team.id, teamName: team.name, zhName: team.zhName,
    played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, points: 0
  }));
}
export function applyResult(standings, homeId, awayId, homeGoals, awayGoals) {
  const home = standings.find(s => s.teamId === homeId);
  const away = standings.find(s => s.teamId === awayId);
  if (!home || !away) return;
  home.played++; away.played++;
  home.gf += homeGoals; home.ga += awayGoals;
  away.gf += awayGoals; away.ga += homeGoals;
  home.gd = home.gf - home.ga; away.gd = away.gf - away.ga;
  if (homeGoals > awayGoals) { home.won++; away.lost++; home.points += 3; }
  else if (homeGoals < awayGoals) { away.won++; home.lost++; away.points += 3; }
  else { home.drawn++; away.drawn++; home.points++; away.points++; }
}
export function sortStandings(standings) {
  return [...standings].sort((a,b) => b.points - a.points || b.gd - a.gd || b.gf - a.gf || b.won - a.won || a.teamName.localeCompare(b.teamName));
}
export function rankedStandings(standings) { return sortStandings(standings).map((s, i) => ({ ...s, rank: i + 1, zone: getLeagueZone(i + 1) })); }
export function getLeagueZone(rank) {
  if (rank <= 8) return 'direct_r16';
  if (rank <= 16) return 'playoff_seeded';
  if (rank <= 24) return 'playoff_unseeded';
  return 'eliminated';
}
export function zoneLabel(zone) {
  return { direct_r16: '直进16强', playoff_seeded: '附加赛种子', playoff_unseeded: '附加赛非种子', eliminated: '出局区' }[zone] || zone;
}
export function qualificationBriefing(season) {
  const ranked = rankedStandings(season.standings);
  const row = ranked.find(s => s.teamId === season.userTeamId);
  if (!row) return null;
  const lines = [];
  const round = season.round;
  lines.push(`你目前排名第 ${row.rank}，积 ${row.points} 分，净胜球 ${row.gd >= 0 ? '+' : ''}${row.gd}。`);
  if (round < 7) return lines.join('\n');
  if (row.rank <= 8) lines.push('当前位于前 8，目标是守住直接晋级席位。最后两轮至少拿到 3 分会明显提高安全性。');
  else if (row.rank <= 16) lines.push('当前位于附加赛种子区，仍有机会冲击前 8，但也要避免跌入非种子区。');
  else if (row.rank <= 24) lines.push('当前位于附加赛边缘区，胜利非常关键；如果输球，需要密切关注身后球队。');
  else lines.push('当前处在出局区，最后阶段必须抢分，否则赛季可能提前结束。');
  const focus = ranked.filter(s => s.teamId !== season.userTeamId && (s.rank <= 10 || (s.rank >= 15 && s.rank <= 26))).slice(0, 5);
  lines.push('其他焦点：' + focus.map(s => `${s.zhName || s.teamName} 第${s.rank}名 ${s.points}分`).join('；') + '。');
  return lines.join('\n');
}
