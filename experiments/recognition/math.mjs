/** Pure geometry and retrieval helpers for the recognition-rail experiment. */
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function thumbGeometry(viewport, documentHeight, trackHeight, minThumb = 40) {
  const maxScroll = Math.max(0, documentHeight - viewport);
  const thumbHeight = clamp(trackHeight * viewport / Math.max(viewport, documentHeight), Math.min(minThumb, trackHeight), trackHeight);
  const travel = Math.max(0, trackHeight - thumbHeight);
  return { maxScroll, thumbHeight, travel };
}

/** Preserves the initial grab position: nothing jumps on pointerdown. */
export function pointerToOffset(pointerY, grabOffset, trackTop, travel, maxScroll) {
  return travel <= 0 ? 0 : clamp((pointerY - grabOffset - trackTop) / travel, 0, 1) * maxScroll;
}
export function offsetToThumb(offset, travel, maxScroll) {
  return maxScroll <= 0 ? 0 : clamp(offset / maxScroll, 0, 1) * travel;
}

/** Sorted list of landmarks, nearest document position; upper element wins ties. */
export function nearestLandmark(items, offset) {
  if (!items.length) return null;
  let low = 0, high = items.length;
  while (low < high) {
    const middle = (low + high) >>> 1;
    if (items[middle].top < offset) low = middle + 1;
    else high = middle;
  }
  if (low === 0) return items[0];
  if (low === items.length) return items[items.length - 1];
  return Math.abs(items[low].top - offset) <= Math.abs(items[low - 1].top - offset)
    ? items[low] : items[low - 1];
}

export function targetScroll(top, stickyOffset, maxScroll) {
  return clamp(top - stickyOffset - 10, 0, maxScroll);
}
export function shouldShowBack(from, to, viewport, threshold = 1.5) {
  return Math.abs(to - from) > viewport * threshold;
}
export function isCancelled(pointerX, viewportWidth, threshold, rtl = false) {
  const distanceFromEdge = rtl ? pointerX : viewportWidth - pointerX;
  return distanceFromEdge > threshold;
}
/** Choose an origin well away from the answer so tests do not start on the answer. */
export function trialOrigin(targetTop, maxScroll) {
  return maxScroll === 0 ? 0 : Math.round(maxScroll * (targetTop < maxScroll / 2 ? 0.83 : 0.07));
}
