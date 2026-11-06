# Integration findings and audit

## Investigation (repository-specific)

1. Target: `rishabharora-kk/scroLLbar`, public, empty at feature start.
2. No framework, language, build, CSS, test, or lint conventions existed.
3. No scrollable document container, headings adapter, sticky toolbar, or current-section UI existed.
4. `docs/reference/intent-scrollbar.html` did not exist.
5. Reused the earlier standalone ESM/CSS implementation: `src/core.mjs`, `src/math.mjs` and four optional modules.
6. Added a **self-contained root `index.html` showcase** (works with a plain file open and raw.githack) and **`demo/index.html`** showcasing the importable library.
7. Added mathematical tests, TypeScript declaration checks and Chromium emulated-touch tests.
8. Added a GitHub Pages workflow; Pages source selection is a repository-level setting, not controlled by this PR.

## UI audit / issues fixed

- No preexisting native/custom scrollbars to conflict with; CSS hides the owned scroller's native bar when the custom rail is mounted, preventing double bars.
- Sticky header: both demos include a covering header; snap and track top account for it.
- Touch edge collisions: track and marks are pointer-transparent; only a ~44px grip can capture touches, inset from physical display edge.
- Dynamic content: ResizeObserver, MutationObserver and image load trigger cached geometry measurements outside scroll handlers.
- Redundant location affordance: no persistent section-title header; section names appear only in drag reel / optional Contents.
- Dark mode, RTL, reduced motion, keyboard slider and focus visibility supported.
- Safe-area insets used by library; physical notched device verification is still outstanding.

## Test and release notes

Prior isolated implementation passed five mathematical tests, TypeScript declaration checks and Chromium touch emulation at 390×844 for drag, cancel, Back, Contents, sticky snapping, layout changes, keyboard, core-only, reduced motion, dark mode and RTL.

The **root showcase** intentionally inlines behavior to be accessible without any server or build; `demo/` exercises the ESM modules. They are distinct entrypoints; keeping both means demonstration and integration can be evaluated independently.

The aspirational ~3 KB gzip target is not yet met: core + math are ~5.3 KB gzipped as readable source. Physical-device vibration and OS edge gesture interaction remain unverified.
