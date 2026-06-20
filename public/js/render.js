import { TEAMS, getTeamById, SELECTABLE_TEAM_IDS } from '../data/teamsData.js';
import { FORMATIONS, TACTIC_GROUPS, HALFTIME_COMMANDS, DEFAULT_TACTICS } from '../data/tacticsData.js';
import { state, saveState, resetState } from './state.js';
import { go, routeParts } from './router.js';
import { createSeason, currentFixture, simulateComputerRound, applyManagement, advanceRound, finishLeagueIfNeeded, completeLeaguePhase, processKnockoutResult } from './seasonEngine.js';
import { rankedStandings, applyResult, zoneLabel, qualificationBriefing } from './standingsEngine.js';
import { createMatch, applyEventChoice, finalizeMatch, applyHalftime, matchOutcome, ensureCurrentEventPlayable } from './matchEngine.js';
import { getCurrentEvent, eventProgressText } from './eventEngine.js';
import { addSeasonArchive, loadArchive, clearArchive } from './historyStore.js';
import { teamAverage, stageName } from './utils.js';
import { traitLabel, traitTooltip, optionTagLabel, optionTagTooltip, effectSummary } from '../data/labelData.js';
import { describeUserPath, generatePlayoffPairs } from './knockoutEngine.js';

const app = () => document.getElementById('app');
function html(strings, ...values) { return strings.map((s, i) => s + (values[i] ?? '')).join(''); }
function set(content) { app().innerHTML = content; bindCommon(); }
function bindCommon() { document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => go(el.dataset.go))); }

export function render() {
  const [page, arg] = routeParts();
  if (!page) return renderHome();
  if (page === 'teams') return renderTeams();
  if (page === 'team') return renderTeam(arg);
  if (page === 'season') return renderSeason();
  if (page === 'league-result') return renderLeagueResult();
  if (page === 'prematch') return renderPrematch();
  if (page === 'match') return renderMatch();
  if (page === 'halftime') return renderHalftime();
  if (page === 'postmatch') return renderPostmatch();
  if (page === 'management') return renderManagement();
  if (page === 'standings') return renderStandings();
  if (page === 'knockout') return renderKnockout();
  if (page === 'history') return renderHistory();
  if (page === 'season-detail') return renderSeasonDetail(arg);
  if (page === 'detail') return renderMatchDetail(arg);
  renderHome();
}

function renderHome() {
  set(html`<section class="hero">
    <div><p class="eyebrow">Road to the Final</p><h2>从瑞士轮开始，率队冲击欧冠冠军</h2></div>
    <p>选择一支球队，完成赛前部署、关键抉择、中场调整，并在瑞士轮、附加赛和淘汰赛路径中推进。第一版使用本地存档和纯静态 JS。</p>
    <div class="actions"><button class="primary" data-go="/teams">开始新赛季</button><button data-go="/season">继续赛季</button><button data-go="/history">历史记录</button></div>
  </section>`);
}

function renderTeams() {
  const cards = TEAMS.filter(t => SELECTABLE_TEAM_IDS.includes(t.id)).map(t => html`<article class="card">
    <h3>${t.zhName || t.name}</h3><p class="meta">${t.name} · ${t.difficultyLabel || '可选球队'} · 首发均分 ${teamAverage(t,true)}</p>
    <div class="badges"><span class="badge">执行 ${t.hidden?.tacticalExecution}</span><span class="badge">厚度 ${t.hidden?.squadDepth}</span><span class="badge">欧战 ${t.hidden?.europeanTemperament}</span></div>
    <button data-go="/team/${t.id}">查看并选择</button>
  </article>`).join('');
  set(`<div class="section-title"><h2>选择球队</h2><span class="meta">12 支可选球队，36 队均可成为对手</span></div><div class="grid">${cards}</div>`);
}

function renderTeam(id) {
  const t = getTeamById(id); if (!t) return renderTeams();
  set(html`<section class="panel card">
    <h2>${t.zhName || t.name}</h2><p class="meta">${t.name} · ${t.country} · 推荐阵型 ${t.recommendedFormation}</p>
    <div class="kpi"><div><strong>${teamAverage(t,true)}</strong>首发均分</div><div><strong>${t.hidden.tacticalExecution}</strong>战术执行力</div><div><strong>${t.hidden.squadDepth}</strong>阵容厚度</div><div><strong>${t.hidden.europeanTemperament}</strong>欧战抗压</div></div>
    ${squadTable(t)}
    <div class="actions"><button class="primary" id="start-season">使用这支球队开档</button><button data-go="/teams">返回</button></div>
  </section>`);
  document.getElementById('start-season').addEventListener('click', () => { state.season = createSeason(t.id); state.currentMatch = null; state.lastResult = null; saveState(); go('/season'); });
}

function squadTable(t) {
  return `<div class="table-wrap"><table><thead><tr><th>角色</th><th>位置</th><th>球员</th><th>OVR</th><th>标签</th></tr></thead><tbody>${t.squad.map(p=>`<tr><td>${p.isStarter?'首发':'替补'}</td><td>${p.position}</td><td>${p.zhName || p.name}<br><span class="small">${p.name}</span></td><td>${p.ovr}</td><td>${(p.traits||[]).map(traitBadge).join('')}</td></tr>`).join('')}</tbody></table></div>`;
}

function ensureSeason() { if (!state.season) { go('/teams'); return false; } return true; }

