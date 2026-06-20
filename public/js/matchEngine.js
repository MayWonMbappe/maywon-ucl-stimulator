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
    eventPlan: buildEventPlan(userTeam, opponent, season.playerStatus || {}),
    pendingResult: null,
    halftimeDone: false,
    opponentState: { centralLock: 0, wideTrap: 0, press: 0, counterThreat: 0, setPieceGuard: 0, fatigueTarget: 0, disciplineBait: 0 },
    playerStatus: season.playerStatus || {},
    yellowCards: {},
    cards: [],
    redCards: [],
    sentOff: {},
    injuries: [],
    choices: [],
    timeline: [],
    goals: [],
    completed: false,
    knockoutWinner: null,
    penalty: null
  };
}

function buildEventPlan(userTeam, opponent, playerStatus = {}) {
  const firstHalfPool = EVENT_TEMPLATES.filter(e => e.id !== 'FATIGUE_DROP');
  const secondHalfPool = EVENT_TEMPLATES;
  const firstHalf = shuffleLocal(firstHalfPool).slice(0, 3).map((e, i) => enrichEvent(e, [12, 27, 42][i], false, userTeam, opponent, playerStatus));
  const secondHalf = shuffleLocal(secondHalfPool).slice(0, 4).map((e, i) => {
    const minute = e.id === 'FATIGUE_DROP' ? sample([58, 64, 72, 82]) : [55, 66, 78, 86][i];
    return enrichEvent(e, minute, false, userTeam, opponent, playerStatus);
  });
  const criticalTemplate = sample(CRITICAL_MOMENT_TEMPLATES);
  const criticalMinute = sample([18, 34, 51, 73, 88]);
  const criticalEvent = enrichEvent(criticalTemplate, criticalMinute, true, userTeam, opponent, playerStatus);
  return [...firstHalf, ...secondHalf, criticalEvent].sort((a, b) => a.minute - b.minute);
}

function shuffleLocal(arr) { return [...arr].sort(() => Math.random() - .5); }

function enrichEvent(template, minute, isCritical, userTeam, opponent, playerStatus = {}) {
  const event = { ...template, minute, isCritical: !!isCritical };
  const userActor = pickScenePlayer(userTeam, template, true, playerStatus);
  const oppActor = pickScenePlayer(opponent, template, false);
  const supporting = pickScenePlayer(userTeam, { ...template, prefer: 'creator' }, true, playerStatus);
  const marker = pickScenePlayer(opponent, { ...template, prefer: 'defender' }, false);
  const names = {
    user: userActor?.zhName || userActor?.name || '我方球员',
    opponent: oppActor?.zhName || oppActor?.name || '对方球员',
    support: supporting?.zhName || supporting?.name || '队友',
    marker: marker?.zhName || marker?.name || '对方防守人'
  };
  const scene = sceneText(template, names, minute, isCritical);
  event.title = scene.title || template.title;
  event.desc = scene.desc || template.desc;
  event.actor = names;
  event.actorInfo = {
    user: userActor ? { name: userActor.name, zhName: userActor.zhName || userActor.name, position: userActor.position } : null,
    opponent: oppActor ? { name: oppActor.name, zhName: oppActor.zhName || oppActor.name, position: oppActor.position } : null,
    support: supporting ? { name: supporting.name, zhName: supporting.zhName || supporting.name, position: supporting.position } : null,
    marker: marker ? { name: marker.name, zhName: marker.zhName || marker.name, position: marker.position } : null
  };
  event.opponentAdjustment = null;
  return event;
}

