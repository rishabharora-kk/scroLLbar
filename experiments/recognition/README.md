# Recognition rail experiment

This prototype tests a narrower hypothesis than the original heading reel:

> An off-screen preview of distinctive content helps readers return to vaguely remembered places faster than a normal scrollbar and Contents outline.

## Open the experiment

Once merged into `main`, visit **[Recognition Lab](https://rishabharora-kk.github.io/scroLLbar/experiments/recognition/)**. The existing [original demo](https://rishabharora-kk.github.io/scroLLbar/) remains unchanged as a control.

The lab is dependency-free HTML/CSS/ESM with 18 content sections and distinct figure, table, quotation and code landmarks. It does not use a language model.

## Conditions

- **Baseline** — turn the Preview rail OFF. Use conventional scrolling and Contents. The document and task targets are identical.
- **Preview rail** — turn the Preview rail ON. Drag the right thumb to inspect off-screen landmark thumbnails and snippets; the document does not move while previewing. Release to commit, move 150px inward to cancel, or use Escape. An exact-offset Back control appears after jumps exceeding 1.5 viewports.
- **Keyboard:** focus the rail slider, use Up/Down (one landmark), PageUp/PageDown (four), Home/End; Enter to commit, Escape to cancel.

**Note:** This experiment does not replace the existing core library or claim that preview-first behavior is better for ordinary scrolling. The experimental rail intentionally uses a different interaction; user testing must establish whether the change is beneficial.

## Test protocol

1. Use a phone (or 390×844 emulation) and a desktop, recording the platform and browser separately.
2. Run four memory-cue tasks: find the amber/blue concentric rings, the table where GAMMA = 74, the sentence about observing too early, and the code saving an exact scroll offset.
3. For an individual participant, counterbalance condition and task order; ideally each participant should encounter each target only once to reduce learning effects. A between-subjects or Latin-square design is preferred.
4. Use the Start button; find the target, tap **This is it**. The page records elapsed milliseconds, incorrect guesses, jumps, returns and scroll events. Abandoned/restarted trials are recorded explicitly.
5. Export JSON or CSV. No measurements are transmitted automatically.
6. Compare median correct-task completion time **and** error rate, abandonment, and return accuracy, segmented by device, task type, and participant. Do not pool repeated attempts as independent participants.

**Preliminary, not validated target:** at least 25% faster median retrieval at no material increase in wrong selections or abandonment. The existing tasks are synthetic. Replace them with a real research paper or technical report before claiming product-level usefulness. Do not overinterpret the 18-section demo.

## Testing and limitations

```sh
node --test tests/recognition.test.mjs
python3 -m pip install playwright
python3 -m playwright install chromium
python3 tests/recognition.e2e.py
```

The e2e script starts its own localhost server and uses mobile Chromium at 390×844, checking that preview does not change scroll position, cancellation, jump and exact return, baseline outline, and keyboard under reduced motion.

Known limitations: preview content is curated from document figures/tables/passages; automatic extraction and optimal salience ranking are intentionally not implemented. No page-number or figure OCR inference. No telemetry service. Physical iOS/Android back-gesture and haptic tests still required. Long-document virtualization and performance with hundreds of landmarks require separate benchmarking.

## Design decision record

The earlier 3-row heading reel reproduced content already visible during a live scroll. Its useful information gain was limited. This experiment instead uses distinctive visual/textual **cues from off-screen content** and separates **exploration** from **navigation**. Whether this trade-off is worthwhile remains a research question, not a product claim.
