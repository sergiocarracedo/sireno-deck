# Quick Task 009 — Plan

**Slug:** overlay-mode-routing
**Status:** Ready for execution

## Bug summary

1. Switching the active app from chrome to warp (both have overlay decks)
   keeps the chrome overlay active. Expected: the active overlay follows
   the matched overlay. The previous overlay's state (nav stack) is
   preserved and the previous overlay becomes unavailable.
2. The pagination button on chrome-overlay pages does not visually
   advance. Internally `transientDeckId` changes (so the runtime's
   `getActiveDeckId()` returns the next page), but the frontend keeps
   showing page 1.

## Architectural clarification (user)

Overlay is a MODE (a routing branch), not a forced deck. In overlay
mode, navigation (pagination, change-deck) works against the overlay's
own nav history. Once overlay mode is on, the active overlay deck
auto-follows the currently matched overlay (chrome → warp switches
overlay to warp-overlay). The previous overlay's `overlayNavStacks`
entry is kept so re-activating it later restores its state.

## Task 1 — Auto-switch active overlay when matched overlay changes

<files>
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`
</files>

<action>
- In `applyOverlay()` (runtime.ts:614-643), change the branch:
  - When `overlayDeckId !== null` and the new matched `deckId` is a
    DIFFERENT overlay deck (not null), instead of dismissing the
    current overlay via `setOverlay(null)`, do this:
    1. Initialize `overlayNavStacks` for the new deck (same as
       `setOverlay` does at lines 305-307: if no entry exists,
       set to `[newDeckId]`).
    2. Call `setOverlay(newDeckId, { source: "autoShow" })`. This
       sets `overlayDeckId = newDeckId`, publishes `runtime:overlay`
       and `runtime:activeDeck` for the new deck. The previous
       `overlayNavStacks.get(previousOverlayId)` entry is preserved
       automatically (we only re-assign `overlayDeckId`; the map
       is untouched for the previous key).
  - The `if (deckId === lastOverlayDeckId) return` early-out at
    line 630 already covers "same overlay matched again" — keep it.
  - The `deck.autoShow !== true` short-circuit at line 637 means
    non-autoShow overlays are NOT auto-applied, even when overlay
    mode is already on. Per the user's clarification, when overlay
    mode is on the active overlay should follow the match regardless
    of `autoShow`. Drop the `deck.autoShow !== true` guard inside
    the "overlay already active, switching to new match" branch,
    but keep it for the "no overlay active yet, autoShow decides"
    path. Concrete shape:
    ```ts
    if (overlayDeckId !== null && deckId !== overlayDeckId && deckId !== null) {
      // overlay mode is on; follow the new match.
      setOverlay(deckId, { source: "autoShow" })
      lastOverlayDeckId = deckId
      return
    }
    if (deck.autoShow !== true) {
      lastOverlayDeckId = deckId
      return
    }
    setOverlay(deckId, { source: "autoShow" })
    lastOverlayDeckId = deckId
    ```
  - The existing `if (overlayDeckId !== null && deckId !== overlayDeckId)`
    block at lines 619-625 (which dismisses the previous overlay
    when its trigger no longer applies AND no new deck is matched)
    becomes redundant for the "new deck matched" case — but still
    needs to handle `deckId === null` (the matched overlay went
    away). Restructure:
    ```ts
    if (deckId === null) {
      // No overlay matches anymore. If we had one, dismiss it.
      if (overlayDeckId !== null) {
        setOverlay(null, { source: "autoShow" })
      }
      lastOverlayDeckId = null
      return
    }
    if (overlayDeckId !== null && deckId !== overlayDeckId) {
      // Overlay mode is on and the match moved. Switch.
      setOverlay(deckId, { source: "autoShow" })
      lastOverlayDeckId = deckId
      return
    }
    // Same overlay (or none yet active). Honor autoShow on first match.
    if (deckId === lastOverlayDeckId) return
    const deck = deckById(deckId)
    if (deck === undefined) return
    if (deck.autoShow !== true) {
      lastOverlayDeckId = deckId
      return
    }
    setOverlay(deckId, { source: "autoShow" })
    lastOverlayDeckId = deckId
    ```
- Add tests in `runtime.test.ts`:
  - **"overlay auto-switches when matched overlay changes (overlay mode on)"**
    Build runtime with two overlay decks: chrome-overlay (autoShow:false)
    and warp-overlay (autoShow:false). Activate chrome-overlay manually
    (`runtime.setOverlay("chrome-overlay:shortcuts-p1", { source: "manual" })`).
    Then call `computeOverlayFor` with a warp snapshot, run
    `applyOverlay("warp-overlay:...")`. Assert:
    - `runtime.getOverlay()?.id === "warp-overlay:..."`
    - `runtime.getActiveDeckId()` returns the warp overlay's first page.
    - The previous chrome-overlay's nav stack is still in
      `overlayNavStacks` (via test accessor — there is no public
      getter; use `runtime.getOverlayNavStacks?.()` if exposed,
      otherwise assert by re-activating chrome-overlay and checking
      it lands back on the original page).
  - **"overlay state preserved across auto-switch (then re-activate)"**
    Activate chrome-overlay, navigate to `-p2` (`navigateToDeck("-p2")`).
    Switch to warp-overlay (via `applyOverlay`). Re-activate
    chrome-overlay (`applyOverlay("chrome-overlay:shortcuts-p1")`).
    Assert the active deck returns to `-p2` (the page user was on).
</action>

<verify>
- `pnpm exec vitest run packages/cli/src/deck/__tests__/runtime.test.ts`
  passes (existing tests unchanged + 2 new tests pass).
- `pnpm -C packages/cli typecheck` — no new errors.
- Manual: launch CLI, focus chrome (auto-show overlay), focus warp
  (chrome overlay should switch to warp-overlay without manual toggle),
  refocus chrome (chrome-overlay returns to its previous page).
</verify>

<done>
- `grep -n 'overlay mode is on and the match moved' packages/cli/src/deck/runtime.ts`
  shows the new branch.
- The 2 new tests pass; no existing tests regress.
</done>

## Task 2 — Fix pagination broadcast: page decks must re-render the frontend

<files>
- `packages/cli/src/cli/commands/run.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts` (only if a unit test
  for the broadcast subscriber is feasible; otherwise skip and rely on
  the smoke test)
</files>

<action>
- Root cause: when the user taps "next page" on `chrome-overlay:shortcuts-p1`,
  `core:page-nav` publishes `runtime:navigate-deck { deckId: "chrome-overlay:shortcuts-p2", addToHistory: false }`.
  `navigateToDeck` sets `transientDeckId = "chrome-overlay:shortcuts-p2"` and
  publishes `runtime:activeDeck { deckId: "chrome-overlay:shortcuts-p2" }`.
  The broadcast subscriber in run.ts:209-236 finds the page deck in `decks`
  (it IS there — `materializeAddonDecks` returns one runtime deck per page
  via `mapAddonDeckToRuntimeDeck` → `paginateDeck`), and broadcasts the
  new deck config.

  The bug: `lastBroadcastedDeckId` in the subscriber is the PREVIOUS page's
  id (or the overlay root's id when overlay activates). When the broadcast
  is published, `deckId !== lastBroadcastedDeckId` so the broadcast
  proceeds. BUT — after the broadcast, `lastBroadcastedDeckId` is set to
  the new page's id. When the broadcast handler for the FIRST page
  navigation runs, the value is `"chrome-overlay:shortcuts-p1"` and the
  new value is `"chrome-overlay:shortcuts-p2"`. Different. So broadcast
  should happen.

  Real root cause (after re-reading): the broadcast subscriber's
  `decks.find((d) => d.id === deckId)` succeeds for the page deck, but
  `buildDeckConfigMessage` for the page deck has `navStackDepth:
  runtime.navStackDepth()` which is 1 (overlay root only — pagination
  uses transient, doesn't push). The frontend may render this with the
  SAME `navStackDepth` and assume no change. Or the frontend's Deck
  component memoizes on `deck.id` and re-renders correctly, but the
  page-nav button on the new page is misconfigured.

  Most likely culprit: in `paginateDeck.ts`, the FIRST page's
  `prevDeckId` is set to `baseDeckId` (line 47). For chrome-overlay,
  `baseDeckId = "chrome-overlay:shortcuts"`, but the runtime only
  has `chrome-overlay:shortcuts-p1`, `-p2`, `-p3`. There is NO
  runtime deck with id `"chrome-overlay:shortcuts"`. So when the user
  taps the prev button on page 1, `navigateToDeck("chrome-overlay:shortcuts",
  { addToHistory: false })` is called, but `deckById` returns undefined
  and the call is dropped (runtime.ts:224-227). Similarly, the LAST page's
  `nextDeckId` is the same dead `baseDeckId`.

  For the user's symptom — "shows page 1 even though internally changed" —
  a different culprit is more likely: the FIRST page's `prevDeckId` being
  set to `baseDeckId` (which doesn't exist) means the prev-button on
  page 1 is broken, but that's only ONE direction. The user said
  pagination doesn't work. The user is tapping the "next" button on
  page 1 expecting to see page 2.

  The REAL root cause for "page 1 stays visible": the `prevDeckId` on
  page 1 is `baseDeckId`. The `nextDeckId` on page 1 is
  `chrome-overlay:shortcuts-p2`. Both are wired into the `core:page-nav`
  button's config. When the user taps the next button on page 1, the
  navigation DOES happen (transientDeckId changes), the broadcast DOES
  fire (deckId changes), the frontend DOES receive the new deck config.
  HOWEVER, looking at `core:page-nav` config, the button itself contains
  `currentPage`, `totalPages`, `prevDeckId`, `nextDeckId`. The frontend
  may be reading `currentPage` from this config to display "page X of Y"
  — but no, the user said the buttons themselves don't change.

  Re-reading the user's report: "the pagination button doesnt work (it
  seems to change the page internally but shows the page 1)". This is
  exactly the symptom of: the navigation handler runs (transientDeckId
  updates), the broadcast publishes the new deck, but the frontend
  does NOT re-render with the new deck.

  Final likely cause: in `run.ts` line 218, `if (deckId === lastBroadcastedDeckId) return`.
  When the user activates chrome-overlay, the broadcast fires for
  `chrome-overlay:shortcuts-p1`. `lastBroadcastedDeckId = "chrome-overlay:shortcuts-p1"`.
  Then the user taps next, deckId becomes `"chrome-overlay:shortcuts-p2"`.
  `lastBroadcastedDeckId` is `"chrome-overlay:shortcuts-p1"`, so broadcast
  proceeds. So this is NOT the issue.

  The TRUE root cause: when `setOverlay` activates the overlay, the
  broadcast fires `runtime:activeDeck { deckId: "chrome-overlay:shortcuts-p1" }`.
  But the runtime's `overlayDeckId` is set to `chrome-overlay:shortcuts-p1`,
  and `getActiveDeckId()` returns `transientDeckId ?? overlayDeckId ?? navStack top`.
  When `transientDeckId = null`, `getActiveDeckId()` returns
  `overlayDeckId` = `"chrome-overlay:shortcuts-p1"`. When the user
  taps next-page, transientDeckId becomes `"chrome-overlay:shortcuts-p2"`.
  `runtime:activeDeck { deckId: "chrome-overlay:shortcuts-p2" }` fires.
  `decks.find((d) => d.id === "chrome-overlay:shortcuts-p2")` succeeds.
  Broadcast fires.

  This SHOULD work. So either:
  (a) The page deck is NOT in the runtime's `decks` list (most likely
      if materialization is wrong for paginated addon decks).
  (b) The frontend does not re-render on deck-config.

  Investigate by reading `frontend/src/App.tsx` deck-config handler.
  If the handler keys off `deckId` correctly, suspect (a). To verify
  (a), check `materializeAddonDecks` for paginated addons — at line
  299, it pushes `mapAddonDeckToRuntimeDeck(...)`. That function
  returns `pages` for paginated decks. So `materializeAddonDecks`
  returns one entry per page. The runtime should see all 3 page
  decks in its `decks` list.

  At runtime construction time, the decks are passed to the runtime.
  Find where the runtime is constructed (`buildRuntime`?) and verify
  the addon decks include all 3 page decks. Add a debug log
  temporarily if needed.

  Most concrete fix: in `paginateDeck.ts`, when generating `prevDeckId`
  for the FIRST page, use `${baseDeckId}-p1` instead of `baseDeckId`.
  And for the LAST page's `nextDeckId`, use the last page's full id
  (which would be a no-op tap). This keeps the page-nav buttons
  consistent — every page knows its prev/next within the page set.
  The "first page's prev" becomes self-loop (no-op), the "last page's
  next" becomes self-loop. The actual entry/exit to the overlay is
  handled by the `core:overlay-toggle` button (already wired).
  This fix addresses one half of the user's report (prev button
  broken on page 1). The other half (page change visually stuck)
  needs more investigation — see the open question in the plan
  or run a manual repro.

  IF after implementing Task 2's fix the "stuck on page 1" symptom
  remains, the issue is likely that the page deck's broadcast message
  includes the same `navStackDepth` as the previous (both 1) and the
  frontend's React state update is a no-op (React doesn't see a change
  in the deck-config reference because the message object is constructed
  fresh but the `deck` field references the same shared runtime deck).
  In that case the fix is to bump a "version" counter on the deck
  config or to ensure the frontend's Deck component re-keys on
  `deckId + navStackDepth`. But this is speculative — Task 2 ships
  the minimal page-id fix and the manual verify confirms.

  Concrete change for Task 2: in `paginateDeck.ts`:
  - Line 46-48: when `isFirstPage`, set `prevDeckId` to the first
    page's id (self-loop) — keep the current `nextDeckId` logic.
  - Line 49-51: when `isLastPage`, set `nextDeckId` to the last
    page's id (self-loop) — keep the current `prevDeckId` logic.
  - The page-nav button on page 1 tapping "prev" with self-loop
    target is a no-op. The page-nav button on page 3 tapping "next"
    with self-loop target is a no-op. Both intentional — entering/
    exiting the overlay is via `core:overlay-toggle` only.
</action>

<verify>
- `pnpm exec vitest run packages/cli/src/deck/__tests__/paginate-deck.test.ts`
  (if it exists) passes.
- `pnpm exec vitest run packages/cli/src/cli/commands/__tests__/addon-decks.test.ts`
  passes (existing pagination tests still hold with the new prev/next ids).
- `pnpm -C packages/cli typecheck` — no new errors.
- Manual: launch CLI with chrome-overlay, tap "next page" on page 1,
  confirm the page advances; tap "prev" on page 1, confirm no error
  and the page doesn't change.
</verify>

<done>
- `grep -n 'prevDeckId = isFirstPage' packages/cli/src/deck/paginate-deck.ts`
  shows the updated logic.
- Page 1's prev button has `prevDeckId === deckId` (self-loop).
- Last page's next button has `nextDeckId === deckId` (self-loop).
- Existing pagination tests pass.
</done>

## Task 3 — Auto-dismiss overlay on first page (regression check)

<files>
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/__tests__/runtime.test.ts`
</files>

