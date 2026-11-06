export type ScrollItem = { element?: Element; top?: number; title?: string; label?: string; type?: 'figure' | 'table'; page?: number; level?: number };
export type PageItem = { element?: Element; top?: number; page: number };
export interface IntentOptions {
  reel?: boolean; contents?: boolean; backChip?: boolean; landmarks?: boolean;
  cancel?: boolean; snap?: boolean; haptics?: boolean; pageNumbers?: boolean;
  cancelDistance?: number; snapDistance?: number; backThreshold?: number;
  backTimeoutMs?: number; gripWidth?: number; thumbMin?: number;
  reelRowHeight?: number; blurStartRowsPerSec?: number;
  headingSelector?: string; landmarkSelector?: string;
  stickyOffset?: number | 'auto'; edgeInset?: number;
}
export interface IntentConfig {
  scroller?: Window | HTMLElement;
  root?: Element;
  headings?: Array<Element | ScrollItem>;
  landmarks?: Array<Element | ScrollItem>;
  getHeadings?: (root: Element) => Array<Element | ScrollItem>;
  getLandmarks?: (root: Element) => Array<Element | ScrollItem>;
  pages?: Array<PageItem> | ((root: Element) => Array<PageItem>);
  options?: IntentOptions;
}
export interface IntentState {
  scrollTop: number;
  headings: Array<ScrollItem & { top: number; title: string; level: number }>;
  landmarks: Array<ScrollItem & { top: number; title: string }>;
  pages: PageItem[];
  geometry: { viewport: number; maxScroll: number; safeTop: number; safeBottom: number; trackTop: number; trackLeft: number; trackHeight: number; thumbHeight: number; travel: number };
  index: number; progress: number; title: string; stickyOffset: number; rtl: boolean;
  drag: null | { start: number; grab: number; cancelled: boolean };
  options: Required<IntentOptions>;
}
export interface IntentInstance {
  host: HTMLElement; track: HTMLElement; grip: HTMLElement; thumb: HTMLElement;
  options: Required<IntentOptions>;
  getState(): IntentState;
  refresh(): void;
  jump(top: number, origin?: number, cause?: string): void;
  on(fn: (event: string, data: any) => void): () => void;
  destroy(): void;
}
export interface FullIntentInstance extends IntentInstance { ready: Promise<void[]> }
export function createScrollbar(config?: IntentConfig): IntentInstance;
export function createIntentScrollbar(config?: IntentConfig): FullIntentInstance;
export const DEFAULTS: Readonly<Required<IntentOptions>>;
export function clamp(value: number, min: number, max: number): number;
export function getMaxScroll(contentHeight: number, viewportHeight: number): number;
export function getThumbHeight(viewportHeight: number, contentHeight: number, minHeight?: number, trackHeight?: number): number;
export function scrollToThumb(scrollTop: number, maxScroll: number, travel: number): number;
export function thumbToScroll(pointerY: number, grabOffset: number, trackTop: number, travel: number, maxScroll: number): number;
export function sectionProgress(positions: number[], scrollTop: number, lookupOffset?: number): { index: number; progress: number };
export function snapTarget(positions: number[], currentScroll: number, maxScroll: number, distance?: number, stickyOffset?: number): number | null;
export function exceedsBackThreshold(before: number, after: number, viewportHeight: number, viewports?: number): boolean;
