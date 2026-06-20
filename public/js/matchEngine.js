import { getTeamById } from '../data/teamsData.js';
import { FORMATIONS, TACTIC_GROUPS } from '../data/tacticsData.js';
import { EVENT_TEMPLATES, CRITICAL_MOMENT_TEMPLATES } from '../data/eventTemplates.js';
import { effectSummary } from '../data/labelData.js';
import { clamp, countTrait, sumEffects, teamAverage, uid, sample } from './utils.js';

export function createMatch(season, fixture, tactics) {
  const userTeam = getTeamById(season.userTeamId);
  const opponent = getTeamById(fixture.opponentId);
  const homeTeam = fixture.home ? userTeam : opponent;
  const awayTeam = fixture.home ? opponent : userTeam;
  return {
    id: uid('match'),
    round: season.stage === 'league' ? season.round : fixture.round,
    stage: season.stage,
    fixture,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    userTeamId: userTeam.id,
    opponentId: opponent.id,
    score: { user: 0, opponent: 0 },
    xg: { user: 0, opponent: 0 },
    resolvedXg: { user: 0, opponent: 0 },
    tactics,
    halftime: null,
    eventIndex: 0,
    phase: 'first_half',
    eventPlan: buildEventPlan(),
    halftimeDone: false,
    injuries: [],
    choices: [],
    timeline: [],
    goals: [],
    completed: false,
    knockoutWinner: null,
    penalty: null
  };
}

function buildEventPlan() {
  const shuffled = [...EVENT_TEMPLATES].sort(() => Math.random() - .5).slice(0, 7);
  const regularMinutes = [12, 27, 42, 55, 66, 78, 86];
  const regularEvents = shuffled.map((e, i) => ({ ...e, minute: regularMinutes[i], isCritical: false }));
  const criticalTemplate = sample(CRITICAL_MOMENT_TEMPLATES);
  const criticalMinute = sample([18, 34, 51, 73, 88]);
  const criticalEvent = { ...criticalTemplate, minute: criticalMinute, isCritical: true };
  return [...regularEvents, criticalEvent].sort((a, b) => a.minute - b.minute);
}

export function baseTeamPower(team, tactics = {}) {
  const avg = teamAverage(team, true);
  const hidden = team.hidden || {};
  return avg + (hidden.tacticalExecution || 6) * .35 + (hidden.europeanTemperament || 6) * .2 + countTrait(team, 'big_game') * .35;
}

export function tacticEffects(tactics) {
  const parts = [FORMATIONS[tactics.formation]?.effects];
  for (const [group, id] of Object.entries(tactics)) {
    if (group === 'formation') continue;
    parts.push(TACTIC_GROUPS[group]?.options?.[id]?.effects);
  }
  return sumEffects(...parts);
}


function updateMatchPhase(match) {
  const next = match.eventPlan[match.eventIndex];
  if (!next) {
    match.phase = 'fulltime';
    return;
  }
  if (!match.halftimeDone && next.minute > 45) {
    match.phase = 'halftime';
    return;
  }
  match.phase = next.minute <= 45 ? 'first_half' : 'second_half';
}

