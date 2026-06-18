# Quick Task 046: Render cleanup + dom-host folder refactor

**Task:** Combine three render-module cleanups into atomic commits:
1. Remove dead `theme-utilities` exports (verified zero callers in `src/`).
2. Remove the broken reconciler trio (verified broken: missing `./types.js`, stale test imports, gutted phase-9 fixture).
3. Move the five flat `dom-host-*` files into a `dom-host/` folder with an `index.tsx` entry point and a README; refactor all imports to use the index.

## Decisions

- **`dom-host/` folder structure** — Each file renames to drop the redundant `dom-host-` prefix once inside the folder:
  - `dom-host.tsx` → `dom-host/index.tsx`
  - `dom-host-button.tsx` → `dom-host/button.tsx`
  - `dom-host-deck-document.tsx` → `dom-host/deck-document.tsx`
  - `dom-host-deck-key-slot.tsx` → `dom-host/key-slot.tsx`
  - `dom-host-hosted-button-content.tsx` → `dom-host/hosted-button-content.tsx`
  - `dom-host.test.tsx` → `dom-host/dom-host.test.tsx` (keeps co-location with code under test)
- **Public API surface** — `index.tsx` re-exports only the symbols consumed outside the folder:
  - Types: `HostedButton`, `DomHostRenderOptions`, `MountedDomHost`, `MountedHostedButtonSnapshot`, `DeckDocumentProps`, `DeckKeySlotProps`
  - Functions: `renderReactNodeToHtml`, `createMountedDomHost`, `renderMountedHostedButtons`, `renderDomDeck`, `createHostedButtonElement`, `createMountedHostedButtonElement`
  - React components: `DeckDocument`, `DeckKeySlot`, `HostedButtonContent` (kept public for test consumers and composition)
- **External import path** — Stays `@/render/dom-host` (the folder resolves the same as the old flat file). All 12 current external importers keep working without changes.
- **Internal relative imports** — Updated from `'./dom-host'`, `'./dom-host-button'`, etc. to `'./index'`, `'./button'`, etc.
- **Test co-location** — `dom-host.test.tsx` moves into the folder. No need to keep it in render/ root.
- **README content** — Explains what dom-host does, the 3 entry points (`renderDomDeck`, `createMountedDomHost`+`renderMountedHostedButtons`, `renderReactNodeToHtml`), the custom React DOM reconciler it owns, and what does NOT belong here (addon authoring host elements like `deck-button` are handled by the public API, not this module).

## Agent's Discretion

- Whether to drop `createHostedButtonElement` from the re-export (the old `dom-host.tsx` re-exported it; the component is small enough to keep public for symmetry with `createMountedHostedButtonElement`).
- Whether to inline the `MOUNTED_BUTTON_SLOT_TAG` and `EMPTY_HOST_CONTEXT` module constants into `index.tsx` or leave them in `index.tsx`. Keeping them private to `index.tsx` since they are implementation details of the custom reconciler.

---

## Task 1 — Remove dead `theme-utilities` exports

<files>
- packages/cli/src/render/theme-utilities.ts
</files>

<action>
Delete two unreferenced exports from `theme-utilities.ts`:
- `renderThemeCssVariables` (lines 77-81) — not imported anywhere in `src/`.
- `getThemeUtilityStylesheet` (lines 106-108) — not imported anywhere in `src/`.

Both are pure deletions; no imports to update. Keep `getThemeCssVariables`, `getTailwindBrowserStylesheet`, `getSirenoRuntimeStylesheet` (all have callers in `dom-host/` and `start.ts`).
</action>

<verify>
- `npx tsc --noEmit -p packages/cli/tsconfig.json` reports no new errors.
- `grep -rn "renderThemeCssVariables\|getThemeUtilityStylesheet" packages/cli/src` returns zero hits.
</verify>

<done>
Two dead exports removed; file is shorter; `tsc` clean.
</done>

---

## Task 2 — Remove broken reconciler files

<files>
- packages/cli/src/render/reconciler.ts (delete)
- packages/cli/src/render/reconciler.test.tsx (delete)
- packages/cli/fixtures/phase-9/jsx-addon-authoring-example.tsx (delete)
- packages/cli/fixtures/phase-9/jsx-addon-authoring-example-data.ts (delete)
- packages/cli/fixtures/phase-9/tsconfig.jsx-authoring-example.json (delete)
</files>

<action>
Verified dead/broken:
- `reconciler.ts` imports `./types.js` which doesn't exist (TS error). All 10 exports are referenced only by `reconciler.test.tsx`.
- `reconciler.test.tsx` imports `helperAddonButton`, `jsxAddonButton`, etc. from the phase-9 fixture, but the fixture was gutted and no longer exports those names. The "parity" test passes only because missing imports resolve to `undefined` and `renderDeck(undefined)` returns `[]`.
- The phase-9 fixture trio (`jsx-addon-authoring-example.tsx`, `jsx-addon-authoring-example-data.ts`, `tsconfig.jsx-authoring-example.json`) has no other consumers.
- Note: the `deck-button`/`deck-text`/`deck-surface` host-element strings are PUBLIC API used by addons and `runtime.test.ts` — they are handled by the reconciler inside `dom-host.tsx`, NOT by `reconciler.ts`. Do NOT touch them.

Use `git rm` for each file in a single commit.
</action>