function pickScenePlayer(team, template = {}, userSide = true, playerStatus = {}) {
  const squad = team.squad || [];
  const prefer = template.prefer || template.type || '';
  let candidates = squad.filter(p => p.isStarter && !playerStatus[p.name]?.suspended && !playerStatus[p.name]?.matchUnavailable);
  if (candidates.length < 11) {
    const bench = squad.filter(p => !p.isStarter && !playerStatus[p.name]?.suspended && !playerStatus[p.name]?.matchUnavailable);
    candidates = [...candidates, ...bench].slice(0, 11);
  }
  const by = (regex) => candidates.filter(p => regex.test(p.position || ''));
  let pool = [];
  if (/防守|单刀|黄牌|体能/.test(prefer) || template.criticalKind === 'one_on_one_against') pool = by(/GK|CB|LB|RB|DM/);
  if (/边路|传中|Wide|边/.test(prefer) || template.id === 'WIDE_OVERLOAD') pool = by(/LW|RW|LB|RB|W/);
  if (/中路|核心|组织|creator/.test(prefer) || template.id === 'CENTRAL_BLOCKED') pool = by(/AM|CM|DM|LW|RW/);
  if (/反击|单刀|点球/.test(prefer) || template.criticalKind === 'one_on_one_for' || template.criticalKind === 'penalty_for') pool = by(/ST|CF|LW|RW|AM/);
  if (/定位球|角球/.test(prefer) || template.id === 'SETPIECE_ATTACK') pool = by(/CB|ST|CF|DM/);
  if (!pool.length) pool = candidates.length ? candidates : squad.filter(p => !playerStatus[p.name]?.suspended && !playerStatus[p.name]?.matchUnavailable);
  return sample(pool) || squad[0];
}

function sceneText(template, n, minute, isCritical) {
  const id = template.id;
  const kind = template.criticalKind;
  if (kind === 'one_on_one_for') return { title: `${n.user} 获得单刀良机`, desc: `${minute}'，${n.support} 的直塞打穿防线，${n.user} 面对门将。对手替补席已经有人在热身，显然准备改变防线高度。` };
  if (kind === 'one_on_one_against') return { title: `${n.opponent} 反越位形成单刀`, desc: `${minute}'，对手一次直塞撕开防线，${n.opponent} 单刀冲向禁区。对手整体有收缩后反击的迹象，但具体意图仍不明朗。` };
  if (kind === 'penalty_for') return { title: `裁判判给你点球`, desc: `${minute}'，${n.user} 在禁区内被放倒，主裁指向点球点。对手门将拖延时间，试图干扰主罚者心态。` };
  if (kind === 'penalty_against') return { title: `对手获得点球`, desc: `${minute}'，禁区内一次身体接触后主裁判罚点球，${n.opponent} 站上十二码。对手替补席情绪高涨，但你只能通过经验判断他们的心理变化。` };
  if (kind === 'key_injury') return { title: `${n.user} 无法坚持比赛`, desc: `${minute}'，${n.user} 在一次对抗后倒地示意无法继续。对手看到你阵型被迫调整，开始尝试加快节奏。` };
  if (id === 'SETPIECE_ATTACK') return { title: `${n.user} 高高跃起争顶`, desc: `${minute}'，角球开到禁区，${n.user} 抢在${n.marker}身前起跳，皮球飞向危险区域。对手开始加强后点保护。` };
  if (id === 'FATIGUE_DROP') return { title: `${n.user} 和中前场体能明显下降`, desc: `${minute}'，连续冲刺后，${n.user} 回追速度下降，中场距离被拉开。对手似乎准备利用这一侧做文章。` };
  if (id === 'WIDE_OVERLOAD') return { title: `${n.user} 在边路制造人数优势`, desc: `${minute}'，${n.user} 与边后卫连续套边，${n.marker} 被迫一防二。对手边路开始回收，但中路保护可能出现空隙。` };
  if (id === 'COUNTER_CHANCE') return { title: `${n.user} 带出反击机会`, desc: `${minute}'，断球后${n.user}第一时间向前推进，${n.support} 正在身前斜插。对手中卫线一边后退一边招呼队友补位。` };
  if (id === 'CENTRAL_BLOCKED') return { title: `${n.user} 在中路被重点限制`, desc: `${minute}'，${n.user} 连续接球都被${n.marker}贴身干扰，中路推进被堵。对手正在压缩肋部空间。` };
  if (id === 'BUILD_PRESS') return { title: `${n.user} 后场出球遭遇压迫`, desc: `${minute}'，${n.user} 接球后立刻被逼抢，对手前场三人压上，试图迫使你长传。` };
  return { title: template.title.replace('你的', n.user), desc: `${minute}'，${template.desc} 对手也在做微调，但只能从站位变化看出大致方向。` };
}