export function applyEventChoice(match, optionIndex) {
  const event = match.eventPlan[match.eventIndex];
  if (!event) return null;
  const option = event.options[optionIndex];
  const userTeam = getTeamById(match.userTeamId);
  const opponent = getTeamById(match.opponentId);
  const effects = { ...option.effects };
  applyTraitSynergy(effects, option.tags || [], userTeam);

  const userDelta = calculateXgDelta(effects, userTeam, opponent) * (event.isCritical ? 1.25 : 1);
  const oppDelta = calculateOpponentDelta(effects, opponent, userTeam) * (event.isCritical ? 1.25 : 1);
  match.xg.user += userDelta;
  match.xg.opponent += oppDelta;
  match.resolvedXg.user += userDelta;
  match.resolvedXg.opponent += oppDelta;

  const goals = [];
  const extraNotes = [];
  let resultText = `${event.isCritical ? '关键时刻' : '选择'}：${option.text}`;
  const xgText = `xG变化：你 +${userDelta.toFixed(2)} / 对手 +${oppDelta.toFixed(2)}`;

  if (event.isCritical) {
    resolveCriticalMoment(match, event, option, effects, goals, extraNotes, userTeam, opponent);
  } else {
    const userGoalRolled = rollEventGoal(userDelta, effects.instantGoalChance || 0, userTeam, true);
    const oppGoalRolled = rollEventGoal(oppDelta, effects.instantConcedeChance || 0, opponent, false);
    if (userGoalRolled) goals.push(recordGoal(match, 'user', userTeam, event.minute, event.title, option.tags || []));
    if (oppGoalRolled) goals.push(recordGoal(match, 'opponent', opponent, event.minute + (userGoalRolled ? 1 : 0), event.title, option.tags || []));
  }

  if (goals.length) {
    const goalText = goals.map(g => `⚽ ${g.minute}' ${g.scorerZhName}（${g.teamName}）`).join('；');
    resultText += ` 结果：${goalText}。${extraNotes.join(' ')}${xgText}。`;
  } else {
    const note = extraNotes.length ? `${extraNotes.join(' ')} ` : '机会已经形成，但这次没有改写比分。';
    resultText += ` 结果：${note}${xgText}。`;
  }

  const record = {
    minute: event.minute,
    eventId: event.id,
    title: event.title,
    type: event.type,
    isCritical: !!event.isCritical,
    criticalKind: event.criticalKind || null,
    optionText: option.text,
    tags: option.tags || [],
    effects,
    userDelta,
    oppDelta,
    goals,
    injuries: extraNotes.filter(x => x.includes('伤退') || x.includes('受伤')),
    score: { ...match.score },
    resultText,
    effectText: effectSummary(effects)
  };
  match.choices.push(record);
  match.timeline.push(record);
  match.eventIndex += 1;
  updateMatchPhase(match);
  return record;
}

function resolveCriticalMoment(match, event, option, effects, goals, extraNotes, userTeam, opponent) {
  const kind = event.criticalKind;
  if (kind === 'one_on_one_for') {
    const chance = criticalChance(.48, effects.instantGoalChance || 0, userTeam, ['elite_finisher','finisher','big_game','composure']);
    if (Math.random() < chance) goals.push(recordGoal(match, 'user', userTeam, event.minute, '单刀破门', option.tags || ['elite_finisher']));
    else extraNotes.push('单刀机会被门将化解。');
    return;
  }
  if (kind === 'one_on_one_against') {
    const saveBonus = countTrait(userTeam, 'elite_shot_stopper') * .08 + countTrait(userTeam, 'shot_stopper') * .035 + countTrait(userTeam, 'pace_defender') * .02;
    const concedeChance = clamp(.50 + (effects.instantConcedeChance || 0) * .018 - saveBonus - Math.max(0, effects.defensiveStability || 0) * .025, .12, .78);
    if (Math.random() < concedeChance) goals.push(recordGoal(match, 'opponent', opponent, event.minute, '单刀破门', ['elite_finisher','pace']));
    else extraNotes.push('门将或回追后卫完成关键化解。');
    return;
  }
  if (kind === 'penalty_for') {
    const chance = criticalChance(.68, effects.instantGoalChance || 0, userTeam, ['elite_finisher','finisher','big_game','composure','mentality']);
    if (Math.random() < chance) goals.push(recordGoal(match, 'user', userTeam, event.minute, '点球命中', ['penalty','elite_finisher','big_game']));
    else extraNotes.push('点球被扑出或偏出。');
    return;
  }
  if (kind === 'penalty_against') {
    const saveBonus = countTrait(userTeam, 'elite_shot_stopper') * .09 + countTrait(userTeam, 'shot_stopper') * .04 + countTrait(userTeam, 'big_game') * .01;
    const concedeChance = clamp(.72 + (effects.instantConcedeChance || 0) * .011 - saveBonus - Math.max(0, effects.defensiveStability || 0) * .018, .30, .88);
    if (Math.random() < concedeChance) goals.push(recordGoal(match, 'opponent', opponent, event.minute, '点球命中', ['penalty','big_game']));
    else extraNotes.push('门将完成点球扑救！');
    return;
  }
  if (kind === 'key_injury') {
    const injured = pickImportantPlayer(userTeam);
    const injury = { minute: event.minute, playerName: injured.name, playerZhName: injured.zhName || injured.name, teamId: userTeam.id, optionText: option.text };
    match.injuries.push(injury);
    extraNotes.push(`${injury.playerZhName} 伤退，已按你的选择完成调整。`);
    const chaosChance = option.tags?.includes('risk') ? .18 : .07;
    if (Math.random() < chaosChance) {
      goals.push(recordGoal(match, 'opponent', opponent, event.minute + 2, '伤退后的短暂混乱', ['risk']));
    }
  }
}

