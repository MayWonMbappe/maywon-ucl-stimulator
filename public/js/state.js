import { safeJsonParse, uid } from './utils.js';
import { DEFAULT_TACTICS } from '../data/tacticsData.js';
const SAVE_KEY = 'ucl-simulator-current-v1';
export const state = {
  route: '#/',
  season: null,
  currentMatch: null,
  lastResult: null,
  selectedTactics: { ...DEFAULT_TACTICS }
};
export function saveState() {
  localStorage.setItem(SAVE_KEY, JSON.stringify({ season: state.season, currentMatch: state.currentMatch, lastResult: state.lastResult, selectedTactics: state.selectedTactics }));
}
export function loadState() {
  const saved = safeJsonParse(localStorage.getItem(SAVE_KEY), null);
  if (saved) Object.assign(state, saved);
}
export function resetState() {
  localStorage.removeItem(SAVE_KEY);
  state.season = null;
  state.currentMatch = null;
  state.lastResult = null;
  state.selectedTactics = { ...DEFAULT_TACTICS };
}
export function newSeasonId() { return uid('season'); }