<action>
- Per the user's answer to my question: "Back at any page dismisses
  overlay". This is already the current behavior for `goBack` when
  `transientDeckId !== null`: lines 268-282 of runtime.ts already
  clear the transient and restore the regular deck top. BUT the
  current implementation has a quirk: when the user is on a paginated
  page inside an overlay (e.g., `chrome-overlay:shortcuts-p2`), then
  presses the dedicated n-1 `core:overlay-toggle` button (tap) to
  exit, the overlay toggles off and the regular deck top is restored
  — this works.

  However, the user's answer specifically said "Back at any page
  dismisses overlay". The current `core:back` button on the FIRST
  page of a paginated overlay (e.g., `chrome-overlay:shortcuts-p1`)
  is NOT a separate button — `chrome-overlay:shortcuts-p1` has
  `isOverlay: true`, so its n-1 is `core:overlay-toggle` (not
  `core:back`). So `core:back` is not even on the cell. The
  `core:overlay-toggle` tap already exits overlay mode. So no
  behavior change needed here.

  But verify: a `core:back` button on a deck WITHIN the overlay
  (e.g., the user navigates to a child deck inside the overlay
  via `change-deck`) should respect the user's instruction:
  "back at any page dismisses overlay". Currently `goBack` with
  `overlayDeckId !== null` pops the overlay's nav stack. The user
  says it should dismiss the overlay instead.

  Change `goBack()` at runtime.ts:253-282: when `overlayDeckId !== null`,
  instead of popping the overlay nav stack, dismiss the overlay
  outright:
  ```ts
  if (overlayDeckId !== null) {
    setOverlay(null)
    return
  }
  ```
  This means once in overlay mode, the only way out is to tap
  `core:overlay-toggle`. No more "back through pages". The user's
  answer is explicit on this.

  Note: this also means `goBack` no longer pops the overlay nav
  stack — `overlayNavStacks` for child decks within an overlay
  is never extended. The map entry still gets created at
  `setOverlay(deckId, ...)` with `[deckId]`. So
  `overlayNavStacks.get(overlayDeckId) === [overlayDeckId]`. The
  `applyOverlay` re-activation in Task 1 will land back on the
  overlay's root page when re-activated.

  Update `system-back-injection.test.ts` and `runtime.test.ts`
  tests that exercise overlay back to expect "dismiss overlay"
  instead of "pop overlay nav stack".

  Specifically in `runtime.test.ts`:
  - "goBack at overlay root is a noop" (line 812-822) — KEEP
    (root back via core:back is still a noop because
    `core:back` is not injected at overlay root).
  - "goBack within overlay pops stack" (line 824-836) — CHANGE
    to "goBack within overlay dismisses overlay".
  - "Stack persists across dismiss/reactivate" (line 798-810) —
    KEEP (Task 1 already exercises re-activation).

  In `system-back-injection.test.ts`:
  - No change needed (tests cover n-1 button injection, not back
    semantics).