function criticalChance(base, instantChance, team, traits = []) {
  let bonus = Math.max(0, instantChance) * .012;
  for (const trait of traits) bonus += countTrait(team, trait) * .012;
  bonus += (team.hidden?.europeanTemperament || 6) * .006;
  return clamp(base + bonus, .08, .92);
}

function pickImportantPlayer(team) {
  const candidates = team.squad
    .filter(p => p.position !== 'GK')
    .sort((a, b) => (b.ovr || 0) - (a.ovr || 0));
  return sample(candidates.slice(0, Math.min(6, candidates.length))) || candidates[0] || team.squad[0];
}

function applyTraitSynergy(effects, tags, team) {
  if (tags.includes('big_game') && countTrait(team, 'big_game') > 0) effects.chanceQuality = (effects.chanceQuality || 0) + 1;
  if (tags.includes('wide_creator') && countTrait(team, 'wide_creator') > 0) effects.chanceCreation = (effects.chanceCreation || 0) + 2;
  if (tags.includes('aerial') && countTrait(team, 'aerial') > 0) effects.setPieceAttack = (effects.setPieceAttack || 0) + 1;
  if (tags.includes('duel_winner') && countTrait(team, 'duel_winner') > 0) {
    effects.setPieceDefense = (effects.setPieceDefense || 0) + 1;
    effects.setPieceAttack = (effects.setPieceAttack || 0) + 1;
  }
  if (tags.includes('pace') && countTrait(team, 'pace') > 0) effects.transitionAttack = (effects.transitionAttack || 0) + 1;
  if (tags.includes('mobile_forward') && (countTrait(team, 'mobile_forward') > 0 || countTrait(team, 'dribbler') > 1)) effects.chanceQuality = (effects.chanceQuality || 0) + 1;
  if (tags.includes('tempo_controller') && countTrait(team, 'tempo_controller') > 0) effects.control = (effects.control || 0) + 1;
  if (tags.includes('counter_press') && (countTrait(team, 'pressing') > 1 || countTrait(team, 'pressing_forward') > 0)) {
    effects.pressIntensity = (effects.pressIntensity || 0) + 1;
    effects.chanceCreation = (effects.chanceCreation || 0) + 1;
  }
  if (tags.includes('aggressive_defense') && (countTrait(team, 'duel') > 2 || countTrait(team, 'duel_winner') > 0)) effects.defensiveStability = (effects.defensiveStability || 0) + 1;
  if (tags.includes('endurance_engine') && countTrait(team, 'endurance_engine') > 0) effects.control = (effects.control || 0) + 1;
}

function calculateXgDelta(effects, userTeam, opponent) {
  const attack = (effects.chanceCreation || 0) * .045 + (effects.chanceQuality || 0) * .06 + (effects.transitionAttack || 0) * .045 + (effects.setPieceAttack || 0) * .035;
  const power = (baseTeamPower(userTeam) - baseTeamPower(opponent)) * .012;
  return clamp(.05 + attack + power, 0, .55);
}

function calculateOpponentDelta(effects, opponent, userTeam) {
  const risk = (effects.counterRisk || 0) * .045 + Math.max(0, -(effects.defensiveStability || 0)) * .05 + (effects.instantConcedeChance || 0) * .008;
  const protection = (effects.defensiveStability || 0) * .025 + (effects.setPieceDefense || 0) * .02;
  const power = (baseTeamPower(opponent) - baseTeamPower(userTeam)) * .009;
  return clamp(.04 + risk - protection + power, 0, .50);
}