function renderSeason() {
  if (!ensureSeason()) return;
  const s = state.season;
  const team = getTeamById(s.userTeamId);

  if (s.completed || s.stage === 'ended' || s.stage === 'champion') return renderSeasonFinished(s, team);
  if (s.stage !== 'league') return renderKnockoutHub(s, team);

  const fixture = currentFixture(s);
  const opponent = fixture ? getTeamById(fixture.opponentId) : null;
  const briefing = s.round >= 7 && s.round <= 8 ? `<div class="card"><h3>第 ${s.round} 轮出线形势</h3><p class="meta" style="white-space:pre-line">${qualificationBriefing(s)}</p></div>` : '';
  const managementPrompt = s.awaitingManagement ? `<div class="card urgent-card"><h3>第 ${s.round} 轮赛前管理待完成</h3><p class="meta">上一场已经结束，当前轮次已推进到第 ${s.round} 轮。请先完成轮间管理，再进入下一场。</p><button class="primary" data-go="/management">进入轮间管理</button></div>` : '';
  const primaryAction = s.awaitingManagement ? `<button class="primary" data-go="/management">进入轮间管理</button>` : `<button class="primary" data-go="/prematch">进入赛前部署</button>`;
  set(html`<section class="hero"><p class="eyebrow">Season Hub</p><h2>${team.zhName || team.name} · 瑞士轮第 ${s.round} 轮</h2>
  <p>${fixture ? `下一场：${fixture.home ? '主场' : '客场'} vs ${opponent.zhName || opponent.name}` : describeUserPath(s)}</p>
  <div class="actions">${primaryAction}<button data-go="/standings">查看积分榜</button><button data-go="/knockout">淘汰赛路径</button></div></section>${managementPrompt}${briefing}
  <div class="section-title"><h2>近期比赛</h2></div><div class="timeline">${s.history.slice().reverse().map(matchSummaryCard).join('') || '<p class="meta">暂无比赛记录。</p>'}</div>`);
}

function renderSeasonFinished(s, team) {
  const finishText = s.finish === 'champion' ? '你赢得了欧冠冠军！' : s.finish === 'league_eliminated' ? `联赛阶段第 ${s.leagueRank} 名，赛季结束。` : `赛季结束：${stageName((s.finish || '').replace('_eliminated',''))}出局。`;
  const radar = seasonRadarCard(s);
  set(`<section class="hero"><p class="eyebrow">Season Over</p><h2>${team.zhName || team.name}</h2><p>${finishText}</p><div class="actions"><button data-go="/history">查看历史记录</button><button class="primary" data-go="/teams">重新开档</button></div></section>${radar}<div class="timeline">${(s.knockout?.bracketLog || []).map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div>`);
}

function renderKnockoutHub(s, team) {
  const fixture = currentFixture(s);
  const opponent = fixture ? getTeamById(fixture.opponentId) : null;
  const reports = s.knockout?.playoffReports?.length ? `<div class="card"><h3>附加赛战报</h3><div class="timeline">${s.knockout.playoffReports.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></div>` : '';
  const log = s.knockout?.bracketLog?.length ? `<div class="card"><h3>你的淘汰赛路径</h3><div class="timeline">${s.knockout.bracketLog.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></div>` : '';
  set(html`<section class="hero"><p class="eyebrow">Knockout Stage</p><h2>${team.zhName || team.name} · ${stageName(s.stage)}</h2>
  <p>${fixture ? `下一场：${fixture.home ? '主场' : '客场/中立'} vs ${opponent.zhName || opponent.name}${fixture.totalLegs === 2 ? ` · 第${fixture.leg}回合${fixture.aggregate ? ` · 总比分 ${fixture.aggregate.user}-${fixture.aggregate.opponent}` : ''}` : ''}` : describeUserPath(s)}</p>
  <div class="actions"><button class="primary" data-go="/prematch">进入${stageName(s.stage)}赛前部署</button><button data-go="/knockout">查看抽签路径</button><button data-go="/history">历史记录</button></div></section>${reports}${log}`);
}