</action>

<verify>
- `pnpm exec vitest run packages/cli/src/deck/__tests__/runtime.test.ts`
  passes (existing tests updated + Task 1 tests pass).
- `pnpm -C packages/cli typecheck` — no new errors.
- Manual: launch CLI with chrome-overlay, navigate to page 2, tap
  `core:overlay-toggle` n-1 button — overlay dismisses, regular
  deck restored.
</verify>

<done>
- `grep -n 'overlay mode: back dismisses overlay' packages/cli/src/deck/runtime.ts`
  (or the matching comment) shows the new branch.
- Updated tests pass; no regressions.
</done>

## Commit cadence

After each task:
```
git add [files]
git commit -m "feat(quick-009): [task description]"
```

## Out of scope

- Restructuring the page-nav buttons into a dedicated `<Pagination />`
  React component. Page-nav buttons currently use the addon registry
  and render via `ButtonSurface`. Visual polish of the page indicator
  is separate.
- Adding a "back" affordance within the overlay nav (e.g., on-screen
  page indicator with explicit back). The user explicitly said
  "back at any page dismisses overlay" — so no in-overlay back.
- Pre-existing test failures (weather frontend, emoji selector, run.test
  mock, integration, addon, addon-core-lock, config.bootstrap,
  emoji-decks, ws-integration). Documented in STATE.md; out of scope.
- Per-deck `autoShow: false` override when overlay mode is on — the
  user's clarification makes autoShow irrelevant once overlay is on
  (always follow the match). The autoShow field still controls
  INITIAL activation (when no overlay is active yet).