<verify>
- `npx tsc --noEmit -p packages/cli/tsconfig.json` no longer reports `reconciler.ts` errors or `jsx-addon-authoring-example` errors.
- `cd packages/cli && npx vitest run src/render/reconciler.test.tsx` reports "No test files found".
- `cd packages/cli && npx vitest run` total tests drops by exactly 32 (the reconciler tests) and no new failures appear.
</verify>

<done>
Five broken/dead files removed; TypeScript errors specific to them are gone; test count drops by 32 with no regressions.
</done>

---

## Task 3 — Refactor `dom-host` into a folder with `index.tsx` + README

<files>
- packages/cli/src/render/dom-host.tsx (delete after content moves)
- packages/cli/src/render/dom-host-button.tsx (delete after content moves)
- packages/cli/src/render/dom-host-deck-document.tsx (delete after content moves)
- packages/cli/src/render/dom-host-deck-key-slot.tsx (delete after content moves)
- packages/cli/src/render/dom-host-hosted-button-content.tsx (delete after content moves)
- packages/cli/src/render/dom-host.test.tsx (delete after content moves)
- packages/cli/src/render/dom-host/index.tsx (new)
- packages/cli/src/render/dom-host/button.tsx (new)
- packages/cli/src/render/dom-host/deck-document.tsx (new)
- packages/cli/src/render/dom-host/key-slot.tsx (new)
- packages/cli/src/render/dom-host/hosted-button-content.tsx (new)
- packages/cli/src/render/dom-host/dom-host.test.tsx (new)
- packages/cli/src/render/dom-host/README.md (new)
</files>

<action>
1. Create folder `packages/cli/src/render/dom-host/`.
2. Move file contents (use `git mv` to preserve history where possible):
   - `dom-host.tsx` → `dom-host/index.tsx` (orchestrator + custom React DOM reconciler)
   - `dom-host-button.tsx` → `dom-host/button.tsx`
   - `dom-host-deck-document.tsx` → `dom-host/deck-document.tsx`
   - `dom-host-deck-key-slot.tsx` → `dom-host/key-slot.tsx`
   - `dom-host-hosted-button-content.tsx` → `dom-host/hosted-button-content.tsx`
   - `dom-host.test.tsx` → `dom-host/dom-host.test.tsx`
3. Update internal relative imports inside each moved file:
   - `import { ... } from './dom-host'` → `import { ... } from './index'`
   - `import type { ... } from './dom-host'` → `import type { ... } from './index'`
   - `import { ... } from './dom-host-button'` → `import { ... } from './button'`
   - `import { ... } from './dom-host-deck-document'` → `import { ... } from './deck-document'`
   - `import { ... } from './dom-host-deck-key-slot'` → `import { ... } from './key-slot'`
   - `import { ... } from './dom-host-hosted-button-content'` → `import { ... } from './hosted-button-content'`
4. `index.tsx` should re-export the public API:
   - Types: `HostedButton`, `DomHostRenderOptions`, `MountedDomHost`, `MountedHostedButtonSnapshot`, `DeckDocumentProps`, `DeckKeySlotProps`
   - Functions: `renderReactNodeToHtml`, `createMountedDomHost`, `renderMountedHostedButtons`, `renderDomDeck`, `createHostedButtonElement`, `createMountedHostedButtonElement`
   - Components: `DeckDocument`, `DeckKeySlot`, `HostedButtonContent`
5. Write `README.md` covering:
   - What this module does (browser-emulator HTML rendering + runtime mounted-button HTML + test helper)
   - The three entry points and which callers use each
   - The custom React DOM reconciler (`mountedHostReconciler`) and why it exists
   - The relationship with `dom-host.tsx`'s public API contract (NOT a replacement for the addon-authoring `deck-button`/`deck-text`/`deck-surface` host-element API — those are separate)
   - Layout: index.tsx is the orchestrator; the other files are pure React components the index composes.
6. Delete the six flat files at `packages/cli/src/render/` root.
7. External importers (`runtime.ts`, `start.ts`, and 9 test files) continue to use `@/render/dom-host` — no changes needed because the path resolves to the folder now.
</action>

<verify>
- `npx tsc --noEmit -p packages/cli/tsconfig.json` reports no new errors.
- `cd packages/cli && npx vitest run src/render/dom-host/dom-host.test.tsx` passes.
- `cd packages/cli && npx vitest run` total tests unchanged from baseline (after Tasks 1+2 removed 32); no new failures.
- `grep -rn "from './dom-host'" packages/cli/src` returns zero hits (no remaining deep imports).
- `grep -rn "@/render/dom-host" packages/cli/src` returns the original 12 importers (unchanged paths).
- All five `dom-host-*` flat files are gone from `packages/cli/src/render/`.
</verify>

<done>
Five flat files consolidated into `dom-host/` folder with `index.tsx` entry point; README explains the module; external imports unchanged; tests pass; zero behavior change.
</done>

---

## Amendment (2026-06-18, quick-047 wave 0)

quick-047 adopted a global convention: every test file must live in a sibling `__tests__/` folder. The decision in this plan to keep `dom-host.test.tsx` co-located at `dom-host/dom-host.test.tsx` is overridden. The test was moved to `dom-host/__tests__/dom-host.test.tsx` (one-line import fixup: `'./index'` → `'../index'`) as part of quick-047 Wave 0. No other aspect of this task changed.
