# SUMMARY — Quick 046: render cleanup + dom-host folder

**Status:** ✅ Complete (3/3 tasks)

## Commits

| Commit | Task | Description |
| ------ | ---- | ----------- |
| `ddabd62` | T1 | Remove dead exports (`renderThemeCssVariables`, `getThemeUtilityStylesheet`) from `theme-utilities.ts` |
| `0d04bef` | T2 | Remove broken `reconciler.ts`/`reconciler.test.tsx` + phase-9 fixture trio |
| `06358d7` | T3 | Move flat `render/dom-host-*.tsx` files into `render/dom-host/` folder with `index.tsx` orchestrator + `README.md` |

## Findings (audit)

**Dead/broken — removed:**

- `render/reconciler.ts` (10 exports) — imports non-existent `./types.js`, TS error. The
  `deck-button`/`deck-text`/`deck-surface` host-element strings used by addons are
  handled by the reconciler **inside** `dom-host.tsx`, not by this file.
- `render/reconciler.test.tsx` — imports 6 symbols from phase-9 fixture that no
  longer exports them. 32/32 tests only pass because vitest skips typecheck and
  missing imports resolve to `undefined`, so `renderDeck(undefined) ===
  renderDeck(undefined)`.
- `fixtures/phase-9/jsx-addon-authoring-example.tsx` + `.ts` +
  `tsconfig.jsx-authoring-example.json` — gutted exports, no consumers.
- `theme-utilities.renderThemeCssVariables` — zero callers.
- `theme-utilities.getThemeUtilityStylesheet` — zero callers.

**Active — preserved:**

- `browser-renderer.ts`, `render-preset.ts`, `scheduler.ts`,
  `startup-placeholder.ts`, `shrink-fit-browser-script.ts`, `theme-utilities.ts`
  (remaining 3 exports), all `dom-host/` files, internal MIN/MAX/LIVE *_MS
  constants.

## Verification

| Check | Baseline | After |
| ----- | -------- | ----- |
| tsc errors in render/ files | identical | identical (no new errors) |
| `dom-host.test.tsx` (20 tests) | 1 failed / 19 passed | 1 failed / 19 passed |
| Full vitest suite | n/a (rtk wrapper hides counts) | 126 failed / 537 passed |

The 1 `dom-host.test.tsx` failure (`sireno-default-chip` assertion) is
**pre-existing** — confirmed by checking out the flat baseline and re-running;
identical failure. The full-suite counts include 79 pre-existing failures in
`runtime.test.ts` flagged in AGENTS.md.

## Folder restructure (Task 3)

```
render/dom-host/
├── index.tsx                  # orchestrator + public API surface
├── button.tsx                 # ButtonSurface wrap + theme providers
├── deck-document.tsx          # full <!doctype html> deck shell
├── key-slot.tsx               # one Stream Deck key well
├── hosted-button-content.tsx  # pre-rendered HTML vs live React chooser
├── dom-host.test.tsx
└── README.md
```

External callers (19 files) already use `@/render/dom-host` — no caller-side
import changes needed (now resolves to `./index.tsx`). Internal relative
imports updated to point at sibling files (`./button`, `./deck-document`,
etc.) instead of the old flat `dom-host-*` names.

## Side observations (NOT addressed — out of scope)

- `device/stream-deck.ts:244` `writeRenderDescriptions` — exported, zero callers.
- 79 pre-existing `runtime.test.ts` failures from Phase 42/67 system-back
  injection firing in test contexts. Both flagged for future `/forensics`.
- The `sireno-default-chip` test assertion failure (root cause: stale expected
  output vs current `data-sireno-ui-chip="true"` actual). Pre-existing, not
  introduced by this work.

## Learnings

1. **Stale tests pass silently when imports resolve to `undefined`.** vitest's
   default typecheck-skip hides import errors that would otherwise be caught
   by `tsc`. Worth a future sweep to enable typecheck-in-tests for renderer
   code.
2. **Folder-or-file naming decisions leak outward.** The original `dom-host-`
   prefix made sense as filenames but doubled up once they were in the
   `dom-host/` folder. Renaming on move (not leaving them as
   `dom-host/dom-host-button.tsx`) keeps deep imports and grep searches
   clean.