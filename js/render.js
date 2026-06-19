import { TEAMS, getTeamById, SELECTABLE_TEAM_IDS } from '../data/teamsData.js';
import { FORMATIONS, TACTIC_GROUPS, HALFTIME_COMMANDS, DEFAULT_TACTICS } from '../data/tacticsData.js';
import { state, saveState, resetState } from './state.js';
import { go, routeParts } from './router.js';
import { createSeason, currentFixture, simulateComputerRound, applyManagement, advanceRound, finishLeagueIfNeeded } from './seasonEngine.js';
import { rankedStandings, applyResult, zoneLabel, qualificationBriefing } from './standingsEngine.js';
import { createMatch, applyEventChoice, finalizeMatch, applyHalftime, matchOutcome } from './matchEngine.js';
import { getCurrentEvent, eventProgressText } from './eventEngine.js';
import { addSeasonArchive, loadArchive, clearArchive } from './historyStore.js';
import { teamAverage, stageName } from './utils.js';
import { describeUserPath, generatePlayoffPairs } from './knockoutEngine.js';

const app = () => document.getElementById('app');
function html(strings, ...values) { return strings.map((s, i) => s + (values[i] ?? '')).join(''); }
function set(content) { app().innerHTML = content; bindCommon(); }
function bindCommon() {
  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => go(el.dataset.go)));
}
export function render() {
  const [page, arg] = routeParts();
  if (!page) return renderHome();
  if (page === 'teams') return renderTeams();
  if (page === 'team') return renderTeam(arg);
  if (page === 'season') return renderSeason();
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
    <p>选择一支球队，完成赛前部署、上半场关键抉择、中场调整、下半场关键抉择，并在积分榜和淘汰赛路径中推进。第一版使用本地存档和纯静态 JS。</p>
    <div class="actions"><button class="primary" data-go="/teams">开始新赛季</button><button data-go="/season">继续赛季</button><button data-go="/history">历史记录</button></div>
  </section>`);
}
function renderTeams() {
  const cards = TEAMS.filter(t => SELECTABLE_TEAM_IDS.includes(t.id)).map(t => html`<article class="card">
    <h3>${t.zhName || t.name}</h3><p class="meta">${t.name} · ${t.difficultyLabel || '可选球队'} · 平均 ${teamAverage(t,true)}</p>
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
  return `<div class="table-wrap"><table><thead><tr><th>角色</th><th>位置</th><th>球员</th><th>OVR</th><th>标签</th></tr></thead><tbody>${t.squad.map(p=>`<tr><td>${p.isStarter?'首发':'替补'}</td><td>${p.position}</td><td>${p.zhName || p.name}<br><span class="small">${p.name}</span></td><td>${p.ovr}</td><td>${(p.traits||[]).map(x=>`<span class="badge">${x}</span>`).join('')}</td></tr>`).join('')}</tbody></table></div>`;
}
function ensureSeason() { if (!state.season) { go('/teams'); return false; } return true; }
function renderSeason() {
  if (!ensureSeason()) return;
  const s = state.season;
  const team = getTeamById(s.userTeamId);
  const fixture = currentFixture(s);
  const opponent = fixture ? getTeamById(fixture.opponentId) : null;
  const briefing = s.round >= 7 && s.round <= 8 ? `<div class="card"><h3>第 ${s.round} 轮出线形势</h3><p class="meta" style="white-space:pre-line">${qualificationBriefing(s)}</p></div>` : '';
  set(html`<section class="hero"><p class="eyebrow">Season Hub</p><h2>${team.zhName || team.name} · 第 ${s.round} 轮</h2>
  <p>${fixture ? `下一场：${fixture.home ? '主场' : '客场'} vs ${opponent.zhName || opponent.name}` : describeUserPath(s)}</p>
  <div class="actions"><button class="primary" data-go="/prematch">进入赛前部署</button><button data-go="/standings">查看积分榜</button><button data-go="/knockout">淘汰赛路径</button></div></section>${briefing}
  <div class="section-title"><h2>近期比赛</h2></div><div class="timeline">${s.history.slice().reverse().map(matchSummaryCard).join('') || '<p class="meta">暂无比赛记录。</p>'}</div>`);
}
function matchSummaryCard(m) { return `<div class="timeline-item"><strong>${stageName(m.stage)} 第${m.round}轮：${m.userTeamName} ${m.score.user}-${m.score.opponent} ${m.opponentName}</strong><br><span class="meta">xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)} · ${m.outcome}</span><br><button data-go="/detail/${m.id}">查看详情</button></div>`; }
function renderPrematch() {
  if (!ensureSeason()) return;
  const s = state.season, f = currentFixture(s); if (!f) return renderSeason();
  const team = getTeamById(s.userTeamId), opp = getTeamById(f.opponentId);
  const tactics = state.selectedTactics || DEFAULT_TACTICS;
  const fields = tacticForm(tactics);
  set(html`<section class="card"><h2>赛前部署</h2><p class="meta">${team.zhName} ${f.home?'主场':'客场'} 对阵 ${opp.zhName || opp.name}。对手首发均分 ${teamAverage(opp,true)}。</p>${formationPitch(team, tactics.formation)}<div class="form-grid">${fields}</div><div class="actions"><button class="primary" id="confirm-tactics">确认并进入比赛</button><button data-go="/season">返回</button></div></section>`);
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
  <div class="match-event"><p class="eyebrow">${event.minute}' · ${event.type}</p><h2>${event.title}</h2><p class="meta">${event.desc}</p><div class="option-list">${event.options.map((o,i)=>`<button data-choice="${i}">${o.text}</button>`).join('')}</div></div>
  <div class="section-title"><h2>比赛记录</h2></div><div class="timeline">${m.timeline.map(timelineItem).join('')}</div></section>`);
  document.querySelectorAll('[data-choice]').forEach(btn => btn.addEventListener('click', () => { applyEventChoice(m, Number(btn.dataset.choice)); saveState(); render(); }));
}
function timelineItem(t) { return `<div class="timeline-item"><strong>${t.minute || ''}' ${t.title}</strong><br><span class="meta">${t.resultText || t.optionText || ''}</span><br><span class="small">比分 ${t.score?.user ?? '-'}-${t.score?.opponent ?? '-'}</span></div>`; }
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
  const homeGoals = f.home ? m.score.user : m.score.opponent;
  const awayGoals = f.home ? m.score.opponent : m.score.user;
  applyResult(s.standings, m.homeTeamId, m.awayTeamId, homeGoals, awayGoals);
  const highlights = simulateComputerRound(s, m.homeTeamId, m.awayTeamId);
  const summary = { id: m.id, round: s.round, stage: s.stage, userTeamName: userTeam.zhName || userTeam.name, opponentName: opp.zhName || opp.name, opponentId: opp.id, score: m.score, xg: m.xg, outcome: matchOutcome(m), choices: m.choices, timeline: m.timeline, tactics: m.tactics, halftime: m.halftime, highlights };
  s.history.push(summary);
  state.lastResult = summary;
  state.currentMatch = null;
  saveState();
}
function renderPostmatch() {
  const r = state.lastResult; if (!r) return go('/season');
  set(html`<section class="card"><h2>赛后报告</h2><div class="scoreboard"><h3>${r.userTeamName}</h3><div class="score">${r.score.user} - ${r.score.opponent}</div><h3>${r.opponentName}</h3></div><div class="kpi"><div><strong>${r.xg.user.toFixed(2)}</strong>你的 xG</div><div><strong>${r.xg.opponent.toFixed(2)}</strong>对手 xG</div><div><strong>${r.outcome}</strong>结果</div></div><h3>本轮焦点</h3><p class="meta">${r.highlights.join('；') || '暂无明显爆冷。'}</p><div class="actions"><button class="primary" data-go="/management">进入轮间管理</button><button data-go="/standings">查看积分榜</button></div></section>`);
}
function renderManagement() {
  if (!ensureSeason()) return;
  const choices = [['recovery','恢复'],['tactical','战术演练'],['attack','进攻训练'],['defense','防守训练'],['setpiece','定位球专项'],['rotation','轮换计划'],['mentality','大赛心理准备'],['care','重点球员护理']];
  set(`<section class="card"><h2>轮间管理</h2><p class="meta">每轮后选择 1 个主管理方案，影响体能、锐度、战术熟练度和士气。</p><div class="grid">${choices.map(([id,name])=>`<button data-management="${id}">${name}</button>`).join('')}</div></section>`);
  document.querySelectorAll('[data-management]').forEach(btn => btn.addEventListener('click', () => {
    applyManagement(state.season, btn.dataset.management); advanceRound(state.season); finishLeagueIfNeeded(state.season);
    if (state.season.completed) addSeasonArchive({ ...state.season, archivedAt: new Date().toISOString() });
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
  const pairs = generatePlayoffPairs(state.season.standings);
  set(`<section class="card"><h2>淘汰赛路径</h2><p class="meta">${describeUserPath(state.season)}</p><div class="grid">${pairs.map(p=>`<div class="timeline-item"><strong>${p.seeded?.zhName || p.seeded?.teamName}</strong><br>vs<br><strong>${p.unseeded?.zhName || p.unseeded?.teamName}</strong><p class="small">附加赛种子队原则上次回合主场</p></div>`).join('')}</div></section>`);
}
function renderHistory() {
  const archive = loadArchive();
  const current = state.season ? [state.season] : [];
  const list = [...current, ...archive];
  set(`<div class="section-title"><h2>历史记录</h2><button class="danger" id="clear-history">清空历史</button></div><div class="timeline">${list.map(s=>`<div class="timeline-item"><strong>${s.userTeamZhName || s.userTeamName}</strong><br><span class="meta">${s.completed ? '已结束' : '进行中'} · 第${s.round || '-'}轮 · ${s.history?.length || 0}场记录</span></div>`).join('') || '<p class="meta">暂无历史。</p>'}</div>`);
  document.getElementById('clear-history').addEventListener('click', () => { if (confirm('确定清空历史和当前存档？')) { clearArchive(); resetState(); render(); } });
}
function renderMatchDetail(id) {
  const m = state.season?.history?.find(x=>x.id===id) || loadArchive().flatMap(s=>s.history||[]).find(x=>x.id===id);
  if (!m) return go('/history');
  set(`<section class="card"><h2>单场详情</h2><p class="meta">${m.userTeamName} ${m.score.user}-${m.score.opponent} ${m.opponentName} · xG ${m.xg.user.toFixed(2)}-${m.xg.opponent.toFixed(2)}</p><h3>关键抉择</h3><div class="timeline">${m.timeline.map(timelineItem).join('')}</div><div class="actions"><button data-go="/history">返回历史</button></div></section>`);
}