function renderLeagueResult() {
  if (!ensureSeason()) return;
  completeLeaguePhase(state.season);
  if (state.season.completed && !state.season.archived) {
    state.season.archived = true;
    addSeasonArchive({ ...state.season, archivedAt: new Date().toISOString() });
  }
  saveState();
  const s = state.season;
  const ranked = rankedStandings(s.standings);
  const userRow = ranked.find(r => r.teamId === s.userTeamId);
  const reports = s.knockout?.playoffReports || [];
  const fixture = currentFixture(s);
  const opp = fixture ? getTeamById(fixture.opponentId) : null;
  const action = s.completed ? `<button class="primary" data-go="/history">查看赛季记录</button>` : `<button class="primary" data-go="/prematch">进入${stageName(s.stage)}赛前部署</button>`;
  set(`<section class="card"><h2>联赛阶段结算</h2><p class="meta">你最终排名第 ${userRow?.rank || '-'}，积 ${userRow?.points || 0} 分，净胜球 ${userRow?.gd >= 0 ? '+' : ''}${userRow?.gd ?? 0}。</p><h3>${describeUserPath(s)}</h3>${opp ? `<p>下一场：${stageName(s.stage)} 对阵 <strong>${opp.zhName || opp.name}</strong>。</p>` : ''}<div class="actions">${action}<button data-go="/standings">查看最终积分榜</button><button data-go="/season">返回赛季页</button></div></section>${reports.length ? `<section class="card"><h3>附加赛模拟战报</h3><div class="timeline">${reports.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></section>` : ''}`);
}

function matchSummaryCard(m) {
  const title = m.stage === 'league' ? `${stageName(m.stage)}第${m.round}轮` : stageName(m.stage);
  const goals = goalList(m.goals, true);
  return `<div class="timeline-item"><strong>${title}：${m.userTeamName} ${m.score.user}-${m.score.opponent} ${m.opponentName}</strong><br><span class="meta">xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)} · ${m.outcome}</span>${goals ? `<br><span class="small">${goals}</span>` : ''}<br><button data-go="/detail/${m.id}">查看详情</button></div>`;
}

function renderPrematch() {
  if (!ensureSeason()) return;
  const s = state.season, f = currentFixture(s); if (!f) return renderSeason(); if (s.awaitingManagement) return go('/management');
  const team = getTeamById(s.userTeamId), opp = getTeamById(f.opponentId);
  const tactics = { ...DEFAULT_TACTICS, ...(state.selectedTactics || {}) };
  const fields = tacticForm(tactics);
  const legInfo = f.totalLegs === 2 ? ` · 第${f.leg}回合${f.aggregate ? ` · 总比分 ${f.aggregate.user}-${f.aggregate.opponent}` : ''}` : '';
  set(html`<section class="card"><h2>赛前部署 · ${stageName(s.stage)}${legInfo}</h2><p class="meta">${team.zhName} ${f.home?'主场':'客场/中立'} 对阵 ${opp.zhName || opp.name}。对手首发均分 ${teamAverage(opp,true)}。</p><div id="formation-preview">${formationPitch(team, tactics.formation, s.playerStatus)}</div><div class="form-grid">${fields}</div><div class="actions"><button class="primary" id="confirm-tactics">确认并进入比赛</button><button data-go="/season">返回</button></div></section>`);
  const formationSelect = document.querySelector('select[name="formation"]');
  formationSelect?.addEventListener('change', () => {
    document.getElementById('formation-preview').innerHTML = formationPitch(team, formationSelect.value, s.playerStatus);
  });
  document.getElementById('confirm-tactics').addEventListener('click', () => {
    const form = document.querySelector('#tactic-form');
    const data = Object.fromEntries(new FormData(form).entries());
    state.selectedTactics = data;
    state.currentMatch = createMatch(s, f, data);
    saveState(); go('/match');
  });
}

function tacticForm(tactics) {
  return `<form id="tactic-form" class="form-grid"><label>阵型<select name="formation">${Object.values(FORMATIONS).map(o=>`<option value="${o.id}" ${tactics.formation===o.id?'selected':''}>${o.name}</option>`).join('')}</select></label>${Object.entries(TACTIC_GROUPS).map(([key, group])=>`<label>${group.label}<select name="${key}">${Object.entries(group.options).map(([id,o])=>`<option value="${id}" ${tactics[key]===id?'selected':''}>${o.name}</option>`).join('')}</select></label>`).join('')}</form>`;
}

function formationPitch(team, formation, playerStatus = {}) {
  let starters = team.squad.filter(p=>p.isStarter && !playerStatus[p.name]?.suspended && !playerStatus[p.name]?.matchUnavailable);
  if (starters.length < 11) {
    const bench = team.squad.filter(p=>!p.isStarter && !playerStatus[p.name]?.suspended && !playerStatus[p.name]?.matchUnavailable);
    starters = [...starters, ...bench].slice(0, 11);
  }
  const assigned = assignFormationSlots(starters, formation);
  return `<div class="pitch formation-${formation}">${assigned.map(({p, x, y, role})=>`<div class="player-dot" style="left:${x}%;top:${y}%"><strong>${shortPlayerName(p)}</strong><br><span>${role}</span></div>`).join('')}</div><p class="small">阵型图会随阵型切换自动重排；球员优先按实际位置落位，避免边锋/中锋错位。</p>`;
}

function shortPlayerName(p) { return p.zhName?.split('·').pop() || p.name.split(' ').pop(); }

const FORMATION_SLOTS = {
  F433: [
    ['GK',50,91,/GK/], ['LB',18,73,/LB|LWB/], ['LCB',38,73,/CB/], ['RCB',62,73,/CB/], ['RB',82,73,/RB|RWB/],
    ['DM',50,56,/DM|CM/], ['LCM',34,47,/CM|AM|DM/], ['RCM',66,47,/CM|AM|DM/], ['LW',20,25,/LW|LM|RW|AM/], ['ST',50,18,/ST|CF/], ['RW',80,25,/RW|RM|LW|AM/]
  ],
  F4231: [
    ['GK',50,91,/GK/], ['LB',18,73,/LB|LWB/], ['LCB',38,73,/CB/], ['RCB',62,73,/CB/], ['RB',82,73,/RB|RWB/],
    ['LDM',40,57,/DM|CM/], ['RDM',60,57,/DM|CM/], ['LW',20,35,/LW|LM|RW/], ['AM',50,34,/AM|CM|RW|LW/], ['RW',80,35,/RW|RM|LW/], ['ST',50,18,/ST|CF/]
  ],
  F343: [
    ['GK',50,91,/GK/], ['LCB',30,73,/CB|LB/], ['CB',50,75,/CB/], ['RCB',70,73,/CB|RB/], ['LWB',16,53,/LB|LWB|LW/], ['LCM',40,52,/CM|DM/], ['RCM',60,52,/CM|DM/], ['RWB',84,53,/RB|RWB|RW/], ['LW',22,25,/LW|AM|RW/], ['ST',50,18,/ST|CF/], ['RW',78,25,/RW|AM|LW/]
  ],
  F352: [
    ['GK',50,91,/GK/], ['LCB',30,73,/CB|LB/], ['CB',50,75,/CB/], ['RCB',70,73,/CB|RB/], ['LWB',16,52,/LB|LWB|LW/], ['LCM',38,50,/CM|DM/], ['DM',50,57,/DM|CM/], ['RCM',62,50,/CM|AM|DM/], ['RWB',84,52,/RB|RWB|RW/], ['LST',42,19,/ST|CF|LW/], ['RST',58,19,/ST|CF|RW/]
  ],
  F442: [
    ['GK',50,91,/GK/], ['LB',18,73,/LB|LWB/], ['LCB',38,73,/CB/], ['RCB',62,73,/CB/], ['RB',82,73,/RB|RWB/], ['LM',20,48,/LW|LM|LB/], ['LCM',42,52,/CM|DM/], ['RCM',58,52,/CM|DM|AM/], ['RM',80,48,/RW|RM|RB/], ['LST',42,20,/ST|CF|LW/], ['RST',58,20,/ST|CF|RW/]
  ],
  F532: [
    ['GK',50,91,/GK/], ['LWB',14,72,/LB|LWB|LW/], ['LCB',34,75,/CB|LB/], ['CB',50,76,/CB/], ['RCB',66,75,/CB|RB/], ['RWB',86,72,/RB|RWB|RW/], ['LCM',38,52,/CM|DM/], ['DM',50,57,/DM|CM/], ['RCM',62,52,/CM|AM|DM/], ['LST',42,21,/ST|CF|LW/], ['RST',58,21,/ST|CF|RW/]
  ]
};

function assignFormationSlots(players, formation) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS.F433;
  const remaining = [...players];
  const out = [];
  for (const [role, x, y, regex] of slots) {
    let idx = remaining.findIndex(p => regex.test(p.position || ''));
    if (idx < 0 && role.includes('ST')) idx = remaining.findIndex(p => /LW|RW|AM/.test(p.position || ''));
    if (idx < 0 && /LW|LM|LWB/.test(role)) idx = remaining.findIndex(p => /LB|LW|CM/.test(p.position || ''));
    if (idx < 0 && /RW|RM|RWB/.test(role)) idx = remaining.findIndex(p => /RB|RW|CM/.test(p.position || ''));
    if (idx < 0) idx = 0;
    const [p] = remaining.splice(idx, 1);
    if (p) out.push({ p, x, y, role });
  }
  return out;
}