function applyOpponentAdjustment(match, template, opponent) {
  const id = template.id || '';
  const plans = [
    { key: 'centralLock', weight: /CENTRAL|BUILD_PRESS|核心|中路/.test(id) ? 4 : 1, text: '对手中路距离明显收紧，开始切断你前腰与中锋之间的传球线。', effects: { centralLock: 1, counterThreat: 0.15 } },
    { key: 'wideTrap', weight: /WIDE|边路/.test(id) ? 4 : 1, text: '对手边路防守改成诱导式压迫，边后卫身后空间减少，但弱侧可能被放空。', effects: { wideTrap: 1, setPieceGuard: 0.1 } },
    { key: 'press', weight: /BUILD|COUNTER|后场/.test(id) ? 4 : 1, text: '对手第一道压迫提前，逼你更早处理球，后场失误风险上升。', effects: { press: 1, counterThreat: 0.2 } },
    { key: 'counterThreat', weight: /COUNTER|单刀|反击/.test(id) ? 4 : 1, text: '对手前场始终留下一名速度点，像是在等你压上后的转换机会。', effects: { counterThreat: 1 } },
    { key: 'setPieceGuard', weight: /SETPIECE|定位球/.test(id) ? 4 : 1, text: '对手开始把最高的中卫固定在后点区域，定位球二点保护更严密。', effects: { setPieceGuard: 1 } },
    { key: 'fatigueTarget', weight: /FATIGUE/.test(id) ? 5 : 1, text: '对手在你的体能薄弱侧连续转移，试图把比赛拖入高消耗节奏。', effects: { fatigueTarget: 1, press: 0.25 } },
    { key: 'disciplineBait', weight: /YELLOW|黄牌|防守/.test(id) ? 4 : 1, text: '对手开始用身体接触和小动作刺激你的防守球员，犯规风险被悄悄放大。', effects: { disciplineBait: 1 } },
    { key: 'centralLock', weight: 1, text: '对手站位变化很小，但你能感觉他们在优先压缩禁区弧顶区域。', effects: { centralLock: 0.6, setPieceGuard: 0.2 } },
    { key: 'wideTrap', weight: 1, text: '对手没有明显前压，只是把弱侧边锋回收到半空间，准备限制你的转移。', effects: { wideTrap: 0.6, counterThreat: 0.15 } }
  ];
  const weighted = [];
  for (const plan of plans) for (let i = 0; i < plan.weight; i++) weighted.push(plan);
  const picked = sample(weighted) || plans[0];
  if (!match.opponentState) match.opponentState = {};
  for (const [key, value] of Object.entries(picked.effects)) {
    match.opponentState[key] = clamp((match.opponentState[key] || 0) + value, 0, 3);
  }
  return picked;
}

function decayOpponentState(match) {
  if (!match.opponentState) return;
  for (const key of Object.keys(match.opponentState)) match.opponentState[key] = Math.max(0, match.opponentState[key] * 0.72);
}


export function ensureCurrentEventPlayable(match) {
  const event = match?.eventPlan?.[match.eventIndex];
  if (!event || !event.actorInfo?.user) return event;
  const status = match.playerStatus || {};
  const currentName = event.actorInfo.user.name;
  if (!match.sentOff?.[currentName] && !status[currentName]?.suspended && !status[currentName]?.matchUnavailable) return event;
  const userTeam = getTeamById(match.userTeamId);
  const opponent = getTeamById(match.opponentId);
  const replacement = pickScenePlayer(userTeam, event, true, status);
  if (!replacement) return event;
  const supporting = pickScenePlayer(userTeam, { ...event, prefer: 'creator' }, true, status);
  const marker = pickScenePlayer(opponent, { ...event, prefer: 'defender' }, false);
  const names = {
    user: replacement.zhName || replacement.name,
    opponent: event.actor?.opponent || '对方球员',
    support: supporting?.zhName || supporting?.name || '队友',
    marker: marker?.zhName || marker?.name || '对方防守人'
  };
  const scene = sceneText(event, names, event.minute, event.isCritical);
  event.actor = names;
  event.actorInfo.user = { name: replacement.name, zhName: replacement.zhName || replacement.name, position: replacement.position };
  event.actorInfo.support = supporting ? { name: supporting.name, zhName: supporting.zhName || supporting.name, position: supporting.position } : null;
  event.actorInfo.marker = marker ? { name: marker.name, zhName: marker.zhName || marker.name, position: marker.position } : null;
  event.title = scene.title;
  event.desc = `${scene.desc}（原定参与者已因停赛/红牌无法继续，系统已自动调整为可用球员。）`;
  return event;
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

  const userDelta = calculateXgDelta(effects, userTeam, opponent, match, event) * (event.isCritical ? 1.25 : 1);
  const oppDelta = calculateOpponentDelta(effects, opponent, userTeam, match, event) * (event.isCritical ? 1.25 : 1);
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

  resolveDiscipline(match, event, effects, extraNotes, userTeam);

  if (goals.length) {
    const goalText = goals.map(g => `⚽ ${g.minute}' ${g.scorerZhName}（${g.teamName}）`).join('；');
    const actionText = describeGoalBuildUp(event, option, goals);
    resultText += ` 结果：${actionText}${goalText}。${extraNotes.join(' ')}${xgText}。`;
  } else {
    const note = extraNotes.length ? `${extraNotes.join(' ')} ` : describeNoGoalOutcome(match, event, option, effects, userTeam, opponent);
    resultText += ` 结果：${note}${xgText}。`;
  }

  const opponentPlan = applyOpponentAdjustment(match, event, opponent);
  const opponentAdjustmentText = opponentPlan.text;
  if (opponentAdjustmentText) resultText += ` 对手调整：${opponentAdjustmentText}`;
  decayOpponentState(match);

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
    cards: match.cards.filter(c => c.minute === event.minute),
    redCards: match.redCards.filter(c => c.minute === event.minute),
    score: { ...match.score },
    resultText,
    effectText: effectSummary(effects),
    opponentAdjustment: opponentAdjustmentText
  };
  match.choices.push(record);
  match.timeline.push(record);
  match.pendingResult = record;
  match.eventIndex += 1;
  updateMatchPhase(match);
  return record;
}

