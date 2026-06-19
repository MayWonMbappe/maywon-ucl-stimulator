import { TEAMS, getTeamById, SELECTABLE_TEAM_IDS } from '../data/teamsData.js';
import { FORMATIONS, TACTIC_GROUPS, HALFTIME_COMMANDS, DEFAULT_TACTICS } from '../data/tacticsData.js';
import { state, saveState, resetState } from './state.js';
import { go, routeParts } from './router.js';
import { createSeason, currentFixture, simulateComputerRound, applyManagement, advanceRound, finishLeagueIfNeeded, completeLeaguePhase, processKnockoutResult } from './seasonEngine.js';
import { rankedStandings, applyResult, zoneLabel, qualificationBriefing } from './standingsEngine.js';
import { createMatch, applyEventChoice, finalizeMatch, applyHalftime, matchOutcome } from './matchEngine.js';
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
  set(html`<section class="hero"><p class="eyebrow">Season Hub</p><h2>${team.zhName || team.name} · 瑞士轮第 ${s.round} 轮</h2>
  <p>${fixture ? `下一场：${fixture.home ? '主场' : '客场'} vs ${opponent.zhName || opponent.name}` : describeUserPath(s)}</p>
  <div class="actions"><button class="primary" data-go="/prematch">进入赛前部署</button><button data-go="/standings">查看积分榜</button><button data-go="/knockout">淘汰赛路径</button></div></section>${briefing}
  <div class="section-title"><h2>近期比赛</h2></div><div class="timeline">${s.history.slice().reverse().map(matchSummaryCard).join('') || '<p class="meta">暂无比赛记录。</p>'}</div>`);
}

function renderSeasonFinished(s, team) {
  const finishText = s.finish === 'champion' ? '你赢得了欧冠冠军！' : s.finish === 'league_eliminated' ? `联赛阶段第 ${s.leagueRank} 名，赛季结束。` : `赛季结束：${stageName((s.finish || '').replace('_eliminated',''))}出局。`;
  set(`<section class="hero"><p class="eyebrow">Season Over</p><h2>${team.zhName || team.name}</h2><p>${finishText}</p><div class="actions"><button data-go="/history">查看历史记录</button><button class="primary" data-go="/teams">重新开档</button></div></section><div class="timeline">${(s.knockout?.bracketLog || []).map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div>`);
}