function rollEventGoal(xgDelta, instantChance, team, user) {
  const finisherBonus = countTrait(team, 'elite_finisher') * .018 + countTrait(team, 'finisher') * .011 + countTrait(team, 'finishing') * .008;
  const momentBonus = countTrait(team, 'big_game') * .007 + countTrait(team, 'composure') * .004;
  const xgChance = 1 - Math.exp(-Math.max(0, xgDelta) * 1.15);
  const instantBoost = Math.max(0, instantChance) * .011;
  const chance = clamp(xgChance + instantBoost + finisherBonus + momentBonus, .012, user ? .62 : .56);
  return Math.random() < chance;
}

function recordGoal(match, side, team, minute, source, tags = []) {
  const scorer = pickScorer(team, tags);
  match.score[side] += 1;
  const goal = {
    minute,
    side,
    teamId: team.id,
    teamName: team.zhName || team.name,
    scorerName: scorer.name,
    scorerZhName: scorer.zhName || scorer.name,
    source,
    score: { ...match.score }
  };
  match.goals.push(goal);
  return goal;
}

function pickScorer(team, tags = []) {
  const attackers = team.squad.filter(p => p.position !== 'GK');
  const weighted = [];
  for (const player of attackers) {
    let weight = 1;
    const pos = player.position || '';
    const traits = player.traits || [];
    if (tags.includes('penalty') && (traits.includes('elite_finisher') || traits.includes('finisher') || traits.includes('composure') || traits.includes('big_game'))) weight += 12;
    if (/ST|CF/.test(pos)) weight += 7;
    if (/LW|RW|W|AM/.test(pos)) weight += 5;
    if (/CM|DM/.test(pos)) weight += 2;
    if (/CB|LB|RB/.test(pos)) weight += tags.includes('aerial') || tags.includes('duel_winner') ? 3 : .5;
    if (traits.includes('elite_finisher')) weight += 8;
    if (traits.includes('finisher') || traits.includes('finishing')) weight += 5;
    if (traits.includes('inside_forward') || traits.includes('mobile_forward') || traits.includes('off_ball')) weight += 3;
    if (traits.includes('aerial') && (tags.includes('aerial') || tags.includes('duel_winner'))) weight += 4;
    if (traits.includes('set_piece_threat')) weight += 3;
    for (let i = 0; i < Math.max(1, Math.round(weight)); i++) weighted.push(player);
  }
  return sample(weighted.length ? weighted : attackers) || team.squad.find(p => p.position !== 'GK') || team.squad[0];
}

export function applyHalftime(match, command, tweakEffects = {}) {
  match.halftime = { command, tweakEffects };
  match.halftimeDone = true;
  match.timeline.push({ minute: 45, title: '中场调整', type: '中场', optionText: command, effects: tweakEffects, score: { ...match.score }, resultText: `中场选择：${command}` });
  updateMatchPhase(match);
}

export function finalizeMatch(match) {
  if (match.completed) return match;
  const userTeam = getTeamById(match.userTeamId);
  const opponent = getTeamById(match.opponentId);
  const tactic = tacticEffects(match.tactics);
  const userBase = .50 + (baseTeamPower(userTeam, match.tactics) - baseTeamPower(opponent)) * .023 + (tactic.chanceCreation || 0) * .022 + (tactic.chanceQuality || 0) * .030;
  const oppBase = .50 + (baseTeamPower(opponent) - baseTeamPower(userTeam, match.tactics)) * .019 + Math.max(0, tactic.counterRisk || 0) * .026 - Math.max(0, tactic.defensiveStability || 0) * .023;
  const lateUserXg = clamp(userBase + Math.random() * .32, 0, .85);
  const lateOppXg = clamp(oppBase + Math.random() * .32, 0, .80);
  match.xg.user = clamp(match.xg.user + lateUserXg, 0.2, 4.2);
  match.xg.opponent = clamp(match.xg.opponent + lateOppXg, 0.1, 4.0);
  const userGoals = goalsFromXg(lateUserXg);
  const oppGoals = goalsFromXg(lateOppXg);
  const lateGoals = [];
  for (let i = 0; i < userGoals; i++) lateGoals.push(recordGoal(match, 'user', userTeam, 88 + i * 2, '终场阶段自然演化'));
  for (let i = 0; i < oppGoals; i++) lateGoals.push(recordGoal(match, 'opponent', opponent, 89 + i * 2, '终场阶段自然演化'));

  const goalText = lateGoals.length ? ` 终场阶段进球：${lateGoals.map(g => `${g.minute}' ${g.scorerZhName}`).join('；')}。` : '';
  match.timeline.push({
    minute: 90,
    title: '终场补充结算',
    type: '完场',
    optionText: '比赛最后阶段自然演化',
    effects: {},
    goals: lateGoals,
    score: { ...match.score },
    resultText: `终场阶段补充 xG：你 +${lateUserXg.toFixed(2)} / 对手 +${lateOppXg.toFixed(2)}。${goalText} 当前比分 ${match.score.user}-${match.score.opponent}。`
  });

  if (match.stage !== 'league') resolveKnockoutDraw(match, userTeam, opponent);
  match.completed = true;
  match.phase = 'done';
  return match;
}

