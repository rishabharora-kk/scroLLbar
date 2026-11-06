import { createScrollbar, createIntentScrollbar, type IntentConfig } from '../src/index.mjs';
const config: IntentConfig = {
  scroller: window,
  getHeadings: root => Array.from(root.querySelectorAll('h1,h2')),
  pages: [{ top: 0, page: 1 }],
  options: { reel: false, contents: true, cancelDistance: 150, thumbMin: 40 },
};
const core = createScrollbar(config);
core.jump(42);
core.destroy();
const full = createIntentScrollbar(config);
await full.ready;
full.destroy();
