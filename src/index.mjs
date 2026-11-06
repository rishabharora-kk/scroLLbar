export { createScrollbar, DEFAULTS } from './core.mjs';
export * from './math.mjs';
import { createScrollbar } from './core.mjs';

/** Optional features load on demand. Call `await instance.ready` before probing them. */
export function createIntentScrollbar(config = {}) {
  const core = createScrollbar(config);
  const cleanups = [];
  let destroyed = false;
  const mods = [
    ['reel', () => import('./modules/reel.mjs')],
    ['contents', () => import('./modules/contents.mjs')],
    ['backChip', () => import('./modules/back-chip.mjs')],
    ['landmarks', () => import('./modules/landmarks.mjs')],
  ];
  const method = { reel: 'mountReel', contents: 'mountContents', backChip: 'mountBackChip', landmarks: 'mountLandmarks' };
  const ready = Promise.all(mods.filter(([name]) => core.options[name]).map(async ([name, load]) => {
    const module = await load();
    if (!destroyed) cleanups.push(module[method[name]](core));
  }));
  return { ...core, ready, destroy() { destroyed = true; cleanups.forEach(fn => fn()); core.destroy(); } };
}
