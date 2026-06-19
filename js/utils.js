export function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
export function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function sample(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function shuffle(arr) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function sumEffects(...effectsList) {
  const out = {};
  for (const effects of effectsList.filter(Boolean)) {
    for (const [key, value] of Object.entries(effects)) out[key] = (out[key] || 0) + value;
  }
  return out;
}
export function formatSigned(n) { return n > 0 ? `+${n}` : String(n); }
export function byId(id) { return document.getElementById(id); }
export function uid(prefix = 'id') { return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
export function safeJsonParse(raw, fallback) { try { return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
export function avg(numbers) { return numbers.length ? numbers.reduce((a,b)=>a+b,0) / numbers.length : 0; }
export function teamAverage(team, onlyStarters = false) {
  const squad = onlyStarters ? team.squad.filter(p => p.isStarter) : team.squad;
  return Math.round(avg(squad.map(p => p.ovr || 70)));
}
export function hasTrait(player, trait) { return player?.traits?.includes(trait); }
export function countTrait(team, trait, startersOnly = true) {
  return (startersOnly ? team.squad.filter(p=>p.isStarter) : team.squad).filter(p => hasTrait(p, trait)).length;
}
export function stageName(stage) {
  const map = { league: '瑞士轮', playoff: '附加赛', r16: '16 强', qf: '8 强', sf: '半决赛', final: '决赛' };
  return map[stage] || stage;
}
