import { TEAMS, getTeamById } from '../data/teamsData.js';
import { createStandings, applyResult, rankedStandings } from './standingsEngine.js';
import { shuffle, teamAverage, randomInt, uid } from './utils.js';

export function createSeason(userTeamId) {
  const userTeam = getTeamById(userTeamId);
  const opponents = generateUserOpponents(userTeamId);
  return {
    id: uid('season'), userTeamId, userTeamName: userTeam.name, userTeamZhName: userTeam.zhName,
    stage: 'league', round: 1, maxLeagueRounds: 8,
    opponents,
    standings: createStandings(TEAMS),
    playerStatus: createPlayerStatus(userTeam),
    teamStatus: { morale: 70, tacticalFamiliarity: 60, rotationTrust: 50, medicalLoad: 40 },
    history: [], managementHistory: [], createdAt: new Date().toISOString(), completed: false
  };
}
function generateUserOpponents(userTeamId) {
  const others = shuffle(TEAMS.filter(t => t.id !== userTeamId));
  const strong = others.filter(t => teamAverage(t) >= 84).slice(0, 3);
  const mid = others.filter(t => teamAverage(t) >= 78 && teamAverage(t) < 84).slice(0, 3);
  const weak = others.filter(t => teamAverage(t) < 78).slice(0, 2);
  return shuffle([...strong, ...mid, ...weak]).slice(0, 8).map((t, i) => ({ round: i + 1, opponentId: t.id, home: i % 2 === 0 }));
}
function createPlayerStatus(team) {
  return Object.fromEntries(team.squad.map(p => [p.name, { stamina: 100, form: 0, sharpness: 70, injuryRisk: 0, yellowCards: 0, suspended: false, minutesLastMatch: 0, startsInLast3: [] }]));
}
export function currentFixture(season) { return season.opponents.find(f => f.round === season.round); }
export function simulateComputerRound(season, userHomeId, userAwayId) {
  const available = shuffle(TEAMS.filter(t => t.id !== userHomeId && t.id !== userAwayId).map(t => t.id));
  const pairCount = Math.min(17, Math.floor(available.length / 2));
  const highlights = [];
  for (let i = 0; i < pairCount; i++) {
    const a = getTeamById(available[i*2]);
    const b = getTeamById(available[i*2+1]);
    const result = quickSim(a, b);
    applyResult(season.standings, a.id, b.id, result.home, result.away);
    if (Math.abs(teamAverage(a)-teamAverage(b)) <= 3 || result.away > result.home + 1) {
      highlights.push(`${a.zhName || a.name} ${result.home}-${result.away} ${b.zhName || b.name}`);
    }
  }
  return highlights.slice(0, 5);
}
export function quickSim(home, away) {
  const h = teamAverage(home, true) + 1 + (home.hidden?.europeanTemperament || 6) * .12;
  const a = teamAverage(away, true) + (away.hidden?.europeanTemperament || 6) * .12;
  const diff = h - a;
  const baseH = 1.25 + diff * .05 + Math.random() * .8;
  const baseA = 1.05 - diff * .04 + Math.random() * .8;
  return { home: Math.max(0, Math.round(baseH + randomInt(-1, 1))), away: Math.max(0, Math.round(baseA + randomInt(-1, 1))) };
}
export function applyManagement(season, choice) {
  const effects = {
    recovery: { label: '恢复', stamina: 12, injury: -8, morale: 2 },
    tactical: { label: '战术演练', stamina: -2, familiarity: 10, morale: 1 },
    attack: { label: '进攻训练', stamina: -4, sharpness: 8, morale: 2 },
    defense: { label: '防守训练', stamina: -4, familiarity: 4, morale: 1 },
    setpiece: { label: '定位球专项', stamina: -2, sharpness: 5, familiarity: 5 },
    rotation: { label: '轮换计划', stamina: 7, rotationTrust: 8, morale: -1 },
    mentality: { label: '大赛心理准备', morale: 8, familiarity: 2 },
    care: { label: '重点球员护理', stamina: 8, injury: -10 }
  }[choice] || { label: '无', stamina: 0 };
  for (const status of Object.values(season.playerStatus)) {
    status.stamina = Math.min(100, Math.max(0, status.stamina + (effects.stamina || 0)));
    status.injuryRisk = Math.max(0, status.injuryRisk + (effects.injury || 0));
    status.sharpness = Math.min(100, Math.max(0, status.sharpness + (effects.sharpness || 0)));
  }
  season.teamStatus.morale = Math.min(100, Math.max(0, season.teamStatus.morale + (effects.morale || 0)));
  season.teamStatus.tacticalFamiliarity = Math.min(100, Math.max(0, season.teamStatus.tacticalFamiliarity + (effects.familiarity || 0)));
  season.teamStatus.rotationTrust = Math.min(100, Math.max(0, season.teamStatus.rotationTrust + (effects.rotationTrust || 0)));
  season.managementHistory.push({ round: season.round, choice, label: effects.label, at: new Date().toISOString() });
}
export function advanceRound(season) { season.round += 1; }
export function finishLeagueIfNeeded(season) {
  if (season.round <= season.maxLeagueRounds) return false;
  const ranked = rankedStandings(season.standings);
  const user = ranked.find(r => r.teamId === season.userTeamId);
  season.leagueRank = user?.rank;
  season.leagueZone = user?.zone;
  if (user?.rank > 24) { season.completed = true; season.finish = 'league_eliminated'; }
  else { season.stage = user.rank <= 8 ? 'r16' : 'playoff'; }
  return true;
}
