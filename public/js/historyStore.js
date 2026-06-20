import { safeJsonParse } from './utils.js';
const KEY = 'ucl-simulator-archive-v1';
const MAX_SEASONS = 8;
export function loadArchive() { return safeJsonParse(localStorage.getItem(KEY), []); }
export function saveArchive(archive) { localStorage.setItem(KEY, JSON.stringify(archive.slice(0, MAX_SEASONS))); }
export function addSeasonArchive(season) {
  const archive = loadArchive();
  archive.unshift(season);
  saveArchive(archive);
}
export function clearArchive() { localStorage.removeItem(KEY); }
