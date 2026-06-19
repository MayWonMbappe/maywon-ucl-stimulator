import { EVENT_TEMPLATES } from '../data/eventTemplates.js';
export function getCurrentEvent(match) { return match?.eventPlan?.[match.eventIndex] || null; }
export function eventProgressText(match) {
  if (!match) return '';
  if (match.eventIndex < 3) return `上半场关键抉择 ${match.eventIndex + 1}/3`;
  if (match.eventIndex === 3) return '中场调整';
  return `下半场关键抉择 ${match.eventIndex - 2}/4`;
}
export function getAllEventTypes() { return [...new Set(EVENT_TEMPLATES.map(e => e.type))]; }
