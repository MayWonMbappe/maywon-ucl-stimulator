import { getTeamById } from '../data/teamsData.js';
import { FORMATIONS, TACTIC_GROUPS } from '../data/tacticsData.js';
import { EVENT_TEMPLATES } from '../data/eventTemplates.js';
import { clamp, countTrait, sumEffects, teamAverage, uid } from './utils.js';

export function createMatch(season, fixture, tactics) {
  const userTeam = getTeamById(season.userTeamId);
  const opponent = getTeamById(fixture.opponentId);
  const homeTeam = fixture.home ? userTeam : opponent;
  const awayTeam = fixture.home ? opponent : userTeam;
  return {
    id: uid('match'), round: season.round, stage: season.stage, fixture, homeTeamId: homeTeam.id, awayTeamId: awayTeam.id,
    userTeamId: userTeam.id, opponentId: opponent.id,
    score: { user: 0, opponent: 0 }, xg: { user: 0, opponent: 0 },
    tactics, halftime: null, eventIndex: 0, phase: 'first_half',
    eventPlan: buildEventPlan(), choices: [], timeline: [], completed: false
  };
}
function buildEventPlan() {
  const shuffled = [...EVENT_TEMPLATES].sort(() => Math.random() - .5).slice(0, 7);
  const minutes = [12, 27, 42, 55, 66, 78, 86];
  return shuffled.map((e, i) => ({ ...e, minute: minutes[i] }));
}
export function baseTeamPower(team, tactics = {}) {
  const starters = team.squad.filter(p => p.isStarter);
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
export function applyEventChoice(match, optionIndex) {
  const event = match.eventPlan[match.eventIndex];
  if (!event) return null;
  const option = event.options[optionIndex];
  const userTeam = getTeamById(match.userTeamId);
  const opponent = getTeamById(match.opponentId);
  const effects = { ...option.effects };
  applyTraitSynergy(effects, option.tags || [], userTeam);
  const userDelta = calculateXgDelta(effects, userTeam, opponent);
  const oppDelta = calculateOpponentDelta(effects, opponent, userTeam);
  match.xg.user += userDelta;
  match.xg.opponent += oppDelta;
  const instantUser = rollInstantGoal(effects.instantGoalChance || 0, userTeam, true);
  const instantOpp = rollInstantGoal(effects.instantConcedeChance || 0, opponent, false);
  let resultText = `选择：${option.text}`;
  if (instantUser) { match.score.user += 1; resultText += ' 结果：你的调整立刻制造进球！'; }
  else if (instantOpp) { match.score.opponent += 1; resultText += ' 结果：对手抓住风险完成破门。'; }
  else resultText += ' 结果：局势权重发生变化，比分暂未改写。';
  const record = { minute: event.minute, eventId: event.id, title: event.title, type: event.type, optionText: option.text, effects, userDelta, oppDelta, score: { ...match.score }, resultText };
  match.choices.push(record);
  match.timeline.push(record);
  match.eventIndex += 1;
  match.phase = match.eventIndex <= 2 ? 'first_half' : match.eventIndex === 3 ? 'halftime' : match.eventIndex < 7 ? 'second_half' : 'fulltime';
  return record;
}
function applyTraitSynergy(effects, tags, team) {
  if (tags.includes('big_game') && countTrait(team, 'big_game') > 0) effects.chanceQuality = (effects.chanceQuality || 0) + 1;
  if (tags.includes('wide_creator') && countTrait(team, 'wide_creator') > 0) effects.chanceCreation = (effects.chanceCreation || 0) + 2;
  if (tags.includes('aerial') && countTrait(team, 'aerial') > 0) effects.setPieceAttack = (effects.setPieceAttack || 0) + 1;
  if (tags.includes('duel_winner') && countTrait(team, 'duel_winner') > 0) effects.setPieceDefense = (effects.setPieceDefense || 0) + 1;
  if (tags.includes('pace') && countTrait(team, 'pace') > 0) effects.transitionAttack = (effects.transitionAttack || 0) + 1;
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
function rollInstantGoal(chance, team, user) {
  const bonus = countTrait(team, 'elite_finisher') * 1.2 + countTrait(team, 'big_game') * .5;
  return Math.random() * 100 < (chance + bonus) * .45;
}
export function applyHalftime(match, command, tweakEffects = {}) {
  match.halftime = { command, tweakEffects };
  match.timeline.push({ minute: 45, title: '中场调整', type: '中场', optionText: command, effects: tweakEffects, score: { ...match.score }, resultText: `中场选择：${command}` });
  match.phase = 'second_half';
}
export function finalizeMatch(match) {
  const userTeam = getTeamById(match.userTeamId);
  const opponent = getTeamById(match.opponentId);
  const tactic = tacticEffects(match.tactics);
  const userBase = .55 + (baseTeamPower(userTeam, match.tactics) - baseTeamPower(opponent)) * .025 + (tactic.chanceCreation || 0) * .025 + (tactic.chanceQuality || 0) * .035;
  const oppBase = .55 + (baseTeamPower(opponent) - baseTeamPower(userTeam, match.tactics)) * .02 + Math.max(0, tactic.counterRisk || 0) * .03 - Math.max(0, tactic.defensiveStability || 0) * .025;
  match.xg.user = clamp(match.xg.user + userBase + Math.random() * .45, 0.2, 4.2);
  match.xg.opponent = clamp(match.xg.opponent + oppBase + Math.random() * .45, 0.1, 4.0);
  match.score.user += goalsFromXg(match.xg.user);
  match.score.opponent += goalsFromXg(match.xg.opponent);
  match.completed = true;
  match.phase = 'done';
  return match;
}
function goalsFromXg(xg) {
  let goals = 0;
  let remaining = xg;
  while (remaining > 0) {
    const p = Math.min(.72, remaining / 2.7);
    if (Math.random() < p) goals++;
    remaining -= .85;
  }
  return clamp(goals, 0, 5);
}
export function matchOutcome(match) {
  if (match.score.user > match.score.opponent) return 'win';
  if (match.score.user < match.score.opponent) return 'loss';
  return 'draw';
}
