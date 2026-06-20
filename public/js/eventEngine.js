import { EVENT_TEMPLATES } from '../data/eventTemplates.js';
export function getCurrentEvent(match) { return match?.eventPlan?.[match.eventIndex] || null; }
export function eventProgressText(match) {
  if (!match) return '';
  if (match.phase === 'halftime') return '中场调整';
  const event = getCurrentEvent(match);
  if (!event) return '比赛结束';
  if (event.isCritical) return `⚠ 关键时刻 · 第 ${event.minute} 分钟`;
  const regularBefore = match.eventPlan.slice(0, match.eventIndex).filter(e => !e.isCritical).length;
  const half = event.minute <= 45 ? '上半场' : '下半场';
  return `${half}关键抉择 ${regularBefore + 1}/7`;
}
export function getAllEventTypes() { return [...new Set(EVENT_TEMPLATES.map(e => e.type))]; }
