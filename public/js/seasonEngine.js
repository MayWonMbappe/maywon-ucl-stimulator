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
    history: [], managementHistory: [], createdAt: new Date().toISOString(), completed: false,
    leagueCompleted: false,
    knockout: null
  };
}

function generateUserOpponents(userTeamId) {
  const user = getTeamById(userTeamId);
  const sorted = TEAMS
    .filter(t => t.id !== userTeamId)
    .sort((a, b) => teamAverage(b, true) - teamAverage(a, true));
  const pots = [sorted.slice(0, 9), sorted.slice(9, 18), sorted.slice(18, 27), sorted.slice(27)];
  const picked = pots.map(pot => shuffle(pot).slice(0, 2));
  const slots = [picked[0][0], picked[2][0], picked[1][0], picked[3][0], picked[0][1], picked[2][1], picked[1][1], picked[3][1]].filter(Boolean);
  // 让 8 轮强弱尽量均衡，而不是前强后弱；主客场交替。
  return slots.slice(0, 8).map((t, i) => ({
    round: i + 1,
    opponentId: t.id,
    home: i % 2 === 0,
    opponentTier: opponentTier(t),
    averageGap: Math.round((teamAverage(user, true) - teamAverage(t, true)) * 10) / 10
  }));
}

function opponentTier(team) {
  const avg = teamAverage(team, true);
  if (avg >= 84) return 'strong';
  if (avg >= 80) return 'upper_mid';
  if (avg >= 76) return 'mid';
  return 'underdog';
}

function createPlayerStatus(team) {
  return Object.fromEntries(team.squad.map(p => [p.name, { stamina: 100, form: 0, sharpness: 70, injuryRisk: 0, yellowCards: 0, suspended: false, minutesLastMatch: 0, startsInLast3: [] }]));
}

export function currentFixture(season) {
  if (!season) return null;
  if (season.stage === 'league') return season.opponents.find(f => f.round === season.round) || null;
  return season.knockout?.currentFixture || null;
}

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
  season.managementHistory.push({ round: season.round, stage: season.stage, choice, label: effects.label, at: new Date().toISOString() });
}

export function advanceRound(season) {
  if (season.stage === 'league' && season.round < season.maxLeagueRounds) season.round += 1;
}

export function finishLeagueIfNeeded(season) {
  if (season.stage !== 'league') return true;
  const userLeagueMatches = season.history.filter(m => m.stage === 'league').length;

  // The league phase must always allow the user to play all 8 fixtures.
  // Previously, after Round 7 management advanced season.round to 8, this
  // function completed the league phase too early because round === maxLeagueRounds.
  // That blocked underdog teams such as Bodo/Glimt from playing Matchday 8
  // even if their qualification status was already mathematically poor.
  if (userLeagueMatches < season.maxLeagueRounds) return false;

  completeLeaguePhase(season);
  return true;
}

export function completeLeaguePhase(season) {
  if (!season || season.leagueCompleted) return season;
  const ranked = rankedStandings(season.standings);
  const user = ranked.find(r => r.teamId === season.userTeamId);
  season.leagueRank = user?.rank;
  season.leagueZone = user?.zone;
  season.leagueCompleted = true;
  season.round = season.maxLeagueRounds;

  if (!user || user.rank > 24) {
    season.completed = true;
    season.finish = 'league_eliminated';
    season.stage = 'ended';
    season.knockout = { playoffPairs: generatePlayoffPairObjects(ranked), playoffReports: [] };
    return season;
  }

  const playoffPairs = generatePlayoffPairObjects(ranked);
  const userInPlayoff = user.rank >= 9 && user.rank <= 24;
  const simulatedPlayoff = simulatePlayoffPairs(playoffPairs, season.userTeamId);

  if (user.rank <= 8) {
    const opponentId = pickBalancedOpponent(simulatedPlayoff.winnerIds, season.userTeamId, season.knockout?.usedOpponentIds || []);
    season.stage = 'r16';
    season.knockout = {
      currentRound: 'r16',
      currentFixture: makeKnockoutFixture('r16', opponentId, false, 1),
      playoffPairs,
      playoffReports: simulatedPlayoff.reports,
      remainingTeamIds: [...ranked.slice(0, 8).map(r => r.teamId), ...simulatedPlayoff.winnerIds],
      usedOpponentIds: [],
      bracketLog: [`联赛阶段第 ${user.rank} 名，直接进入 16 强。`, '附加赛已由系统模拟完成。']
    };
    return season;
  }

  const pair = playoffPairs.find(p => p.seeded.teamId === user.teamId || p.unseeded.teamId === user.teamId);
  const opponentId = pair?.seeded.teamId === user.teamId ? pair.unseeded.teamId : pair?.seeded.teamId;
  season.stage = 'playoff';
  season.knockout = {
    currentRound: 'playoff',
    currentFixture: makeKnockoutFixture('playoff', opponentId, user.rank > 16, 1),
    playoffPairs,
    playoffReports: simulatedPlayoff.reports,
    remainingTeamIds: [...ranked.slice(0, 8).map(r => r.teamId), ...simulatedPlayoff.winnerIds.filter(id => id !== season.userTeamId)],
    usedOpponentIds: [],
    bracketLog: [`联赛阶段第 ${user.rank} 名，进入淘汰赛附加赛。`]
  };
  return season;
}

