import { clamp, getMaxScroll, getThumbHeight, scrollToThumb, thumbToScroll, sectionProgress, snapTarget, exceedsBackThreshold } from './math.mjs';

/** The independent scrollbar core. No imports of optional UI modules. */
export const DEFAULTS = Object.freeze({
  reel: true, contents: false, backChip: true, landmarks: true,
  cancel: true, snap: true, haptics: true, pageNumbers: true,
  cancelDistance: 150, snapDistance: 60, backThreshold: 1.5,
  backTimeoutMs: 9000, gripWidth: 44, thumbMin: 40,
  reelRowHeight: 30, blurStartRowsPerSec: 8,
  headingSelector: 'h1,h2,h3,h4', landmarkSelector: 'figure,table',
  stickyOffset: 'auto', edgeInset: 12,
});

const readDirection = (node) => getComputedStyle(node instanceof Element ? node : document.documentElement).direction;
const isWindow = (s) => s === window;
const docScroller = () => document.scrollingElement || document.documentElement;
const contentRoot = (s) => isWindow(s) ? document.documentElement : s;
const getOffset = (s) => isWindow(s) ? docScroller().scrollTop : s.scrollTop;
const setOffset = (s, y) => {
  // Direct assignment deliberately bypasses CSS scroll-behavior and any tween lag.
  if (isWindow(s)) docScroller().scrollTop = y;
  else s.scrollTop = y;
};
const setInstantOffset = (s, y) => {
  const target = isWindow(s) ? docScroller() : s;
  const previous = target.style.scrollBehavior;
  target.style.scrollBehavior = 'auto';
  setOffset(s, y);
  target.style.scrollBehavior = previous;
};
const currentTitle = (items, index) => items[index]?.title || 'Document';

