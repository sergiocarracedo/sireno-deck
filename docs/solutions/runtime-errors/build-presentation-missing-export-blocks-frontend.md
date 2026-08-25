---
title: buildPresentation imported but never re-exported from package entry — frontend blank
date: 2026-07-31
last_updated: 2026-07-31
category: docs/solutions/runtime-errors/
module: cli/src
problem_type: missing_export
component: frontend_bootstrap
severity: high
symptoms:
  - 'loading http://127.0.0.1:5180/decks/main renders only `<div id="root"></div>`; no deck grid, no chrome'
  - "Vite dev server is up; WebSocket connects; backend sends deck-config"
  - "browser DevTools: `Uncaught SyntaxError: The requested module '/@fs/.../packages/cli/src/index.ts' does not provide an export named 'buildPresentation' (at App.tsx:16:3)`"
  - "the deck-config payload arrives but the React tree never mounts because App.tsx module evaluation throws at import time"
root_cause: missing_re_export
resolution_type: code_fix
related_commits:
  - de22dc8f # feat(themes): ship neon-grids theme + close theme-system audit gaps (introduced App.tsx importing buildPresentation)
tags:
  - frontend-bootstrap
  - react-import-error
  - buildPresentation
  - theme-ui-overrides
  - module-resolution
  - vite-dev-server
---

# `buildPresentation` imported but never re-exported from package entry — frontend blank

## Symptom

The frontend's React app does not mount. The root container stays
empty (`<div id="root"></div>`), the deck grid is absent, and
`http://127.0.0.1:5180/decks/main` shows nothing. The WebSocket connects
and the daemon sends valid `deck-config` messages, but they are dropped
because no React tree is listening.

Browser console:

```
Uncaught SyntaxError: The requested module
'/@fs/works/opensource/sireno-deck-2/packages/cli/src/index.ts'
does not provide an export named 'buildPresentation'
(at App.tsx:16:3)
```

## Root cause

`packages/cli/frontend/src/App.tsx:16` imports `buildPresentation` from
the `@sirenodeck/cli` virtual entry, which resolves to
`packages/cli/src/index.ts`:

```ts
import {
  AssetCacheProvider,
  ThemeUiPresentationProvider,
  buildPresentation, // ← not re-exported from index.ts
  useAssetCacheMutations,
} from "@sirenodeck/cli"
```

`buildPresentation` is defined in
`packages/cli/src/ui/theme-presentation-builder.ts` and re-exported by
`packages/cli/src/ui/index.ts`. The top-level `packages/cli/src/index.ts`
re-exports a curated list from `./ui` (`AssetCacheProvider`,
`ButtonFrame`, `Icon`, `SplitActionSurface`, …) but the list was missing
`buildPresentation`.

The neon-grids theme commit (`de22dc8f`) introduced
`buildPresentation(uiOverrides)` calls in `App.tsx` but did not extend
the curated re-export list. Vite rejects the import at module-evaluation
time, so the React tree never mounts and no error boundary catches it
(because the error is a SyntaxError thrown by the module loader, before
React even tries to render).

## Fix

Add `buildPresentation` to the `./ui` re-export block in
`packages/cli/src/index.ts`:

```diff
 export {
   AssetCacheProvider,
   useAssetCache,
   useAssetCacheMutations,
   type AssetCache,
   ButtonFrame,
+  buildPresentation,
   Chip,
   Icon,
   IconLabelSurface,
   Label,
   SplitActionSurface,
   TapIndicator,
   Text,
   ThemeUiPresentationProvider,
   type ButtonFrameProps,
   type IconLabelSurfaceProps,
   type SplitActionSurfaceProps,
   type ThemeUiPresentation,
 } from "./ui"
```

## Why didn't typecheck catch this?

`pnpm typecheck` passes because the missing-export is a runtime-only
error: the TypeScript compiler resolves the import through the
`tsconfig.json` `paths` mapping (which points to `./src/ui` directly,
not `./src`), so it finds `buildPresentation` in `ui/index.ts`. Vite at
dev time resolves through the `@sirenodeck/cli` package entry
(`./src/index.ts`) which doesn't re-export it. The two resolution paths
diverge, and only the runtime path catches the gap.

## Verification

- `pnpm typecheck` — clean (no false sense of security here).
- `pnpm test --run packages/cli/frontend/src/__tests__/deck-render.test.tsx`
  — still fails for the pre-existing reason (4 buttons rendered vs 2
  expected — that test's stubs don't simulate the post-fix deck shape);
  not introduced by this fix.
- Manual: open `http://127.0.0.1:5180/decks/main` in `agent-browser`;
  `document.querySelectorAll("[data-button-type]")` now returns 28 (14
  buttons × 2 from React StrictMode). The deck grid renders.

## Rule of thumb (steer clear next time)

Anything consumed by `packages/cli/frontend/src/**` must be re-exported
through `packages/cli/src/index.ts`. The TypeScript compiler is not the
gatekeeper here; the gatekeeper is Vite's module resolution at dev time
(or `pnpm build` if the bundle path is configured the same way). When
adding a new symbol to `ui/`, do **both**:

1. export it from `ui/index.ts` (always done — local path), and
2. add it to the explicit re-export list in `packages/cli/src/index.ts`
   (often forgotten — that's the path frontend imports land on).

A small CI guard could compare the two export lists and fail the build
when `src/index.ts` is missing a name that `src/ui/index.ts` exports
but the frontend doesn't import directly. Until then, treat any commit
that adds a new frontend import from `@sirenodeck/cli` as also requiring
a re-export edit.
