---
title: Split surface (back + overlay-toggle) silently disappears on overlay-deck N-1
date: 2026-07-31
last_updated: 2026-07-31
category: docs/solutions/runtime-errors/
module: cli/src/deck
problem_type: regression
component: frontend_split_surface
severity: medium
symptoms:
  - "focusing Chrome / Slack / Discord auto-applies the app-shortcuts overlay deck, but the system N-1 button no longer renders the split surface (back arrow + overlay-toggle icon with dbl-tap indicator)"
  - "tapping N-1 on an overlay deck still dismisses the overlay (the toggle still works), but the visual cue that tells the user 'this is the toggle' is gone"
  - "N-1 on regular sub-decks and on the main deck still renders the split surface — only overlay decks regressed"
root_cause: frontend_allowlist_drift
resolution_type: code_fix
related_commits:
  - 95142b9416113c8baf35816f82ae02f30c7b83d1 # introduced: overlay N-1 → core:overlay-toggle
  - 5d49b94bce541d03182701238752439a467088c4 # earlier state: overlay N-1 → core:back (the pre-regression behavior)
tags:
  - n-1-slot
  - split-surface
  - overlay-deck
  - core:back
  - core:overlay-toggle
  - core:settings-entry
  - split-action
  - frontend-render-allowlist
---

# Split surface (back + overlay-toggle) silently disappears on overlay-deck N-1

## Symptom

When the active app matches Chrome / Slack / Discord (or any other
`isOverlay: true` deck with `autoShow: true`), the runtime applies the
overlay deck. The N-1 slot used to render a `SplitActionSurface` with a
back-arrow primary (tap → dismiss overlay) and an overlay-toggle icon
secondary (dbl-tap → toggle). After a Jul 21 change, that split surface
disappears and N-1 renders as a single `core:overlay-toggle` tile.

The toggle still works; the visual treatment is what regressed.

## Root cause

The split surface allow-list in the frontend is hard-coded:

```ts
// packages/cli/frontend/src/components/Deck.tsx:358-361
const splitAction =
  splitAtN1 &&
  position === n1Position &&
  (button.type === "core:back" || button.type === "core:settings-entry")
```

`core:overlay-toggle` is not in that list, so the `SplitActionSurface`
branch never fires for it. The conditional render falls through to the
plain `ButtonFrame` rendering.

The button type that lands at N-1 on overlay decks is decided here:

```ts
// packages/cli/src/deck/system-back-injection.ts:30-35 (before fix)
if (state.lockActive === true) return null
if (deck.isMain) return "core:settings-entry"
if (deck.isOverlay === true) return "core:overlay-toggle" // ← problem
return "core:back"
```

Commit `95142b94` introduced the `isOverlay === true → core:overlay-toggle`
branch on Jul 21 with this comment:

> "at the root of an overlay deck, 'back' is a no-op (you can't back out
> of the overlay root). Use the dedicated overlay toggle so the n-1 slot
> becomes a real toggle button (tap + dbltap)."

The comment is wrong: `goBack()` (runtime.ts:289-295) already checks
`overlayDeckId !== null` first and calls `setOverlay(null)`, so
`core:back` on the overlay root _does_ dismiss the overlay. The two
types are behaviorally identical at this slot — `core:back` even has
the _better_ property that `goBack()` is the same code path used
everywhere else, and a `core:hold` action on overlay root correctly
navigates back to main.

Before `95142b94`, the same code returned `"core:back"` for overlay decks
(introduced by `5d49b94b` on Jul 17 — that commit's whole purpose was to
make N-1 = `core:back` everywhere except main, and it worked correctly).

## Fix

Revert the overlay branch in `computeSystemButtonForSlotN1` so overlay
decks inherit `core:back` like any other non-main deck. Three things
follow automatically:

1. The split surface allow-list picks it up — no frontend change needed.
2. `goBack()` continues to dismiss the overlay as before; `core:hold`
   correctly navigates to main; `core:dbl-tap` toggles via the existing
   `core:back` handler (`runtime.ts:410-437`).