export function createScrollbar(config = {}) {
  if (typeof window === 'undefined') throw new Error('Intent scrollbar requires a browser');
  const options = { ...DEFAULTS, ...config.options };
  const scroller = config.scroller || window;
  const root = config.root || contentRoot(scroller);
  const rtl = readDirection(isWindow(scroller) ? document.documentElement : scroller) === 'rtl';
  const listeners = new Set();
  const host = document.createElement('div');
  host.className = 'is-host';
  host.setAttribute('data-intent-scrollbar', '');
  const track = document.createElement('div');
  track.className = 'is-track';
  const thumb = document.createElement('div');
  thumb.className = 'is-thumb';
  const grip = document.createElement('div');
  grip.className = 'is-grip';
  grip.setAttribute('role', 'slider');
  grip.setAttribute('tabindex', '0');
  grip.setAttribute('aria-label', 'Document position');
  grip.setAttribute('aria-orientation', 'vertical');
  grip.setAttribute('aria-valuemin', '0');
  grip.setAttribute('aria-valuemax', '100');
  grip.style.width = `${options.gripWidth}px`;
  track.append(thumb, grip);
  host.append(track);
  const safeProbe = document.createElement('div');
  safeProbe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-right:env(safe-area-inset-right,0px);padding-bottom:env(safe-area-inset-bottom,0px);padding-left:env(safe-area-inset-left,0px)';
  host.append(safeProbe);
  document.body.append(host);
  const nativeTarget = isWindow(scroller) ? document.documentElement : scroller;
  nativeTarget.classList.add('is-hide-native-scrollbar');

  let headings = [], headingTops = [], landmarks = [], pages = [], geometry = {}, frame = 0, remeasureFrame = 0;
  let drag = null, idleTimer = 0, lastIndex = -1, destroyed = false, stickyOffset = 0;
  let previousScrollBehavior = '';
  const notify = (name, detail) => { for (const fn of listeners) fn(name, detail); };
  const relativeTop = (el, rect) => el.getBoundingClientRect().top - rect.top + getOffset(scroller);
  const normalize = (data, kind, rect) => {
    const selector = kind === 'headings' ? options.headingSelector : options.landmarkSelector;
    const adapter = kind === 'headings' ? config.getHeadings : config.getLandmarks;
    const supplied = data ?? (adapter ? adapter(root) : Array.from(root.querySelectorAll(selector)));
    return Array.from(supplied).map((item, i) => {
      const el = item instanceof Element ? item : item.element;
      const top = typeof item.top === 'number' ? item.top : el ? relativeTop(el, rect) : 0;
      const type = kind === 'headings' ? 'heading' : (item.type || (el?.tagName.toLowerCase() === 'table' ? 'table' : 'figure'));
      const title = kind === 'headings' ? (item.title || el?.textContent?.trim() || `Section ${i + 1}`) : (item.label || el?.getAttribute('aria-label') || el?.querySelector('figcaption,caption')?.textContent?.trim() || `${type === 'table' ? 'Table' : 'Figure'} ${i + 1}`);
      return { element: el, top, title: title.replace(/\s+/g, ' '), type, level: item.level || (el ? Number(el.tagName.substring(1)) || 4 : 4), page: item.page };
    }).sort((a, b) => a.top - b.top);
  };
  const detectHeader = (rect) => {
    if (typeof options.stickyOffset === 'number') return options.stickyOffset;
    let tallest = 0;
    for (const node of document.querySelectorAll('header,[data-sticky-header]')) {
      if (host.contains(node)) continue;
      const style = getComputedStyle(node);
      if (style.position !== 'sticky' && style.position !== 'fixed') continue;
      const b = node.getBoundingClientRect();
      if (b.height > 0 && b.top <= rect.top + 2 && b.bottom > rect.top) tallest = Math.max(tallest, Math.min(b.bottom - rect.top, rect.height * .4));
    }
    return tallest;
  };
  function measure() {
    if (destroyed) return;
    const rect = isWindow(scroller) ? { top: 0, left: 0, right: innerWidth, width: innerWidth, height: innerHeight } : scroller.getBoundingClientRect();
    const viewport = isWindow(scroller) ? innerHeight : scroller.clientHeight;
    const contentHeight = isWindow(scroller) ? docScroller().scrollHeight : scroller.scrollHeight;
    const maxScroll = getMaxScroll(contentHeight, viewport);
    const inset = 12;
    const safeStyle = getComputedStyle(safeProbe);
    const safeTop = parseFloat(safeStyle.paddingTop) || 0;
    const safeBottom = parseFloat(safeStyle.paddingBottom) || 0;
    const safeSide = parseFloat(rtl ? safeStyle.paddingLeft : safeStyle.paddingRight) || 0;
    const topInset = Math.max(inset, safeTop);
    const bottomInset = Math.max(inset, safeBottom);
    stickyOffset = detectHeader(rect);
    const trackHeight = Math.max(0, rect.height - stickyOffset - topInset - bottomInset);
    const thumbHeight = getThumbHeight(viewport, contentHeight, options.thumbMin, trackHeight);
    const travel = Math.max(0, trackHeight - thumbHeight);
    const edge = Math.max(8, options.edgeInset + (rtl ? 6 : 0), safeSide + 8);
    const trackLeft = rtl ? rect.left + edge : rect.right - edge - 8;
    geometry = { rect, viewport, maxScroll, contentHeight, safeTop, safeBottom, trackTop: rect.top + stickyOffset + topInset, trackLeft, trackHeight, thumbHeight, travel };
    host.style.setProperty('--is-track-top', `${geometry.trackTop}px`);
    host.style.setProperty('--is-track-left', `${trackLeft}px`);
    track.style.height = `${trackHeight}px`;
    thumb.style.height = `${thumbHeight}px`;
    grip.style.height = `${thumbHeight + 24}px`;
    grip.style.left = rtl ? '0px' : `${8 - options.gripWidth}px`;
    headings = normalize(config.headings, 'headings', rect);
    headingTops = headings.map(h => h.top);
    landmarks = normalize(config.landmarks, 'landmarks', rect);
    const pageSource = typeof config.pages === 'function' ? config.pages(root) : config.pages;
    pages = (pageSource || []).map((page) => ({ ...page, top: typeof page.top === 'number' ? page.top : page.element ? relativeTop(page.element, rect) : 0 })).sort((a, b) => a.top - b.top);
    host.classList.toggle('is-no-scroll', maxScroll <= 0);
    notify('measure', snapshot());
    schedule();
  }
  function scheduleMeasure() {
    if (remeasureFrame || destroyed) return;
    remeasureFrame = requestAnimationFrame(() => { remeasureFrame = 0; measure(); });
  }
  function snapshot() {
    const scrollTop = getOffset(scroller);
    const { index, progress } = sectionProgress(headingTops, scrollTop);
    return { scrollTop, headings, landmarks, pages, geometry, index, progress, title: currentTitle(headings, index), stickyOffset, rtl, drag, options };
  }
  function render() {
    frame = 0;
    if (destroyed) return;
    const state = snapshot();
    const y = scrollToThumb(state.scrollTop, geometry.maxScroll, geometry.travel);
    thumb.style.transform = `translate3d(0,${y}px,0)`;
    grip.style.transform = `translate3d(0,${y - 12}px,0)`;
    grip.setAttribute('aria-valuenow', String(Math.round(geometry.maxScroll ? state.scrollTop / geometry.maxScroll * 100 : 0)));
    grip.setAttribute('aria-valuetext', state.title);
    if (drag && state.index !== lastIndex && options.haptics && typeof navigator.vibrate === 'function') navigator.vibrate(6);
    lastIndex = state.index;
    notify('render', { ...state, thumbY: y });
  }
  const schedule = () => { if (!frame && !destroyed) frame = requestAnimationFrame(render); };
  function onScroll() {
    host.classList.add('is-scrolling');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => host.classList.remove('is-scrolling'), 650);
    schedule();
  }
  const previous = () => getOffset(scroller);
  const jump = (top, origin = previous(), cause = 'jump') => {
    const target = clamp(top, 0, geometry.maxScroll);
    setInstantOffset(scroller, target);
    schedule();
    notify('jump', { origin, target, cause, viewport: geometry.viewport, section: currentTitle(headings, sectionProgress(headingTops, origin).index) });
  };
  function begin(e) {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0) || geometry.maxScroll <= 0) return;
    e.preventDefault();
    const y = scrollToThumb(getOffset(scroller), geometry.maxScroll, geometry.travel);
    drag = { id: e.pointerId, start: getOffset(scroller), grab: e.clientY - geometry.trackTop - y, cancelled: false, pointerX: e.clientX };
    previousScrollBehavior = (isWindow(scroller) ? docScroller() : scroller).style.scrollBehavior;
    (isWindow(scroller) ? docScroller() : scroller).style.scrollBehavior = 'auto';
    grip.setPointerCapture(e.pointerId);
    host.classList.add('is-dragging');
    notify('dragstart', snapshot());
    schedule();
  }
  function move(e) {
    if (!drag || drag.id !== e.pointerId) return;
    e.preventDefault();
    const away = rtl ? e.clientX - geometry.rect.left : geometry.rect.right - e.clientX;
    const cancelled = !!options.cancel && away > options.cancelDistance;
    if (cancelled !== drag.cancelled) {
      drag.cancelled = cancelled;
      notify('cancelchange', snapshot());
    }
    setOffset(scroller, cancelled ? drag.start : thumbToScroll(e.clientY, drag.grab, geometry.trackTop, geometry.travel, geometry.maxScroll));
    schedule();
  }
  function finish(e, forceCancel = false) {
    if (!drag || (e && drag.id !== e.pointerId)) return;
    const start = drag.start;
    const cancelled = forceCancel || drag.cancelled;
    drag = null;
    host.classList.remove('is-dragging');
    (isWindow(scroller) ? docScroller() : scroller).style.scrollBehavior = previousScrollBehavior;
    if (cancelled) setInstantOffset(scroller, start);
    else if (options.snap) {
      const target = snapTarget(headingTops, getOffset(scroller), geometry.maxScroll, options.snapDistance, stickyOffset);
      if (target !== null) setInstantOffset(scroller, target);
    }
    const target = getOffset(scroller);
    if (!cancelled && exceedsBackThreshold(start, target, geometry.viewport, options.backThreshold)) notify('jump', { origin: start, target, cause: 'drag', viewport: geometry.viewport, section: currentTitle(headings, sectionProgress(headingTops, start).index) });
    notify('dragend', { cancelled, start, target });
    schedule();
    if (e && grip.hasPointerCapture(e.pointerId)) grip.releasePointerCapture(e.pointerId);
  }
  const onPointerCancel = (e) => finish(e, true);
  const onLostPointerCapture = (e) => { if (drag?.id === e.pointerId) finish(e, true); };
  function onKey(e) {
    const delta = { ArrowUp: -1, ArrowDown: 1, PageUp: -3, PageDown: 3 }[e.key];
    if (delta === undefined && !['Home', 'End'].includes(e.key)) return;
    e.preventDefault();
    if (!headings.length) {
      jump(e.key === 'Home' ? 0 : e.key === 'End' ? geometry.maxScroll : previous() + (delta || 0) * geometry.viewport, previous(), 'keyboard');
      return;
    }
    const index = sectionProgress(headingTops, getOffset(scroller), stickyOffset + 30).index;
    const targetIndex = e.key === 'Home' ? 0 : e.key === 'End' ? headings.length - 1 : clamp(index + delta, 0, headings.length - 1);
    jump(headings[targetIndex].top - stickyOffset, previous(), 'keyboard');
  }
  grip.addEventListener('pointerdown', begin);
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', finish);
  grip.addEventListener('pointercancel', onPointerCancel);
  grip.addEventListener('lostpointercapture', onLostPointerCapture);
  grip.addEventListener('keydown', onKey);
  scroller.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', scheduleMeasure);
  window.visualViewport?.addEventListener('resize', scheduleMeasure);
  const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure);
  ro?.observe(root);
  // A fixed-height scroller need not resize when its contents expand. Observe its children too.
  if (!isWindow(scroller)) Array.from(root.children).forEach(child => ro?.observe(child));
  root.addEventListener('load', scheduleMeasure, true);
  if (root !== scroller && !isWindow(scroller)) ro?.observe(scroller);
  const mo = typeof MutationObserver === 'undefined' ? null : new MutationObserver((changes) => {
    if (changes.some(c => c.type === 'childList' && !host.contains(c.target))) {
      if (!isWindow(scroller)) Array.from(root.children).forEach(child => ro?.observe(child));
      scheduleMeasure();
    }
  });
  mo?.observe(root, { subtree: true, childList: true });
  measure();
  return {
    host, track, grip, thumb, options, getState: snapshot, refresh: scheduleMeasure,
    jump, on(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(idleTimer); cancelAnimationFrame(frame); cancelAnimationFrame(remeasureFrame);
      ro?.disconnect(); mo?.disconnect(); root.removeEventListener('load', scheduleMeasure, true);
      scroller.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', scheduleMeasure);
      window.visualViewport?.removeEventListener('resize', scheduleMeasure);
      grip.removeEventListener('pointerdown', begin); grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', finish); grip.removeEventListener('pointercancel', onPointerCancel);
      grip.removeEventListener('lostpointercapture', onLostPointerCapture); grip.removeEventListener('keydown', onKey);
      if (drag) (isWindow(scroller) ? docScroller() : scroller).style.scrollBehavior = previousScrollBehavior;
      nativeTarget.classList.remove('is-hide-native-scrollbar'); host.remove(); listeners.clear();
    },
  };
}
