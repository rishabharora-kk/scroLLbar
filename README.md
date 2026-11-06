# scroLLbar

**A touch-first scrollbar for long, dense documents.** Skim by recognition with a heading reel, jump precisely through Contents, and return to the exact previous scroll position.

## [Try the live interactive demo](https://rishabharora-kk.github.io/scroLLbar/)

[GitHub Pages demo](https://rishabharora-kk.github.io/scroLLbar/) · [Demo source](index.html) · [Library demo](demo/index.html) · [Implementation](src/) · [Tests](tests/)

The **root `index.html` is completely self-contained**: open directly in a browser, without a build, package manager, server, or dependencies. The [official GitHub Pages demo](https://rishabharora-kk.github.io/scroLLbar/) is deployed from `main` and has been verified to render all 38 chapters. [HTML Preview](https://htmlpreview.github.io/?https://github.com/rishabharora-kk/scroLLbar/blob/main/index.html) is an alternative direct-from-repository preview. GitHub Pages deployment is automated from `main` by the included workflow.

### Demo gestures

- Drag the **small right-hand thumb** to scrub; the 3-row reel follows the thumb, continuously interpolating between headings.
- Slide your finger **150px toward the center** to preview cancellation and release to return to your initial scroll offset.
- Jump by over **1.5 viewports** to reveal **Back**, which restores the exact offset you left.
- Select **Contents** for an outline and section jump; select **Core only** to remove the optional modules.
- Try keyboard focus on the grip: arrows, PageUp/PageDown, Home, End. Try dark mode and reduced-motion preferences.

## Using the importable implementation

The distributable package lives in `src/`. It is plain JavaScript ES modules and CSS, independent of React, Vue, and other frameworks.

```html
<link rel="stylesheet" href="/path/to/src/core.css">
<link rel="stylesheet" href="/path/to/src/modules.css">
<script type="module">
  import { createIntentScrollbar } from '/path/to/src/index.mjs';
  const rail = createIntentScrollbar({
    root: document.querySelector('article'),
    options: { contents: true },
  });
  await rail.ready;
  // rail.destroy() when the reader unmounts
</script>
```

The independent **scrollbar-only core** does not import any optional modules:

```js
import { createScrollbar } from './src/core.mjs';
// Include core.css via stylesheet link or bundler import.
const rail = createScrollbar({
  scroller: document.querySelector('.reader-scroll'),
  root: document.querySelector('.reader-body'),
  options: {
    reel: false, contents: false, backChip: false, landmarks: false,
    cancel: false, snap: false, haptics: false, pageNumbers: false
  }
});
rail.destroy();
```

## Options

| Option | Default | Behavior |
|---|---|---|
| `reel` | `true` | Fixed-size, 3-row reel, only during drag |
| `contents` | `false` | Outline button and accessible bottom sheet |
| `backChip` | `true` | Exact-position Back chip after large jump |
| `landmarks` | `true` | Figures/tables dots; top heading ticks |
| `cancel` | `true` | Inward drag previews cancellation |
| `snap` | `true` | Snap to headings near visible top on release |
| `haptics` | `true` | Feature-detected `navigator.vibrate(6)` |
| `pageNumbers` | `true` | Real page data only, hidden otherwise |
| `cancelDistance` | `150` px | Horizontal cancellation threshold |
| `snapDistance` | `60` px | Heading proximity for snap |
| `backThreshold` | `1.5` viewports | Jump length that reveals Back |
| `backTimeoutMs` | `9000` ms | Back chip display duration |
| `gripWidth` | `44` px | Touch-capturing grip width |
| `thumbMin` | `40` px | Minimum thumb size |
| `reelRowHeight` | `30` px | Distance between reel rows |
| `blurStartRowsPerSec` | `8` | Blur begins above this speed |
| `headingSelector` | `h1,h2,h3,h4` | Default heading selector |
| `landmarkSelector` | `figure,table` | Default landmark selector |
| `stickyOffset` | `'auto'` | Sticky toolbar clearance; px override supported |
| `edgeInset` | `12` px | Inset from physical display edge |

### Supply headings, landmarks, and pages

With no adapters, headings come from `h1` through `h4`, landmarks from `figure` and `table`. Override `headingSelector` and `landmarkSelector`, or supply arrays/adapters:

```js
createIntentScrollbar({
  scroller: document.querySelector('.reader-scroll'),
  root: document.querySelector('article'),
  getHeadings: root => [...root.querySelectorAll('[data-section]')].map(el => ({
    element: el, title: el.dataset.section, level: 2
  })),
  getLandmarks: root => [...root.querySelectorAll('[data-landmark]')].map(el => ({
    element: el, label: el.dataset.landmark, type: 'figure'
  })),
  pages: [{ page: 1, element: document.querySelector('[data-page="1"]') }],
  options: { contents: true }
});
```

For virtualized readers provide `top` in scroll-content coordinates and call `refresh()` when heights/route change.

## Checks

```sh
npm run check          # 5 math tests + TypeScript consumer + syntax
python3 tests/e2e.py   # Python Playwright + Chromium required
npm run demo           # http://localhost:8765/demo/
```

The `demo/` entry uses the ESM library and tests integration. The root `index.html` is a separate **zero-setup** public showcase. The provided package has no third-party runtime dependencies.

Physical iOS/Android haptics, system back gestures, and notch cutouts remain to be verified. Original Chromium touch emulation used 390×844. The unminified core + math is about 5.3 KB gzipped, above the aspirational 3 KB target. See [implementation notes](IMPLEMENTATION_NOTES.md).