function renderKnockoutHub(s, team) {
  const fixture = currentFixture(s);
  const opponent = fixture ? getTeamById(fixture.opponentId) : null;
  const reports = s.knockout?.playoffReports?.length ? `<div class="card"><h3>附加赛战报</h3><div class="timeline">${s.knockout.playoffReports.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></div>` : '';
  const log = s.knockout?.bracketLog?.length ? `<div class="card"><h3>你的淘汰赛路径</h3><div class="timeline">${s.knockout.bracketLog.map(x=>`<div class="timeline-item">${x}</div>`).join('')}</div></div>` : '';
  set(html`<section class="hero"><p class="eyebrow">Knockout Stage</p><h2>${team.zhName || team.name} · ${stageName(s.stage)}</h2>
  <p>${fixture ? `下一场：${fixture.home ? '主场' : '客场/中立'} vs ${opponent.zhName || opponent.name}` : describeUserPath(s)}</p>
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
  const s = state.season, f = currentFixture(s); if (!f) return renderSeason();
  const team = getTeamById(s.userTeamId), opp = getTeamById(f.opponentId);
  const tactics = state.selectedTactics || DEFAULT_TACTICS;
  const fields = tacticForm(tactics);
  set(html`<section class="card"><h2>赛前部署 · ${stageName(s.stage)}</h2><p class="meta">${team.zhName} ${f.home?'主场':'客场/中立'} 对阵 ${opp.zhName || opp.name}。对手首发均分 ${teamAverage(opp,true)}。</p>${formationPitch(team, tactics.formation)}<div class="form-grid">${fields}</div><div class="actions"><button class="primary" id="confirm-tactics">确认并进入比赛</button><button data-go="/season">返回</button></div></section>`);
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

function formationPitch(team, formation) {
  const starters = team.squad.filter(p=>p.isStarter).slice(0,11);
  const coords = [[50,90],[20,72],[40,72],[60,72],[80,72],[30,52],[50,52],[70,52],[20,30],[50,20],[80,30]];
  return `<div class="pitch">${starters.map((p,i)=>`<div class="player-dot" style="left:${coords[i][0]}%;top:${coords[i][1]}%">${p.zhName?.split('·').pop() || p.name.split(' ').pop()}<br>${p.position}</div>`).join('')}</div><p class="small">阵型可视化为简化布局，后续可升级拖拽战术板。</p>`;
}

function renderMatch() {
  const m = state.currentMatch; if (!m) return go('/season');
  if (m.phase === 'halftime') return go('/halftime');
  if (m.phase === 'fulltime') { finalizeAndStore(); return go('/postmatch'); }
  const event = getCurrentEvent(m);
  const user = getTeamById(m.userTeamId), opp = getTeamById(m.opponentId);
  set(html`<section class="card"><div class="scoreboard"><h3>${user.zhName}</h3><div class="score">${m.score.user} - ${m.score.opponent}</div><h3>${opp.zhName || opp.name}</h3></div><p class="meta">${eventProgressText(m)} · 预计 xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}</p>
  <div class="match-event ${event.isCritical ? 'critical-moment' : ''}"><p class="eyebrow">${event.isCritical ? '⚠ 关键时刻' : `${event.minute}' · ${event.type}`}</p><h2>${event.title}</h2><p class="meta">${event.desc}</p>${event.isCritical ? '<p class="critical-note">这次选择可能直接产生进球、点球扑救、伤退调整或比分转折。</p>' : ''}<div class="option-list">${event.options.map((o,i)=>choiceButton(o,i,event.isCritical)).join('')}</div></div>
  <div class="section-title"><h2>比赛记录</h2></div><div class="timeline">${m.timeline.map(timelineItem).join('')}</div></section>`);
  document.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => { applyEventChoice(m, Number(btn.dataset.choice)); saveState(); render(); }));
}

function traitBadge(id) { return `<span class="badge tooltip-badge" title="${escapeAttr(traitTooltip(id))}" aria-label="${escapeAttr(traitTooltip(id))}">${traitLabel(id)}</span>`; }
function optionTagBadge(id) { return `<span class="badge tooltip-badge" title="${escapeAttr(optionTagTooltip(id))}" aria-label="${escapeAttr(optionTagTooltip(id))}">${optionTagLabel(id)}</span>`; }
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
  const summary = { id: m.id, round: m.round, stage: m.stage, userTeamName: userTeam.zhName || userTeam.name, opponentName: opp.zhName || opp.name, opponentId: opp.id, score: m.score, xg: m.xg, outcome: matchOutcome(m), choices: m.choices, timeline: m.timeline, tactics: m.tactics, halftime: m.halftime, highlights, goals: m.goals || [], injuries: m.injuries || [], penalty: m.penalty, knockoutUpdate };
  s.history.push(summary);
  state.lastResult = summary;
  state.currentMatch = null;
  saveState();
}

function renderPostmatch() {
  const r = state.lastResult; if (!r) return go('/season');
  const isLastLeague = state.season?.stage === 'league' && state.season.round >= state.season.maxLeagueRounds;
  const isLeague = r.stage === 'league';
  const nextButton = isLastLeague ? `<button class="primary" data-go="/league-result">查看联赛阶段结算</button>` : isLeague ? `<button class="primary" data-go="/management">进入轮间管理</button>` : `<button class="primary" data-go="/season">继续淘汰赛路径</button>`;
  set(html`<section class="card"><h2>赛后报告</h2><div class="scoreboard"><h3>${r.userTeamName}</h3><div class="score">${r.score.user} - ${r.score.opponent}</div><h3>${r.opponentName}</h3></div><div class="kpi"><div><strong>${r.xg.user.toFixed(2)}</strong>你的 xG</div><div><strong>${r.xg.opponent.toFixed(2)}</strong>对手 xG</div><div><strong>${r.outcome}</strong>结果</div></div>${r.goals?.length ? `<h3>进球记录</h3><p class="goal-line">${goalList(r.goals)}</p>` : '<p class="meta">本场没有进球。</p>'}${r.injuries?.length ? `<h3>关键伤情</h3><p class="meta">${r.injuries.map(x=>`${x.minute}' ${x.playerZhName}伤退`).join('；')}</p>` : ''}${r.penalty ? `<p class="meta">点球大战：${r.penalty.user}-${r.penalty.opponent}</p>` : ''}<h3>${isLeague ? '本轮焦点' : '淘汰赛进展'}</h3><p class="meta">${isLeague ? (r.highlights.join('；') || '暂无明显爆冷。') : (r.knockoutUpdate || '路径已更新。')}</p><div class="actions">${nextButton}<button data-go="/standings">查看积分榜</button></div></section>`);
}

function renderManagement() {
  if (!ensureSeason()) return;
  const choices = [['recovery','恢复'],['tactical','战术演练'],['attack','进攻训练'],['defense','防守训练'],['setpiece','定位球专项'],['rotation','轮换计划'],['mentality','大赛心理准备'],['care','重点球员护理']];
  set(`<section class="card"><h2>轮间管理</h2><p class="meta">每轮后选择 1 个主管理方案，影响体能、锐度、战术熟练度和士气。</p><div class="grid">${choices.map(([id,name])=>`<button data-management="${id}">${name}</button>`).join('')}</div></section>`);
  document.querySelectorAll('[data-management]').forEach(btn => btn.addEventListener('click', () => {
    applyManagement(state.season, btn.dataset.management);
    if (state.season.stage === 'league' && state.season.round >= state.season.maxLeagueRounds) {
      completeLeaguePhase(state.season);
      if (state.season.completed && !state.season.archived) { state.season.archived = true; addSeasonArchive({ ...state.season, archivedAt: new Date().toISOString() }); }
      saveState(); go('/league-result'); return;
    }
    advanceRound(state.season); finishLeagueIfNeeded(state.season);
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
  const list = [...current, ...archive];
  set(`<div class="section-title"><h2>历史记录</h2><button class="danger" id="clear-history">清空历史</button></div><div class="timeline">${list.map(s=>`<div class="timeline-item"><strong>${s.userTeamZhName || s.userTeamName}</strong><br><span class="meta">${s.completed ? '已结束' : '进行中'} · ${s.stage || '-'} · ${s.history?.length || 0}场记录</span></div>`).join('') || '<p class="meta">暂无历史。</p>'}</div>`);
  document.getElementById('clear-history').addEventListener('click', () => { if (confirm('确定清空历史和当前存档？')) { clearArchive(); resetState(); render(); } });
}

function renderMatchDetail(id) {
  const m = state.season?.history?.find(x=>x.id===id) || loadArchive().flatMap(s=>s.history||[]).find(x=>x.id===id);
  if (!m) return go('/history');
  set(`<section class="card"><h2>单场详情</h2><p class="meta">${m.userTeamName} ${m.score.user}-${m.score.opponent} ${m.opponentName} · xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}</p>${m.goals?.length ? `<h3>进球记录</h3><p class="goal-line">${goalList(m.goals)}</p>` : ''}${m.injuries?.length ? `<h3>关键伤情</h3><p class="meta">${m.injuries.map(x=>`${x.minute}' ${x.playerZhName}伤退`).join('；')}</p>` : ''}<h3>关键抉择</h3><div class="timeline">${m.timeline.map(timelineItem).join('')}</div><div class="actions"><button data-go="/history">返回历史</button><button data-go="/season">返回赛季</button></div></section>`);
}