function describeGoalBuildUp(event, option, goals) {
  const scorer = goals[0]?.scorerZhName || event.actor?.user || '进攻球员';
  const patterns = [
    `${scorer}摆脱防守后冷静完成最后一击，`,
    `${event.actor?.support || '队友'}送出关键传球，${scorer}把握住机会，`,
    `这次选择立刻改变了禁区内的空间，${scorer}完成致命处理，`,
    `${scorer}在压力下仍然完成高质量终结，`
  ];
  return sample(patterns) || '';
}

function describeNoGoalOutcome(match, event, option, effects, userTeam, opponent) {
  const actor = event.actor?.user || '我方球员';
  const marker = event.actor?.marker || '对方防守人';
  const keeper = opponent.squad?.find(p => p.position === 'GK')?.zhName || '对方门将';
  const outcomes = [];
  if ((effects.chanceQuality || 0) + (effects.instantGoalChance || 0) >= 2) {
    outcomes.push(`${actor}晃开角度后起脚，皮球擦着立柱偏出。`);
    outcomes.push(`${actor}低射打向远角，被${keeper}单掌托出底线。`);
    outcomes.push(`${actor}抢到第一点攻门，皮球击中横梁弹出。`);
    outcomes.push(`${actor}的射门穿过人群，却被${marker}在门线前挡出。`);
  }
  if ((effects.transitionAttack || 0) >= 2) {
    outcomes.push(`${actor}带球推进形成三打二，但最后一传稍稍靠后，机会被拖慢。`);
    outcomes.push(`${actor}高速推进后横传禁区，跟进队友铲射偏出。`);
  }
  if ((effects.setPieceAttack || 0) >= 1) {
    outcomes.push(`${actor}高高跃起甩头攻门，皮球击中门柱外侧弹出。`);
    outcomes.push(`${actor}在后点完成头球摆渡，但第二点被对手抢先解围。`);
  }
  if ((effects.defensiveStability || 0) >= 2) {
    outcomes.push(`${actor}提前卡住线路完成拦截，但随后的长传被对手回收。`);
    outcomes.push(`${actor}用身体挡住对手推进，迫使对方只能回传重组。`);
  }
  if ((effects.foulRisk || 0) >= 2) {
    outcomes.push(`${actor}铲球动作很大，主裁口头警告后示意比赛继续。`);
    outcomes.push(`${actor}和对手发生身体冲撞，场面短暂失控但没有出牌。`);
  }
  if (!outcomes.length) {
    outcomes.push(`${actor}完成一次有效处理，但对手防线及时回收，没有让机会继续扩大。`);
    outcomes.push(`${actor}试图加快节奏，传球意图被识破，球权被对手破坏出边线。`);
    outcomes.push(`${actor}在狭小空间内完成摆脱，但最后一步触球稍大，被对手补防破坏。`);
  }
  return sample(outcomes);
}

