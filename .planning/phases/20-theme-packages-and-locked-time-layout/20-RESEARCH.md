# Phase 20 Research

## Don't Hand-Roll

- **Do not invent a second package-loading model just for themes.** Reuse the existing addon loader shape as the conceptual template: root-path resolution, manifest validation, path-aware import of a JS entry, and registry-style ownership of package root metadata. The current addon loader already solves the local-folder vs npm-package split with `createRequire()` / `require.resolve()` and manifest-backed entry loading. [VERIFIED: `packages/cli/src/addon/loader.ts`] Confidence: HIGH

- **Do not rely on host-installed fonts for visible typography differences.** Earlier real-device review already proved that host font fallback can collapse distinct configured families into the same rendered output. If themes are supposed to own typography visibly, font files need to travel with the theme package and be bound explicitly through CSS. [VERIFIED: `.planning/solutions/ui-bugs/theme-typography-difference-hidden-by-font-fallback-2026-05-15.md`] [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face] Confidence: HIGH

- **Do not leave CSS asset URLs unresolved or page-relative.** CSS `url(...)` references are defined relative to the stylesheet URL, not the page URL, so packaged theme CSS needs a loader that preserves that behavior even when styles are inlined or rewritten into the deck host. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/url_function] Confidence: HIGH

- **Do not expose a broad runtime object to theme-owned `buttonFrame`.** The repo already prefers narrow explicit contracts over leaking runtime internals; earlier phases repeatedly kept core-owned transport/runtime behavior separated from author-visible styling seams. A small visual-state enum (`idle | tap | hold`) is safer than passing the full button/runtime object to theme code. [VERIFIED: `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`] [VERIFIED: `packages/cli/src/render/dom-host.tsx`] Confidence: HIGH

- **Do not replace explicit `session.locked_deck` with theme-owned lock rendering.** Earlier lock-mode decisions already made configured locked decks authoritative, with core owning only the implicit fallback. Phase 20 should preserve that split and only change the fallback layout contract. [VERIFIED: `.planning/STATE.md`] [VERIFIED: `packages/cli/src/deck/runtime.ts`] Confidence: HIGH

## Common Pitfalls

- **Overloaded theme references can destroy diagnostics if resolver attempts are hidden.** The current theme loader accepts built-in theme names or filesystem paths and reports a path-aware error with a helpful suggestion. Expanding this to support package-name-or-path strings can easily regress into ambiguous “theme not found” failures unless the error explains whether builtin lookup, local path resolution, and package resolution were attempted. [VERIFIED: `packages/cli/src/config/theme.ts`] Confidence: HIGH