function renderMatch() {
  const m = state.currentMatch; if (!m) return go('/season');
  if (m.pendingResult) return renderEventResult(m);
  if (m.phase === 'halftime') return go('/halftime');
  if (m.phase === 'fulltime') { finalizeAndStore(); return go('/postmatch'); }
  ensureCurrentEventPlayable(m);
  const event = getCurrentEvent(m);
  const user = getTeamById(m.userTeamId), opp = getTeamById(m.opponentId);
  const legInfo = m.fixture?.totalLegs === 2 ? ` · 第${m.fixture.leg}回合${m.fixture.aggregate ? ` · 总比分 ${m.fixture.aggregate.user}-${m.fixture.aggregate.opponent}` : ''}` : '';
  set(html`<section class="card"><div class="scoreboard"><h3>${user.zhName}</h3><div class="score">${m.score.user} - ${m.score.opponent}</div><h3>${opp.zhName || opp.name}</h3></div><p class="meta">${eventProgressText(m)}${legInfo} · 预计 xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}</p>
  <div class="match-event ${event.isCritical ? 'critical-moment' : ''}"><p class="eyebrow">${event.isCritical ? '⚠ 关键时刻' : `${event.minute}' · ${event.type}`}</p><h2>${event.title}</h2><p class="meta">${event.desc}</p>${event.isCritical ? '<p class="critical-note">这次选择可能直接产生进球、点球扑救、伤退调整或比分转折。</p>' : ''}<div class="option-list">${event.options.map((o,i)=>choiceButton(o,i,event.isCritical)).join('')}</div></div>
  <div class="section-title"><h2>已完成事件</h2></div><div class="timeline">${m.timeline.map(timelineItem).join('') || '<p class="meta">暂无。</p>'}</div></section>`);
  document.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => { applyEventChoice(m, Number(btn.dataset.choice)); saveState(); render(); }));
}

function renderEventResult(m) {
  const r = m.pendingResult;
  const user = getTeamById(m.userTeamId), opp = getTeamById(m.opponentId);
  set(html`<section class="card"><div class="scoreboard"><h3>${user.zhName}</h3><div class="score">${m.score.user} - ${m.score.opponent}</div><h3>${opp.zhName || opp.name}</h3></div>
  <div class="match-event result-panel ${r.isCritical ? 'critical-moment' : ''}"><p class="eyebrow">${r.isCritical ? '⚠ 关键时刻结果' : `${r.minute}' · 事件结果`}</p><h2>${r.title}</h2><p class="meta">你的选择：${r.optionText}</p><div class="result-text">${r.resultText}</div>${r.goals?.length ? `<p class="goal-line">${goalList(r.goals)}</p>` : ''}${r.opponentAdjustment ? `<p class="opponent-adjustment">对手变化：${r.opponentAdjustment}</p>` : ''}<div class="actions"><button class="primary" id="continue-event">继续比赛</button></div></div>
  <div class="section-title"><h2>已完成事件</h2></div><div class="timeline">${m.timeline.map(timelineItem).join('')}</div></section>`);
  document.getElementById('continue-event').addEventListener('click', () => { m.pendingResult = null; saveState(); render(); });
}

function traitBadge(id) { return `<span class="badge tooltip-badge" data-tooltip="${escapeAttr(traitTooltip(id))}" aria-label="${escapeAttr(traitTooltip(id))}">${traitLabel(id)}</span>`; }
function optionTagBadge(id) { return `<span class="badge tooltip-badge" data-tooltip="${escapeAttr(optionTagTooltip(id))}" aria-label="${escapeAttr(optionTagTooltip(id))}">${optionTagLabel(id)}</span>`; }
function choiceButton(option, i, isCritical = false) {
  const tags = (option.tags || []).map(optionTagBadge).join('');
  const tip = `数值影响：${effectSummary(option.effects)}${option.tags?.length ? '｜标签增益：' + option.tags.map(optionTagTooltip).join('；') : ''}`;
  return `<button data-choice="${i}" class="${isCritical ? 'critical-choice' : ''}" title="${escapeAttr(tip)}"><span class="choice-text">${option.text}</span><span class="choice-effects">${effectSummary(option.effects)}</span><span class="choice-tags">${tags}</span></button>`;
}
function escapeAttr(value = '') { return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function goalList(goals = [], compact = false) {
  if (!goals?.length) return '';
  const grouped = goals.map(g => `${g.minute}' ${g.scorerZhName}${compact ? '' : `（${g.teamName}）`}`).join('；');
  return `进球：${grouped}`;
}
function timelineItem(t) {
  const effectText = t.effectText || (t.effects ? effectSummary(t.effects) : '');
  const tagText = t.tags?.length ? `<br><span class="choice-tags">${t.tags.map(optionTagBadge).join('')}</span>` : '';
  const goals = t.goals?.length ? `<br><span class="goal-line">${goalList(t.goals)}</span>` : '';
  return `<div class="timeline-item ${t.isCritical ? 'timeline-critical' : ''}"><strong>${t.isCritical ? '⚠ ' : ''}${t.minute || ''}' ${t.title}</strong><br><span class="meta">${t.resultText || t.optionText || ''}</span>${goals}${tagText}<br><span class="small">比分 ${t.score?.user ?? '-'}-${t.score?.opponent ?? '-'}${effectText ? ` · ${effectText}` : ''}</span></div>`;
}

function processSuspensionsAfterMatch(season, match) {
  if (!season?.playerStatus) return;
  for (const [name, st] of Object.entries(season.playerStatus)) {
    st.matchUnavailable = false;
    if (st.newSuspension) { st.newSuspension = false; continue; }
    if (st.suspended && st.suspensionMatches) {
      st.suspensionMatches -= 1;
      if (st.suspensionMatches <= 0) {
        st.suspended = false;
        st.suspensionMatches = 0;
        st.yellowCards = 0;
      }
    }
  }
}

function seasonRadarCard(season) {
  const metrics = seasonPerformanceMetrics(season);
  const avgScore = Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length);
  const grade = gradeForScore(avgScore);
  return `<section class="card"><h2>赛季综合雷达图</h2><p class="meta">综合评分 ${avgScore}/100 · 评级 ${grade}。鼠标移动到任一指标点附近即可查看该维度的分数、评级和要求。</p>${radarSvg(metrics)}<div class="radar-legend">${metrics.map(m=>`<span class="badge tooltip-badge" data-tooltip="${escapeAttr(m.requirement)}">${m.label}: ${m.score} · ${m.grade}</span>`).join('')}</div></section>`;
}

