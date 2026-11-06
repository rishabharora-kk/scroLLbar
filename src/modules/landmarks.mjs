import { scrollToThumb } from '../math.mjs';

/** Marks are intentionally noninteractive; only the grip captures touches. */
export function mountLandmarks(core) {
  const layer = document.createElement('div');
  layer.className = 'is-marks';
  core.track.prepend(layer);
  function redraw(state) {
    layer.replaceChildren();
    const { headings, landmarks, geometry: g } = state;
    const topLevel = Math.min(4, ...headings.map(h => h.level));
    const source = [...landmarks.map(m => ({ top: m.top, tick: false })), ...headings.filter(h => h.level === topLevel).map(h => ({ top: h.top, tick: true }))];
    for (const mark of source) {
      const item = document.createElement('div');
      item.className = mark.tick ? 'is-mark is-mark-heading' : 'is-mark';
      item.style.top = `${scrollToThumb(mark.top, g.maxScroll, g.travel) + g.thumbHeight / 2}px`;
      layer.append(item);
    }
  }
  const off = core.on((event, state) => { if (event === 'measure') redraw(state); });
  redraw(core.getState());
  return () => { off(); layer.remove(); };
}