function resolveDiscipline(match, event, effects, extraNotes, userTeam) {
  const foulRisk = Math.max(0, effects.foulRisk || 0) + (match.opponentState?.disciplineBait || 0) * .75;
  if (foulRisk <= 0) return;
  const chance = clamp(foulRisk * .095, .02, .42);
  if (Math.random() >= chance) return;
  const player = findActorPlayer(userTeam, event.actorInfo?.user?.name) || pickScenePlayer(userTeam, { prefer: 'defender' }, true, match.playerStatus || {});
  if (!player) return;
  const name = player.name;
  const zhName = player.zhName || player.name;
  match.yellowCards[name] = (match.yellowCards[name] || 0) + 1;
  const card = { minute: event.minute, playerName: name, playerZhName: zhName, teamId: userTeam.id, type: 'yellow' };
  match.cards.push(card);
  if (match.yellowCards[name] >= 2) {
    match.sentOff[name] = true;
    const red = { ...card, type: 'second_yellow_red' };
    match.redCards.push(red);
    if (match.playerStatus?.[name]) {
      match.playerStatus[name].matchUnavailable = true;
      match.playerStatus[name].suspended = true;
      match.playerStatus[name].suspensionMatches = Math.max(match.playerStatus[name].suspensionMatches || 0, 1);
      match.playerStatus[name].newSuspension = true;
    }
    match.xg.opponent += .12;
    match.resolvedXg.opponent += .12;
    extraNotes.push(`${zhName}第二次鲁莽犯规，两黄变一红被罚下；本场此后他不会再参与事件，下场自动停赛，防守压力指数上升。`);
  } else {
    extraNotes.push(`${zhName}一次鲁莽上抢吃到黄牌，之后防守选择会更受限制。`);
  }
}

function findActorPlayer(team, name) {
  if (!name) return null;
  return team.squad?.find(p => p.name === name) || null;
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

function calculateXgDelta(effects, userTeam, opponent, match = {}, event = {}) {
  const attack = (effects.chanceCreation || 0) * .045 + (effects.chanceQuality || 0) * .06 + (effects.transitionAttack || 0) * .045 + (effects.setPieceAttack || 0) * .035;
  const power = (baseTeamPower(userTeam) - baseTeamPower(opponent)) * .012;
  const state = match.opponentState || {};
  let suppression = 0;
  if (/CENTRAL|BUILD_PRESS/.test(event.id || '')) suppression += (state.centralLock || 0) * .035 + (state.press || 0) * .025;
  if (/WIDE/.test(event.id || '')) suppression += (state.wideTrap || 0) * .038;
  if (/SETPIECE/.test(event.id || '')) suppression += (state.setPieceGuard || 0) * .030;
  if (/COUNTER/.test(event.id || '')) suppression -= Math.max(0, effects.transitionAttack || 0) * .004;
  return clamp(.05 + attack + power - suppression, 0, .55);
}

function calculateOpponentDelta(effects, opponent, userTeam, match = {}, event = {}) {
  const risk = (effects.counterRisk || 0) * .045 + Math.max(0, -(effects.defensiveStability || 0)) * .05 + (effects.instantConcedeChance || 0) * .008;
  const protection = (effects.defensiveStability || 0) * .025 + (effects.setPieceDefense || 0) * .02;
  const power = (baseTeamPower(opponent) - baseTeamPower(userTeam)) * .009;
  const state = match.opponentState || {};
  const pressureBonus = (state.counterThreat || 0) * .035 + (state.press || 0) * .020 + (state.fatigueTarget || 0) * .025;
  const setPieceBonus = /SETPIECE/.test(event.id || '') ? (state.setPieceGuard || 0) * .012 : 0;
  return clamp(.04 + risk - protection + power + pressureBonus + setPieceBonus, 0, .56);
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
  const scorer = pickScorer(team, tags, match);
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

function pickScorer(team, tags = [], match = {}) {
  const attackers = team.squad.filter(p => p.position !== 'GK' && !match.sentOff?.[p.name] && !match.playerStatus?.[p.name]?.suspended && !match.playerStatus?.[p.name]?.matchUnavailable);
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