function seasonPerformanceMetrics(season) {
  const matches = season.history || [];
  const played = Math.max(1, matches.length);
  const gf = matches.reduce((s,m)=>s+(m.score?.user||0),0);
  const ga = matches.reduce((s,m)=>s+(m.score?.opponent||0),0);
  const xgf = matches.reduce((s,m)=>s+(m.xg?.user||0),0);
  const xga = matches.reduce((s,m)=>s+(m.xg?.opponent||0),0);
  const wins = matches.filter(m=>m.outcome==='win').length;
  const decisionCount = matches.reduce((s,m)=>s+(m.choices?.length||0),0) || 1;
  const positiveDecisions = matches.reduce((s,m)=>s+(m.choices||[]).filter(c=>(c.userDelta||0)>=(c.oppDelta||0)).length,0);
  const goals = matches.reduce((s,m)=>s+(m.goals?.filter(g=>g.side==='user').length||0),0);
  const cards = matches.reduce((s,m)=>s+(m.cards?.length||0),0);
  const injuries = matches.reduce((s,m)=>s+(m.injuries?.length||0),0);
  const knockoutWins = matches.filter(m=>m.stage!=='league' && m.outcome==='win').length;
  const stageBonus = season.finish === 'champion' ? 18 : season.stage === 'champion' ? 18 : season.stage === 'ended' ? 0 : 6;
  const data = [
    { label:'进攻火力', score: clampScore(50 + (gf/played)*15 + (xgf/played)*10), requirement:'持续制造高质量机会，并把 xG 转化为实际进球。' },
    { label:'防守稳固', score: clampScore(88 - (ga/played)*16 - (xga/played)*10), requirement:'限制对手禁区机会、减少失球和被反击次数。' },
    { label:'战术执行', score: clampScore(45 + positiveDecisions/decisionCount*55), requirement:'多数关键抉择要让己方收益不低于对手收益。' },
    { label:'临场应变', score: clampScore(48 + Math.min(35, decisionCount*1.1) + (season.managementHistory?.length||0)*2 - injuries*3), requirement:'通过轮间管理、中场调整和关键事件处理保持比赛主动权。' },
    { label:'欧战抗压', score: clampScore(45 + wins/played*35 + stageBonus + knockoutWins*4), requirement:'在强强对话和淘汰赛节点拿到结果。' },
    { label:'阵容管理', score: clampScore(88 - injuries*8 - cards*2 + (season.managementHistory?.length||0)*1.2), requirement:'控制伤病、停赛和疲劳，让关键球员在大场面可用。' },
    { label:'纪律控制', score: clampScore(96 - cards*7), requirement:'减少黄牌、红牌和鲁莽犯规，避免被迫调整阵型。' },
    { label:'淘汰赛表现', score: clampScore(matches.some(m=>m.stage!=='league') ? 45 + knockoutWins*12 + stageBonus : 45 + (season.leagueRank && season.leagueRank <= 8 ? 20 : 0)), requirement:'两回合中管理总比分，并在加时或点球压力下作出正确选择。' }
  ];
  return data.map(m=>({ ...m, grade: gradeForScore(m.score) }));
}

function clampScore(v) { return Math.max(0, Math.min(100, Math.round(v))); }
function gradeForScore(score) {
  if (score >= 97) return 'A+';
  if (score >= 92) return 'A';
  if (score >= 88) return 'A-';
  if (score >= 84) return 'B+';
  if (score >= 80) return 'B';
  if (score >= 76) return 'B-';
  if (score >= 72) return 'C+';
  if (score >= 68) return 'C';
  if (score >= 64) return 'C-';
  if (score >= 58) return 'D';
  if (score >= 45) return 'E';
  return 'F';
}

