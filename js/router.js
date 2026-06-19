import { render } from './render.js';
export function startRouter() {
  window.addEventListener('hashchange', render);
  if (!location.hash) location.hash = '#/';
  render();
}
export function go(path) { location.hash = path.startsWith('#') ? path : `#${path}`; }
export function routeParts() { return location.hash.replace(/^#\/?/, '').split('/').filter(Boolean); }