3. `core:overlay-toggle` remains as a valid type — it is still used as
   the _secondary_ in the split surface (`Deck.tsx:217`) and its gesture
   handler (`runtime.ts:456`) is kept for the dbl-tap path. So the
   "legacy fallback" comment is still accurate; the type is just no
   longer _injected_ by the system.

### Code diff (ponytail, ~3 lines)

```diff
 // packages/cli/src/deck/system-back-injection.ts
   if (state.lockActive === true) return null
   if (deck.isMain) return "core:settings-entry"
-  // ponytail: at the root of an overlay deck, "back" is a no-op (you can't
-  // back out of the overlay root). Use the dedicated overlay toggle so the
-  // n-1 slot becomes a real toggle button (tap + dbltap).
-  if (deck.isOverlay === true) return "core:overlay-toggle"
+  // ponytail: at the overlay root, goBack() already dismisses the overlay
+  // (runtime.ts:289-295), so core:back tap and core:overlay-toggle tap
+  // produce the same result. Use core:back so the frontend's split-surface
+  // treatment renders on overlay decks too (the SplitActionSurface
+  // allow-list is `core:back | core:settings-entry`).
   return "core:back"
```

Test updates needed in:

- `packages/cli/src/deck/__tests__/system-back-injection.test.ts` — three
  assertions (`overlay returns toggle`, `injects overlay-toggle at n-1`,
  `overlay with navStackDepth=3 returns overlay-toggle`).
- `packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts`
  — one assertion (`preserves injected n-1 overlay-toggle button on
overlay deck` → `preserves injected n-1 back button on overlay deck`).

ARCHITECTURE.md §3.6 updated accordingly.

## Why not add `core:overlay-toggle` to the frontend allow-list?

Considered — small, tempting diff. Rejected because the split surface
needs two _distinct_ halves: `primary` is `renderSystemButton(button.type)`
and `secondary` is `renderSystemButton("core:overlay-toggle", overlayIcon)`.
If `button.type === "core:overlay-toggle"`, both halves render the same
view, which is a hollow cosmetic change. The split surface exists to
expose two gestures (tap on primary + dbl-tap on secondary), and
`core:overlay-toggle`'s handler treats tap and dbl-tap identically. So
the right answer is to pick a button type that _has_ distinct gestures
at N-1 — `core:back` does (tap → dismiss, hold → main, dbl-tap → toggle).

## Verification

- `pnpm test --run packages/cli/src/deck/__tests__/system-back-injection.test.ts packages/cli/src/deck/__tests__/runtime.test.ts packages/cli/src/__tests__/integration.test.ts packages/cli/src/cli/commands/__tests__/emulator-mode-build-config.test.ts` — 115 / 115 pass.
- `pnpm lint && pnpm format && pnpm typecheck` — green.
- Pre-existing failures (`logger-format.test.ts`, `deck-render.test.tsx`,
  `executor.test.ts`, `include-resolver.test.ts`, `emulator.test.ts`,
  `display-count-formatter.test.ts`, `display-rate-bytes-formatter.test.ts`,
  `addon-decks.test.ts`) — unchanged; confirmed by `git stash` round-trip.

The emulator visual check at http://127.0.0.1:52938/#/device was blocked
by a pre-existing frontend import error (`buildPresentation` is not
re-exported from `packages/cli/src/index.ts` — the React app fails to
mount the deck grid). That's a separate issue from this regression;
the runtime data path is fully verified by the unit + integration tests.

## Rule of thumb (steer clear next time)

The split surface allow-list lives in exactly one place:
`packages/cli/frontend/src/components/Deck.tsx:358-361`. Any change to
`computeSystemButtonForSlotN1` that returns a type _not_ in that list
silently drops the split treatment on that deck kind. Either:

- extend the allow-list (only safe when the new type really has distinct
  tap/dbl-tap semantics — otherwise the split is decorative),
- or — usually better — pick a system button type whose gesture handler
  already does the right thing at that slot.

`goBack()` at the overlay root already does the right thing. The
`core:overlay-toggle` type was added at the wrong layer: it should have
been a _handler_ of an existing type, not a new injected type.
