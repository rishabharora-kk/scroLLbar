/** Pure, DOM-free mapping helpers shared by the core and optional modules. */
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const getMaxScroll = (contentHeight, viewportHeight) => Math.max(0, contentHeight - viewportHeight);
export function getThumbHeight(viewportHeight, contentHeight, minHeight = 40, trackHeight = viewportHeight) {
  if (contentHeight <= viewportHeight) return trackHeight;
  return clamp((viewportHeight / contentHeight) * trackHeight, Math.min(trackHeight, minHeight), trackHeight);
}
export function scrollToThumb(scrollTop, maxScroll, travel) {
  return maxScroll <= 0 || travel <= 0 ? 0 : clamp(scrollTop / maxScroll, 0, 1) * travel;
}
export function thumbToScroll(pointerY, grabOffset, trackTop, travel, maxScroll) {
  return travel <= 0 || maxScroll <= 0 ? 0 : clamp(pointerY - grabOffset - trackTop, 0, travel) / travel * maxScroll;
}
/** Returns index and continuous heading progress; lookup offset is top + 30 by default. */
export function sectionProgress(positions, scrollTop, lookupOffset = 30) {
  if (!positions.length) return { index: -1, progress: 0 };
  const position = scrollTop + lookupOffset;
  let lo = 0, hi = positions.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (positions[mid] <= position) lo = mid + 1;
    else hi = mid;
  }
  const index = Math.max(0, lo - 1);
  const next = positions[index + 1];
  const gap = next === undefined ? 0 : Math.max(1, next - positions[index]);
  const fraction = next === undefined ? 0 : clamp((position - positions[index]) / gap, 0, 0.999999);
  return { index, progress: index + fraction };
}
/** Snap to a near-visible heading, respecting an occluding header and document end. */
export function snapTarget(positions, currentScroll, maxScroll, distance = 60, stickyOffset = 0) {
  if (maxScroll <= 0 || maxScroll - currentScroll <= 2) return null;
  const visibleTop = currentScroll + stickyOffset;
  let nearest = null, best = distance + Number.EPSILON;
  for (const top of positions) {
    const delta = Math.abs(top - visibleTop);
    if (delta <= distance && delta < best) { nearest = clamp(top - stickyOffset, 0, maxScroll); best = delta; }
    if (top > visibleTop + distance) break;
  }
  return nearest;
}
export const exceedsBackThreshold = (before, after, viewportHeight, viewports = 1.5) =>
  Math.abs(after - before) > viewportHeight * viewports;