- **Using package `exports` without explicitly exporting theme runtime entrypoints can create brittle third-party theme packages.** Node’s package `exports` field encapsulates subpaths and blocks undeclared entrypoints, so Phase 20 should either require one canonical exported theme entry or carefully define which subpaths third-party packages must expose. [CITED: https://nodejs.org/api/packages.html] Confidence: HIGH

- **Making `buttonFrame` fully theme-owned can accidentally break host layout invariants.** Right now the browser host assumes one button-sized slot and wraps non-full-surface content in a core frame. If theme code becomes responsible for sizing, host layout, or content-slot semantics, every theme can break the browser renderer contract. Keep theme ownership scoped to chrome and visual response, not outer host layout. [VERIFIED: `packages/cli/src/render/dom-host.tsx`] [VERIFIED: `packages/cli/src/render/button-frame.tsx`] Confidence: HIGH

- **Trying to solve image rendering only in emoji-selector would hide a systemic asset bug.** The emoji selector is asset-heavy and therefore a good proof path, but its current explicit `addon://...` asset usage is only one consumer of the broader external asset pipeline. If the real problem is config/addon asset resolution on the browser path, a widget-local patch will leave the underlying contract broken. [VERIFIED: `packages/cli/src/builtin-addons/emoji-selector/index.ts`] [VERIFIED: `.planning/phases/20-theme-packages-and-locked-time-layout/20-CONTEXT.md`] Confidence: HIGH

- **Changing the implicit locked fallback shape without fixing tests/UAT/state artifacts together can create workflow drift.** This repo has already hit stale verification metadata problems after successful reruns. If Phase 20 updates the fallback locked surface and its review path, UAT, verification, state, and AGENTS metadata need to move together. [VERIFIED: `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md`] Confidence: HIGH

## Existing Patterns in This Codebase

- **Manifest + runtime entry loading already exists for addons.** `packages/cli/src/addon/manifest.ts` validates a manifest-owned API version and entry path; `packages/cli/src/addon/loader.ts` resolves local and npm addons, finds the package root, and imports the JS entry dynamically. Theme packages should mirror this seam closely enough that the loader UX and diagnostics feel like one product, not two unrelated systems. [VERIFIED: `packages/cli/src/addon/manifest.ts`] [VERIFIED: `packages/cli/src/addon/loader.ts`] Confidence: HIGH

- **Theme resolution today is single-file YAML and path-aware.** `packages/cli/src/config/theme.ts` resolves built-in themes by name and everything else by path, then validates one YAML document. Phase 20 will need to widen that seam from file-based lookup to package-root lookup without losing the current error quality. [VERIFIED: `packages/cli/src/config/theme.ts`] Confidence: HIGH

- **The browser host applies one default frame seam for non-full-surface buttons.** `renderDomDeck()` calls `createHostedButtonElement()`, which wraps non-`full_surface` content in `ButtonFrame`. That makes the theme-frame migration a clean integration point: swap the frame implementation source, don’t redesign the host pipeline. [VERIFIED: `packages/cli/src/render/dom-host.tsx`] Confidence: HIGH

- **The current frame is visually rich but hardcoded.** `packages/cli/src/render/button-frame.tsx` owns gradients, borders, sizing, padding, and inner shell styling in one component. This is exactly the seam Phase 20 needs to lift into the theme runtime contract while keeping outer host invariants core-owned. [VERIFIED: `packages/cli/src/render/button-frame.tsx`] Confidence: HIGH

- **The implicit locked fallback is currently a single bundled `date-time` button at position 0.** `createImplicitLockedDeck()` builds a one-button locked deck from the bundled date-time addon. Replacing that with five centered buttons is a narrow core-owned change, not a new general capability. [VERIFIED: `packages/cli/src/deck/runtime.ts`] Confidence: HIGH

- **Addon assets are explicit file-path maps today.** The emoji selector ships a large `assets` map that resolves files with `fileURLToPath(new URL(...))`. That is a strong proof seam for testing package-root asset resolution because it already exercises asset-heavy addon behavior without needing new product concepts. [VERIFIED: `packages/cli/src/builtin-addons/emoji-selector/index.ts`] Confidence: HIGH

## Recommended Approach

1. **Adopt a theme-package contract that mirrors the addon package model, but stays narrower.**
   - Require a manifest file at the theme root plus a mandatory JS runtime entry. [VERIFIED: `20-CONTEXT.md`] Confidence: HIGH
   - Keep config’s overloaded package-or-path string, but internally normalize resolution into three attempts: builtin theme id, filesystem path, npm package root. Report which attempts failed in one path-aware diagnostic. [VERIFIED: `packages/cli/src/config/theme.ts`] Confidence: HIGH
   - Prefer one canonical exported runtime entrypoint for third-party themes instead of many optional subpaths, because Node `exports` encapsulation makes undeclared entrypoints brittle. [CITED: https://nodejs.org/api/packages.html] Confidence: HIGH

2. **Split theme data into manifest metadata + runtime exports + asset registry.**
   - Manifest should own static metadata (`name`, `description`, `version`, optional `authors`) and declared asset inventory. [VERIFIED: `20-CONTEXT.md`] Confidence: HIGH
   - Runtime entry should export `buttonFrame` and any additional narrowly scoped runtime hooks needed by the browser host. [VERIFIED: `20-CONTEXT.md`] Confidence: HIGH
   - Avoid a separate font-specific DSL for now; declare fonts as assets and bind them in CSS. [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face] Confidence: HIGH

3. **Keep the host/frame boundary narrow and explicit.**
   - Core continues to own key slot sizing, `full_surface` escape hatch behavior, and the hosted content wrapper contract. [VERIFIED: `packages/cli/src/render/dom-host.tsx`] Confidence: HIGH
   - Theme-owned `buttonFrame` gets `children` plus a narrow state enum (`idle | tap | hold`). [VERIFIED: `20-CONTEXT.md`] Confidence: HIGH
   - If more metadata is needed later, grow the frame props intentionally; do not pass through the whole runtime object. [ASSUMED] Confidence: MEDIUM

4. **Treat asset delivery as a resolver problem, not a widget problem.**
   - Phase 20 should introduce a package-root-relative asset resolver shared by themes and addons, not an emoji-only patch. [VERIFIED: `20-CONTEXT.md`] Confidence: HIGH
   - CSS assets should be parsed/re-written so relative `url(...)` references continue to behave relative to the CSS file location after injection into the browser host. Lightning CSS is a credible candidate if URL rewriting becomes painful to implement by string handling alone. [CITED: /parcel-bundler/lightningcss] [CITED: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/url_function] Confidence: MEDIUM

5. **Implement the locked fallback as one core-owned tracer bullet, not a generalized theme/lock redesign.**
   - Keep `session.locked_deck` authoritative. [VERIFIED: `.planning/STATE.md`] Confidence: HIGH
   - Replace only the implicit fallback with a fixed `5..9` row `[H][H][:][M][M]`, likely as generated runtime-owned buttons or a dedicated fallback renderer. [VERIFIED: `packages/cli/src/deck/runtime.ts`] Confidence: HIGH
   - Pair the change with a committed review fixture/UAT path so the five-button layout is judged on the real device surface, not only in unit tests. [VERIFIED: repo planning patterns across Phases 18-19] Confidence: HIGH

## Source Notes

- Official docs used instead of general web search because this environment does not expose a dedicated web-search tool; recommendations are grounded in current upstream docs plus live codebase reads. [ASSUMED] Confidence: HIGH

---
*Phase: 20-theme-packages-and-locked-time-layout*
*Research gathered: 2026-05-23*