function radarSvg(metrics) {
  const size = 360, cx = 180, cy = 180, radius = 118;
  const axes = metrics.map((m, i) => {
    const a = -Math.PI / 2 + i * Math.PI * 2 / metrics.length;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    return { ...m, a, x, y, px: cx + Math.cos(a) * radius * (m.score/100), py: cy + Math.sin(a) * radius * (m.score/100) };
  });
  const rings = [20,40,60,80,100].map(v => polygonPoints(axes.map(ax=>({ x: cx + Math.cos(ax.a)*radius*(v/100), y: cy + Math.sin(ax.a)*radius*(v/100) }))));
  const area = polygonPoints(axes.map(ax=>({x:ax.px,y:ax.py})));
  return `<div class="radar-wrap"><svg class="radar-chart" viewBox="0 0 ${size} ${size}" role="img" aria-label="赛季表现雷达图">${rings.map(points=>`<polygon class="radar-ring" points="${points}"></polygon>`).join('')}${axes.map(ax=>`<line class="radar-axis" x1="${cx}" y1="${cy}" x2="${ax.x}" y2="${ax.y}"></line>`).join('')}<polygon class="radar-area" points="${area}"></polygon>${axes.map(ax=>`<g class="radar-point-group"><circle class="radar-point" cx="${ax.px.toFixed(1)}" cy="${ax.py.toFixed(1)}" r="4"></circle><circle class="radar-hotspot" cx="${ax.px.toFixed(1)}" cy="${ax.py.toFixed(1)}" r="24"><title>${escapeAttr(ax.label)}：${ax.score}/100 · ${ax.grade}｜${escapeAttr(ax.requirement)}</title></circle><text class="radar-label" x="${(cx + Math.cos(ax.a)*(radius+28)).toFixed(1)}" y="${(cy + Math.sin(ax.a)*(radius+28)).toFixed(1)}" text-anchor="middle">${ax.label}</text></g>`).join('')}</svg></div>`;
}
function polygonPoints(points) { return points.map(p=>`${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '); }

function renderHalftime() {
  const m = state.currentMatch; if (!m) return go('/season');
  const user = getTeamById(m.userTeamId), opp = getTeamById(m.opponentId);
  set(html`<section class="card"><h2>中场调整</h2><p class="meta">半场比分：${user.zhName} ${m.score.user}-${m.score.opponent} ${opp.zhName || opp.name}。xG：${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}。</p><form id="ht-form"><label>半场总指令<select name="command">${Object.entries(HALFTIME_COMMANDS).map(([id,o])=>`<option value="${id}">${o.name}</option>`).join('')}</select></label></form><div class="actions"><button class="primary" id="confirm-ht">确认下半场计划</button></div></section>`);
  document.getElementById('confirm-ht').addEventListener('click', () => { const id = new FormData(document.getElementById('ht-form')).get('command'); applyHalftime(m, HALFTIME_COMMANDS[id].name, HALFTIME_COMMANDS[id].effects); saveState(); go('/match'); });
}

function finalizeAndStore() {
  const m = finalizeMatch(state.currentMatch);
  const s = state.season, f = m.fixture;
  const userTeam = getTeamById(m.userTeamId), opp = getTeamById(m.opponentId);
  let highlights = [];
  let knockoutUpdate = null;
  if (m.stage === 'league') {
    const homeGoals = f.home ? m.score.user : m.score.opponent;
    const awayGoals = f.home ? m.score.opponent : m.score.user;
    applyResult(s.standings, m.homeTeamId, m.awayTeamId, homeGoals, awayGoals);
    highlights = simulateComputerRound(s, m.homeTeamId, m.awayTeamId);
  } else {
    processKnockoutResult(s, m);
    knockoutUpdate = s.knockout?.bracketLog?.at(-1) || null;
  }
  const summary = { id: m.id, round: m.round, stage: m.stage, userTeamName: userTeam.zhName || userTeam.name, opponentName: opp.zhName || opp.name, opponentId: opp.id, score: m.score, xg: m.xg, outcome: matchOutcome(m), choices: m.choices, timeline: m.timeline, tactics: m.tactics, halftime: m.halftime, highlights, goals: m.goals || [], injuries: m.injuries || [], penalty: m.penalty, cards: [...(m.cards || []), ...(m.redCards || [])], redCards: m.redCards || [], knockoutUpdate };
  s.history.push(summary);
  if (m.stage === 'league') {
    const playedLeague = s.history.filter(x => x.stage === 'league').length;
    if (playedLeague < s.maxLeagueRounds) {
      s.round = Math.max(s.round, m.round + 1);
      s.awaitingManagement = true;
    } else {
      s.awaitingManagement = false;
    }
  }
  processSuspensionsAfterMatch(s, m);
  state.lastResult = summary;
  state.currentMatch = null;
  saveState();
}

function renderPostmatch() {
  const r = state.lastResult; if (!r) return go('/season');
  const isLastLeague = r.stage === 'league' && r.round >= (state.season?.maxLeagueRounds || 8);
  const isLeague = r.stage === 'league';
  const nextButton = isLastLeague ? `<button class="primary" data-go="/league-result">查看联赛阶段结算</button>` : isLeague ? `<button class="primary" data-go="/management">进入轮间管理</button>` : `<button class="primary" data-go="/season">继续淘汰赛路径</button>`;
  set(html`<section class="card"><h2>赛后报告</h2><div class="scoreboard"><h3>${r.userTeamName}</h3><div class="score">${r.score.user} - ${r.score.opponent}</div><h3>${r.opponentName}</h3></div><div class="kpi"><div><strong>${r.xg.user.toFixed(2)}</strong>你的 xG</div><div><strong>${r.xg.opponent.toFixed(2)}</strong>对手 xG</div><div><strong>${r.outcome}</strong>结果</div></div>${r.goals?.length ? `<h3>进球记录</h3><p class="goal-line">${goalList(r.goals)}</p>` : '<p class="meta">本场没有进球。</p>'}${r.injuries?.length ? `<h3>关键伤情</h3><p class="meta">${r.injuries.map(x=>`${x.minute}' ${x.playerZhName}伤退`).join('；')}</p>` : ''}${r.cards?.length ? `<h3>纪律事件</h3><p class="meta">${r.cards.map(x=>`${x.minute}' ${x.playerZhName}${x.type==='second_yellow_red'?'两黄变红':'黄牌'}`).join('；')}</p>` : ''}${r.penalty ? `<p class="meta">点球大战：${r.penalty.user}-${r.penalty.opponent}</p>` : ''}<h3>${isLeague ? '本轮焦点' : '淘汰赛进展'}</h3><p class="meta">${isLeague ? (r.highlights.join('；') || '暂无明显爆冷。') : (r.knockoutUpdate || '路径已更新。')}</p><div class="actions">${nextButton}<button data-go="/standings">查看积分榜</button></div></section>`);
}

function renderManagement() {
  if (!ensureSeason()) return;
  const choices = [['recovery','恢复'],['tactical','战术演练'],['attack','进攻训练'],['defense','防守训练'],['setpiece','定位球专项'],['rotation','轮换计划'],['mentality','大赛心理准备'],['care','重点球员护理']];
  set(`<section class="card"><h2>轮间管理</h2><p class="meta">每轮后选择 1 个主管理方案，影响体能、锐度、战术熟练度和士气。</p><div class="grid">${choices.map(([id,name])=>`<button data-management="${id}">${name}</button>`).join('')}</div></section>`);
  document.querySelectorAll('[data-management]').forEach(btn => btn.addEventListener('click', () => {
    const wasAwaiting = !!state.season.awaitingManagement;
    applyManagement(state.season, btn.dataset.management);
    state.season.awaitingManagement = false;
    const playedLeague = state.season.history.filter(x => x.stage === 'league').length;
    if (state.season.stage === 'league' && playedLeague >= state.season.maxLeagueRounds) {
      completeLeaguePhase(state.season);
      if (state.season.completed && !state.season.archived) { state.season.archived = true; addSeasonArchive({ ...state.season, archivedAt: new Date().toISOString() }); }
      saveState(); go('/league-result'); return;
    }
    if (!wasAwaiting) { advanceRound(state.season); finishLeagueIfNeeded(state.season); }
    if (state.season.completed && !state.season.archived) { state.season.archived = true; addSeasonArchive({ ...state.season, archivedAt: new Date().toISOString() }); }
    saveState(); go('/season');
  }));
}

function renderStandings() {
  if (!ensureSeason()) return;
  const ranked = rankedStandings(state.season.standings);
  set(`<div class="section-title"><h2>联赛阶段积分榜</h2><button data-go="/season">返回赛季</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>球队</th><th>赛</th><th>胜</th><th>平</th><th>负</th><th>进</th><th>失</th><th>净</th><th>分</th><th>区域</th></tr></thead><tbody>${ranked.map(s=>`<tr class="${s.teamId===state.season.userTeamId?'highlight':''}"><td>${s.rank}</td><td>${s.zhName || s.teamName}</td><td>${s.played}</td><td>${s.won}</td><td>${s.drawn}</td><td>${s.lost}</td><td>${s.gf}</td><td>${s.ga}</td><td>${s.gd}</td><td><strong>${s.points}</strong></td><td>${zoneLabel(s.zone)}</td></tr>`).join('')}</tbody></table></div>`);
}

function renderKnockout() {
  if (!ensureSeason()) return;
  const s = state.season;
  const pairs = s.knockout?.playoffPairs || generatePlayoffPairs(s.standings);
  const reports = s.knockout?.playoffReports || [];
  const current = currentFixture(s);
  const opp = current ? getTeamById(current.opponentId) : null;
  set(`<section class="card"><div class="section-title"><h2>淘汰赛路径 / 抽签</h2><button data-go="/season">返回赛季</button></div><p class="meta">${describeUserPath(s)}</p>${opp ? `<p>当前路径：${stageName(s.stage)} vs <strong>${opp.zhName || opp.name}</strong></p>` : ''}<div class="grid">${pairs.map(p=>`<div class="timeline-item"><strong>${p.seeded?.zhName || p.seeded?.teamName}</strong><br>vs<br><strong>${p.unseeded?.zhName || p.unseeded?.teamName}</strong><p class="small">附加赛种子队原则上次回合主场</p></div>`).join('')}</div>${reports.length ? `<h3>已模拟的附加赛战报</h3><div class="timeline">${reports.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div>` : ''}<div class="actions"><button data-go="/season">返回</button></div></section>`);
}

function renderHistory() {
  const archive = loadArchive();
  const current = state.season ? [state.season] : [];
  const seen = new Set();
  const list = [...current, ...archive].filter(s => {
    if (!s?.id || seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
  set(`<div class="section-title"><h2>历史记录</h2><button class="danger" id="clear-history">清空历史</button></div><div class="timeline season-history-list">${list.map(seasonHistoryCard).join('') || '<p class="meta">暂无历史。</p>'}</div>`);
  document.getElementById('clear-history').addEventListener('click', () => { if (confirm('确定清空历史和当前存档？')) { clearArchive(); resetState(); render(); } });
}

function seasonHistoryCard(s) {
  const matches = s.history || [];
  const gf = matches.reduce((sum, m) => sum + (m.score?.user || 0), 0);
  const ga = matches.reduce((sum, m) => sum + (m.score?.opponent || 0), 0);
  const wins = matches.filter(m => m.outcome === 'win').length;
  const latest = matches.at(-1);
  const status = s.completed ? '已结束' : '进行中';
  const finish = seasonFinishText(s);
  return `<div class="timeline-item season-history-card"><div class="history-card-main"><strong>${s.userTeamZhName || s.userTeamName || '未知球队'} · ${status}</strong><br><span class="meta">${finish} · ${matches.length} 场 · ${wins} 胜 · 进 ${gf} / 失 ${ga}</span>${latest ? `<br><span class="small">最近一场：${latest.userTeamName} ${latest.score.user}-${latest.score.opponent} ${latest.opponentName}</span>` : ''}</div><div class="actions"><button class="primary" data-go="/season-detail/${s.id}">打开赛季档案</button></div></div>`;
}

function findSeasonRecord(id) {
  if (state.season?.id === id) return state.season;
  return loadArchive().find(s => s.id === id) || null;
}

function renderSeasonDetail(id) {
  const s = findSeasonRecord(id);
  if (!s) return go('/history');
  const team = getTeamById(s.userTeamId) || { zhName: s.userTeamZhName || s.userTeamName || '未知球队', name: s.userTeamName || '' };
  const matches = s.history || [];
  const gf = matches.reduce((sum, m) => sum + (m.score?.user || 0), 0);
  const ga = matches.reduce((sum, m) => sum + (m.score?.opponent || 0), 0);
  const xgf = matches.reduce((sum, m) => sum + (m.xg?.user || 0), 0);
  const xga = matches.reduce((sum, m) => sum + (m.xg?.opponent || 0), 0);
  const wins = matches.filter(m => m.outcome === 'win').length;
  const draws = matches.filter(m => m.outcome === 'draw').length;
  const losses = matches.filter(m => m.outcome === 'loss').length;
  const goals = matches.flatMap(m => m.goals || []);
  const cards = matches.flatMap(m => m.cards || []);
  const injuries = matches.flatMap(m => m.injuries || []);
  const finish = seasonFinishText(s);
  const radar = seasonRadarCard(s);
  const management = (s.managementHistory || []).length ? `<section class="card"><h3>轮间管理记录</h3><div class="timeline">${s.managementHistory.map((m, i)=>`<div class="timeline-item"><strong>第 ${i+1} 次管理：${(m.label || managementLabel(m.choice || m.type || m))}</strong><br><span class="meta">影响体能、锐度、战术熟练度和士气。</span></div>`).join('')}</div></section>` : '';
  const bracket = s.knockout?.bracketLog?.length ? `<section class="card"><h3>淘汰赛路径</h3><div class="timeline">${s.knockout.bracketLog.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></section>` : '';
  set(`<section class="hero"><p class="eyebrow">Season Archive</p><h2>${team.zhName || team.name} · 赛季档案</h2><p>${finish}</p><div class="actions"><button data-go="/history">返回历史记录</button><button class="primary" data-go="/teams">重新开档</button></div></section><section class="card"><h3>赛季总览</h3><div class="kpi"><div><strong>${matches.length}</strong>总场次</div><div><strong>${wins}-${draws}-${losses}</strong>胜平负</div><div><strong>${gf}-${ga}</strong>总进失球</div><div><strong>${xgf.toFixed(2)}-${xga.toFixed(2)}</strong>总 xG</div><div><strong>${goals.length}</strong>进球事件</div><div><strong>${cards.length}</strong>纪律事件</div><div><strong>${injuries.length}</strong>伤退事件</div><div><strong>${s.leagueRank || '-'}</strong>联赛阶段排名</div></div></section>${radar}<section class="card"><h3>比赛记录</h3><p class="meta">点击任意比赛可查看单场关键抉择、进球、伤情和纪律细节。</p><div class="timeline">${matches.slice().reverse().map(matchSummaryCard).join('') || '<p class="meta">暂无比赛记录。</p>'}</div></section>${bracket}${management}`);
}

function managementLabel(type) {
  const labels = { recovery:'恢复', tactical:'战术演练', attack:'进攻训练', defense:'防守训练', setpiece:'定位球专项', rotation:'轮换计划', mentality:'大赛心理准备', care:'重点球员护理' };
  return labels[type] || type || '综合管理';
}

function seasonFinishText(s) {
  if (s.finish === 'champion' || s.stage === 'champion') return '欧冠冠军，赛季圆满结束。';
  if (s.finish === 'league_eliminated') return `联赛阶段第 ${s.leagueRank || '-'} 名出局。`;
  if ((s.finish || '').includes('eliminated')) return `${stageName(String(s.finish).replace('_eliminated',''))}出局。`;
  if (s.completed) return '赛季已结束。';
  return `${stageName(s.stage || 'league')}进行中。`;
}

function renderMatchDetail(id) {
  const m = state.season?.history?.find(x=>x.id===id) || loadArchive().flatMap(s=>s.history||[]).find(x=>x.id===id);
  if (!m) return go('/history');
  set(`<section class="card"><h2>单场详情</h2><p class="meta">${m.userTeamName} ${m.score.user}-${m.score.opponent} ${m.opponentName} · xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}</p>${m.goals?.length ? `<h3>进球记录</h3><p class="goal-line">${goalList(m.goals)}</p>` : ''}${m.injuries?.length ? `<h3>关键伤情</h3><p class="meta">${m.injuries.map(x=>`${x.minute}' ${x.playerZhName}伤退`).join('；')}</p>` : ''}${m.cards?.length ? `<h3>纪律事件</h3><p class="meta">${m.cards.map(x=>`${x.minute}' ${x.playerZhName}${x.type==='second_yellow_red'?'两黄变红':'黄牌'}`).join('；')}</p>` : ''}<h3>关键抉择</h3><div class="timeline">${m.timeline.map(timelineItem).join('')}</div><div class="actions"><button data-go="/history">返回历史</button><button data-go="/season">返回赛季</button></div></section>`);
}
