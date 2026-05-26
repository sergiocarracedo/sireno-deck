---
files_modified:
  - packages/cli/src/render/dom-host.test.tsx
  - packages/cli/src/builtin-addons/emoji-selector/index.test.ts
  - packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx
  - packages/cli/src/cli/commands/start.test.ts
autonomous: true
single_layer_justified: false
objective: "Unblock full-branch ship by aligning stale browser-path assertions with the current asset URL contract and making the committed Phase 23 raw TSX fixture render on the real no-ambient-React startup path."
must_haves:
  truths:
    - "Browser-path tests assert the current HTML contract instead of stale raw `file://` assumptions."
    - "The committed Phase 23 local raw addon fixture renders without ambient React globals on the runtime loader path."
    - "Focused verification proves the three previously failing ship blockers are green."
  artifacts:
    - packages/cli/src/render/dom-host.test.tsx
    - packages/cli/src/builtin-addons/emoji-selector/index.test.ts
    - packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx
    - packages/cli/src/cli/commands/start.test.ts
  key_links:
    - "packages/cli/src/render/dom-host.test.tsx and packages/cli/src/builtin-addons/emoji-selector/index.test.ts follow the live resolver behavior implemented in packages/cli/src/addon/api.ts and packages/cli/src/cli/commands/start.ts"
    - "packages/cli/src/cli/commands/start.test.ts exercises the committed Phase 23 raw fixture in packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx"
---

# Quick Task 016 Plan: Fix ship blockers from full branch test run

<objective>
Unblock `/ship` on the current full branch state with the smallest honest change set. Two blockers are stale assertions that still expect raw `file://` browser HTML even though the live browser/emulator asset path now rewrites toward browser-loadable URLs; the third blocker is a real runtime issue in the committed Phase 23 raw TSX fixture, which still uses ambient JSX on a loader path that intentionally does not provide ambient `React`.
</objective>

## Tasks

<task id="016-01">
<title>Align browser-path asset assertions with the live HTML contract</title>
<files>
- packages/cli/src/render/dom-host.test.tsx
- packages/cli/src/builtin-addons/emoji-selector/index.test.ts
</files>
<action>
Update the two stale tests so they assert what the current browser-path helpers actually promise. In `packages/cli/src/render/dom-host.test.tsx`, keep proving that absolute icon paths are normalized into browser-loadable sources, but stop hard-coding the old exact `file:///tmp/...` string if the live helper now emits a different browser-safe shape. In the theme stylesheet test, assert the current presence of theme assets/styles and browser-loadable asset references without requiring raw `file://` text. In `packages/cli/src/builtin-addons/emoji-selector/index.test.ts`, keep proving that bundled emoji entries render the shipped icon-backed variant, but assert the rendered icon asset contract that matches `createDomIcon()` and the current resolver behavior instead of requiring `file://` specifically.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/builtin-addons/emoji-selector/index.test.ts
</verify>
<done>
The two browser-path test files pass and still prove icon/theme asset rendering honestly without pinning stale `file://` details.
</done>
</task>

<task id="016-02">
<title>Make the committed Phase 23 raw TSX fixture render on the real startup path</title>
<files>
- packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx
- packages/cli/src/cli/commands/start.test.ts
</files>
<action>
Fix the committed Phase 23 local raw addon fixture so its exported button renders without depending on ambient `React` on the raw-source `tsx` loader path. Preserve the fixture's narrow purpose and authoring contract, but replace the ambient JSX-only render with an explicit runtime-safe React value path. Then keep the existing runtime regression test in `packages/cli/src/cli/commands/start.test.ts` focused on the real Phase 23 sample config, so it proves `onRenderDeck` fires and the runtime produces button content through the actual startup/runtime seam.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/cli/commands/start.test.ts -t "renders the shipped Phase 23 sample config through the runtime without ambient React JSX failures"
</verify>
<done>
The Phase 23 runtime regression test passes, meaning the real raw TSX fixture can render through startup/runtime without `React is not defined`-style failures or a silent missing render.
</done>
</task>

<task id="016-03">
<title>Re-run the three previously failing ship blockers together</title>
<files>
- packages/cli/src/render/dom-host.test.tsx
- packages/cli/src/builtin-addons/emoji-selector/index.test.ts
- packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx
- packages/cli/src/cli/commands/start.test.ts
</files>
<action>
Run one focused verification command that covers the exact three blockers from the aborted ship run: the dom-host asset URL assertion, the emoji-selector icon assertion, and the Phase 23 runtime render regression. Do not broaden scope beyond the blocker set. If a verification command shape needs narrowing to the named tests, keep it targeted and record that exact command in the quick-task summary.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/render/dom-host.test.tsx src/builtin-addons/emoji-selector/index.test.ts src/cli/commands/start.test.ts -t "normalizes absolute icon paths into browser-loadable file URLs|exports theme CSS vars and the browser utility stylesheet on the deck root|renders bundled icon-backed emoji entry buttons for shipped emoji values|renders the shipped Phase 23 sample config through the runtime without ambient React JSX failures"
</verify>
<done>
The same blocker set that failed during `/ship` now passes in a focused rerun, giving a truthful signal that the branch can retry ship from a cleaner position.
</done>
</task>