function resolveKnockoutDraw(match, userTeam, opponent) {
  if (match.score.user !== match.score.opponent) {
    match.knockoutWinner = match.score.user > match.score.opponent ? 'user' : 'opponent';
    return;
  }
  const extraRoll = Math.random();
  if (extraRoll < .22) {
    const goal = recordGoal(match, 'user', userTeam, 107, '加时赛');
    match.timeline.push({ minute: 120, title: '加时赛', type: '加时', goals: [goal], score: { ...match.score }, resultText: `加时赛中 ${goal.scorerZhName} 打入制胜球。` });
    match.knockoutWinner = 'user';
    return;
  }
  if (extraRoll > .78) {
    const goal = recordGoal(match, 'opponent', opponent, 111, '加时赛');
    match.timeline.push({ minute: 120, title: '加时赛', type: '加时', goals: [goal], score: { ...match.score }, resultText: `加时赛中 ${goal.scorerZhName} 为对手打入制胜球。` });
    match.knockoutWinner = 'opponent';
    return;
  }
  const penalty = simulatePenalty(userTeam, opponent);
  match.penalty = penalty;
  match.knockoutWinner = penalty.winner;
  match.timeline.push({ minute: 120, title: '点球大战', type: '点球', score: { ...match.score }, resultText: `120 分钟仍未分胜负，点球大战 ${penalty.user}-${penalty.opponent}，${penalty.winner === 'user' ? '你晋级' : '对手晋级'}。` });
}

function simulatePenalty(userTeam, opponent) {
  let user = 0, opponentGoals = 0;
  const userChance = clamp(.73 + countTrait(userTeam, 'big_game') * .012 + countTrait(userTeam, 'elite_finisher') * .018 - countTrait(opponent, 'elite_shot_stopper') * .025, .56, .89);
  const oppChance = clamp(.72 + countTrait(opponent, 'big_game') * .012 + countTrait(opponent, 'elite_finisher') * .018 - countTrait(userTeam, 'elite_shot_stopper') * .025, .54, .88);
  for (let i = 0; i < 5; i++) {
    if (Math.random() < userChance) user++;
    if (Math.random() < oppChance) opponentGoals++;
  }
  let guard = 0;
  while (user === opponentGoals && guard < 8) {
    if (Math.random() < userChance) user++;
    if (Math.random() < oppChance) opponentGoals++;
    guard++;
  }
  return { user, opponent: opponentGoals, winner: user >= opponentGoals ? 'user' : 'opponent' };
}

function goalsFromXg(xg) {
  let goals = 0;
  let remaining = xg;
  while (remaining > 0) {
    const p = Math.min(.65, remaining / 2.9);
    if (Math.random() < p) goals++;
    remaining -= .85;
  }
  return clamp(goals, 0, 4);
}

export function matchOutcome(match) {
  if (match.knockoutWinner) return match.knockoutWinner === 'user' ? 'win' : 'loss';
  if (match.score.user > match.score.opponent) return 'win';
  if (match.score.user < match.score.opponent) return 'loss';
  return 'draw';
}
