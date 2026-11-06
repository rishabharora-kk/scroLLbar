import { clamp } from '../math.mjs';

/** Drag-only recognition reel. Fixed geometry; rows are recycled around p. */
export function mountReel(core) {
  const { options, host } = core;
  const bubble = document.createElement('div');
  bubble.className = 'is-reel';
  bubble.setAttribute('aria-hidden', 'true');
  bubble.innerHTML = '<div class="is-reel-window"><div class="is-reel-band"></div><div class="is-reel-rows"></div></div><div class="is-reel-meta"></div><div class="is-reel-cancel">Release to cancel</div>';
  const rowsRoot = bubble.querySelector('.is-reel-rows');
  const meta = bubble.querySelector('.is-reel-meta');
  const rows = Array.from({ length: 11 }, () => {
    const el = document.createElement('div');
    el.className = 'is-reel-row';
    rowsRoot.append(el);
    return el;
  });
  bubble.style.setProperty('--is-row-height', `${options.reelRowHeight}px`);
  const reelHeight = options.reelRowHeight * 3 + 52;
  bubble.style.height = `${reelHeight}px`;
  host.append(bubble);
  let lastProgress = 0, lastTime = 0, speed = 0, blurTimer = 0;
  const setBlur = (value) => { rowsRoot.style.filter = `blur(${value.toFixed(2)}px)`; };
  function draw(state) {
    const { drag, geometry: g, headings, landmarks, pages, progress, index, thumbY } = state;
    const active = !!drag;
    bubble.classList.toggle('is-reel-visible', active);
    bubble.classList.toggle('is-reel-cancelled', !!drag?.cancelled);
    if (!active) { clearTimeout(blurTimer); setBlur(0); lastTime = 0; return; }
    const width = Math.min(236, innerWidth - 24);
    const thumbCenter = g.trackTop + thumbY + g.thumbHeight / 2;
    bubble.style.width = `${width}px`;
    bubble.style.top = `${clamp(thumbCenter - reelHeight / 2, g.safeTop + 8, Math.max(g.safeTop + 8, innerHeight - reelHeight - g.safeBottom - 8))}px`;
    bubble.style.left = `${clamp(state.rtl ? g.trackLeft + 20 : g.trackLeft - width - 12, 8, Math.max(8, innerWidth - width - 8))}px`;
    const center = Math.floor(progress);
    const rowH = options.reelRowHeight;
    for (let n = 0; n < rows.length; n++) {
      const rowIndex = center + n - 5;
      const row = rows[n];
      const data = headings[rowIndex];
      if (!data) { row.style.display = 'none'; continue; }
      row.style.display = '';
      // Fixed center band; translate continuously with fractional section progress.
      const y = rowH + (rowIndex - progress) * rowH;
      row.style.height = `${rowH}px`;
      row.style.lineHeight = `${rowH}px`;
      row.style.transform = `translate3d(0,${y}px,0)`;
      row.style.opacity = String(rowIndex === index ? 1 : clamp(0.55 - Math.abs(rowIndex - progress) * .16, .05, .55));
      row.classList.toggle('is-reel-row-current', rowIndex === index);
      if (row.textContent !== data.title) row.textContent = data.title;
    }
    const now = performance.now();
    if (lastTime) {
      const instantaneous = Math.abs(progress - lastProgress) / Math.max(.016, (now - lastTime) / 1000);
      speed = speed * .55 + instantaneous * .45;
    }
    lastTime = now; lastProgress = progress;
    setBlur(clamp((speed - options.blurStartRowsPerSec) * .13, 0, 1.6));
    clearTimeout(blurTimer);
    blurTimer = setTimeout(() => { speed = 0; setBlur(0); lastTime = 0; }, 90);
    let pageText = '';
    if (options.pageNumbers && pages.length) {
      let page = pages[0];
      for (const item of pages) { if (item.top > state.scrollTop + g.viewport * .2) break; page = item; }
      pageText = `p. ${page.page ?? pages.indexOf(page) + 1} of ${pages[pages.length - 1].page ?? pages.length}`;
    }
    const visible = landmarks.find(m => m.top >= state.scrollTop && m.top < state.scrollTop + g.viewport * .8);
    const message = [pageText, visible ? `${visible.title} on screen` : ''].filter(Boolean).join(' · ');
    if (meta.textContent !== message) meta.textContent = message;
  }
  const off = core.on((event, data) => { if (event === 'render') draw(data); });
  return () => { off(); clearTimeout(blurTimer); bubble.remove(); };
}