function makeKnockoutFixture(stage, opponentId, home, leg = 1, aggregate = null) {
  const totalLegs = stage === 'final' ? 1 : 2;
  return { round: stage, stage, opponentId, home, knockout: true, label: knockoutLabel(stage), leg, totalLegs, aggregate };
}

function knockoutLabel(stage) {
  return { playoff: '淘汰赛附加赛', r16: '16 强', qf: '8 强', sf: '半决赛', final: '决赛' }[stage] || stage;
}

function generatePlayoffPairObjects(ranked) {
  const byRank = (rank) => ranked.find(r => r.rank === rank);
  const groups = [[[9,10],[23,24]], [[11,12],[21,22]], [[13,14],[19,20]], [[15,16],[17,18]]];
  const pairs = [];
  for (const [seedRanks, unseedRanks] of groups) {
    const seeded = seedRanks.map(byRank).filter(Boolean);
    const unseeded = unseedRanks.map(byRank).filter(Boolean).reverse();
    seeded.forEach((s, i) => {
      if (s && unseeded[i]) pairs.push({ stage: 'playoff', seeded: s, unseeded: unseeded[i] });
    });
  }
  return pairs;
}

function simulatePlayoffPairs(pairs, userTeamId) {
  const reports = [];
  const winnerIds = [];
  for (const pair of pairs) {
    if (pair.seeded.teamId === userTeamId || pair.unseeded.teamId === userTeamId) continue;
    const seededTeam = getTeamById(pair.seeded.teamId);
    const unseededTeam = getTeamById(pair.unseeded.teamId);
    const leg1 = quickSim(unseededTeam, seededTeam);
    const leg2 = quickSim(seededTeam, unseededTeam);
    const seededAgg = leg1.away + leg2.home;
    const unseededAgg = leg1.home + leg2.away;
    let winner = seededAgg >= unseededAgg ? seededTeam : unseededTeam;
    if (seededAgg === unseededAgg && Math.random() < .42) winner = unseededTeam;
    winnerIds.push(winner.id);
    reports.push(`${seededTeam.zhName || seededTeam.name} 总比分 ${seededAgg}-${unseededAgg} ${unseededTeam.zhName || unseededTeam.name}，${winner.zhName || winner.name} 晋级。`);
  }
  return { reports, winnerIds };
}

function pickBalancedOpponent(candidateIds, userTeamId, usedIds = []) {
  const user = getTeamById(userTeamId);
  const candidates = candidateIds
    .filter(id => id && id !== userTeamId && !usedIds.includes(id))
    .map(id => getTeamById(id))
    .filter(Boolean);
  if (!candidates.length) {
    return shuffle(TEAMS.filter(t => t.id !== userTeamId && !usedIds.includes(t.id))).at(0)?.id;
  }
  const userAvg = teamAverage(user, true);
  const sorted = candidates.sort((a, b) => Math.abs(teamAverage(a, true) - userAvg) - Math.abs(teamAverage(b, true) - userAvg));
  return shuffle(sorted.slice(0, Math.min(4, sorted.length)))[0].id;
}

export function processKnockoutResult(season, match) {
  const stage = match.stage;
  const fixture = match.fixture || {};
  const opp = getTeamById(match.opponentId);
  if (!season.knockout) season.knockout = { usedOpponentIds: [], bracketLog: [], remainingTeamIds: [] };
  season.knockout.usedOpponentIds = season.knockout.usedOpponentIds || [];
  season.knockout.bracketLog = season.knockout.bracketLog || [];

  const isFinal = stage === 'final' || fixture.totalLegs === 1;
  if (!isFinal && fixture.leg === 1) {
    const aggregate = {
      user: match.score.user,
      opponent: match.score.opponent,
      leg1: { user: match.score.user, opponent: match.score.opponent, home: fixture.home }
    };
    season.knockout.bracketLog.push(`${knockoutLabel(stage)}首回合：${season.userTeamZhName || season.userTeamName} ${match.score.user}-${match.score.opponent} ${opp.zhName || opp.name}，总比分暂为 ${aggregate.user}-${aggregate.opponent}。`);
    season.knockout.currentFixture = makeKnockoutFixture(stage, match.opponentId, !fixture.home, 2, aggregate);
    return season;
  }

  let userWon = false;
  let logSuffix = '';
  if (!isFinal && fixture.leg === 2) {
    const before = fixture.aggregate || { user: 0, opponent: 0 };
    const aggregate = {
      user: before.user + match.score.user,
      opponent: before.opponent + match.score.opponent,
      leg1: before.leg1 || null,
      leg2: { user: match.score.user, opponent: match.score.opponent, home: fixture.home }
    };
    if (aggregate.user !== aggregate.opponent) {
      userWon = aggregate.user > aggregate.opponent;
      match.knockoutWinner = userWon ? 'user' : 'opponent';
      logSuffix = `总比分 ${aggregate.user}-${aggregate.opponent}`;
    } else {
      const tie = resolveAggregateTie(season, match, opp);
      userWon = tie.userWon;
      logSuffix = `总比分 ${aggregate.user}-${aggregate.opponent}，${tie.text}`;
    }
    match.aggregate = aggregate;
    season.knockout.bracketLog.push(`${knockoutLabel(stage)}次回合：${season.userTeamZhName || season.userTeamName} ${match.score.user}-${match.score.opponent} ${opp.zhName || opp.name}，${logSuffix}，${userWon ? '晋级' : '出局'}。`);
  } else {
    if (match.score.user !== match.score.opponent) {
      userWon = match.score.user > match.score.opponent;
      match.knockoutWinner = userWon ? 'user' : 'opponent';
      logSuffix = '决赛常规时间决出胜负';
    } else {
      const tie = resolveAggregateTie(season, match, opp, true);
      userWon = tie.userWon;
      logSuffix = tie.text;
    }
    season.knockout.bracketLog.push(`${knockoutLabel(stage)}：${season.userTeamZhName || season.userTeamName} ${match.score.user}-${match.score.opponent} ${opp.zhName || opp.name}，${logSuffix}，${userWon ? '夺冠' : '出局'}。`);
  }

  if (!userWon) {
    season.completed = true;
    season.finish = `${stage}_eliminated`;
    season.stage = 'ended';
    season.knockout.currentFixture = null;
    return season;
  }

  if (stage === 'final') {
    season.completed = true;
    season.finish = 'champion';
    season.stage = 'champion';
    season.knockout.currentFixture = null;
    season.knockout.bracketLog.push('你赢得了欧冠冠军。');
    return season;
  }

  const next = nextStage(stage);
  let candidates = season.knockout.remainingTeamIds || [];
  if (!candidates.length) candidates = TEAMS.map(t => t.id).filter(id => id !== season.userTeamId);
  season.knockout.usedOpponentIds.push(match.opponentId);
  const nextOpponentId = pickBalancedOpponent(candidates, season.userTeamId, season.knockout.usedOpponentIds);
  season.stage = next;
  season.knockout.currentRound = next;
  season.knockout.currentFixture = makeKnockoutFixture(next, nextOpponentId, next === 'final', 1);
  season.knockout.remainingTeamIds = candidates.filter(id => id !== nextOpponentId && id !== match.opponentId);
  return season;
}

function resolveAggregateTie(season, match, opp, final = false) {
  const userTeam = getTeamById(season.userTeamId);
  const userPower = teamAverage(userTeam, true) + (userTeam.hidden?.europeanTemperament || 6) * .4;
  const oppPower = teamAverage(opp, true) + (opp.hidden?.europeanTemperament || 6) * .4;
  const extraChance = Math.max(.18, Math.min(.42, .30 + (userPower - oppPower) * .018));
  if (Math.random() < extraChance) {
    match.knockoutWinner = 'user';
    match.extraTime = { winner: 'user' };
    return { userWon: true, text: `${final ? '决赛' : '两回合'}战平后加时赛取胜` };
  }
  if (Math.random() > .72) {
    match.knockoutWinner = 'opponent';
    match.extraTime = { winner: 'opponent' };
    return { userWon: false, text: `${final ? '决赛' : '两回合'}战平后加时赛失利` };
  }
  const userPenalty = Math.random() + (userPower - oppPower) * .015;
  const userWon = userPenalty >= .46;
  match.knockoutWinner = userWon ? 'user' : 'opponent';
  match.penalty = { user: userWon ? randomInt(4, 6) : randomInt(2, 4), opponent: userWon ? randomInt(2, 4) : randomInt(4, 6), winner: match.knockoutWinner };
  return { userWon, text: `加时仍平，点球大战 ${match.penalty.user}-${match.penalty.opponent}` };
}

function nextStage(stage) {
  return { playoff: 'r16', r16: 'qf', qf: 'sf', sf: 'final' }[stage] || 'final';
}
