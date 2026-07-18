---
phase: 6
phase_name: Lock Deck
extracted: 2026-07-17
plan_count: 3
summary_count: 3
missing_artifacts: none
---

# Phase 6: Lock Deck — Learnings

## Decisions

### D1: Mutex flag, not a 3rd layer
**What:** Lock mode is a single boolean `lockActive` that gates `getActiveDeckId()`, instead of a separate "lock layer" parallel to regular + overlay.
**Why:** A 3rd layer duplicates state-surface (own nav stack, own overlay registry, own system-button policy). Mutex + pre-lock snapshot restore was preferred for simplicity.
**Source:** `06-CONTEXT.md`, `06-01-PLAN-SUMMARY.md`

### D2: Suspend overlay, don't clear it
**What:** On lock entry, snapshot `overlayDeckId` into `preLockOverlayDeckId`. On unlock, if the trigger still matches, call `setOverlay(preLockOverlayDeckId, {source: "autoShow"})` to auto-resume. Otherwise dismiss + restore regular deck.
**Why:** User wanted prior overlay context preserved across lock cycles if the trigger still matches.
**Source:** `06-CONTEXT.md`, `06-03-PLAN-SUMMARY.md`

### D3: Singleton `core:lock` deck (registered, not synthesized)
**What:** `core:lock` is registered as a real addon deck in `core` addon's manifest, not synthesized in the runtime. It always lives in the static `decks` array. Button content is decided by the addon factory.
**Why:** Allows `navigateToDeck("core:lock")` to work like any regular deck (no "deck not found" warning). Cleaner separation of concerns: runtime knows nothing about lock buttons; addon factory decides based on user config.
**Source:** `06-UAT.md` (architectural shift during UAT)

### D4: Folder-nav escape via button-type whitelist
**What:** `LOCK_FOLDER_NAV_TYPES = new Set(["core:change-deck", "core:page-nav"])`. Both types already publish `runtime:navigate-deck` to the pubsub; the lock pre-check only needs to recognize them.
**Why:** Reuses the existing pubsub path (button backend → pubsub → `run.ts` subscriber → `runtime.navigateToDeck`). No new `navigate://` dispatch prefix needed. Cleaner than introducing a new action-string convention.
**Source:** `06-RESEARCH.md`, `06-02-PLAN-SUMMARY.md`

### D5: Pre-check in `invokeAction`, NOT `getActiveDeckId`
**What:** Lock-mode gesture suppression lives at the top of `invokeAction`, after `findButton` returns. Active-deck check accepts `lock:deck` (now `core:lock`) deckId after escape.
**Why:** Lets the post-escape gesture flow through to the addon's registered `onTap` handler, which publishes `runtime:navigate-deck`. Without this, the post-escape active-deck check (`found.deckId !== getActiveDeckId()`) would drop the gesture because `getActiveDeckId()` returns the regular deck (lock cleared) but `found.deckId` is still `"core:lock"`.
**Source:** `06-02-PLAN-SUMMARY.md` (post-implementation fix)

### D6: Snapshot captures regular-layer deck (not overlay top)
**What:** `snapshotRegularActiveDeckId()` uses `overlayPreviousActiveId ?? transientDeckId ?? navStack[top] ?? mainDeck.id`.
**Why:** When lock fires while overlay is active, `getActiveDeckId()` returns the overlay's top stack. We want the deck *behind* the overlay, captured via Phase 5's `overlayPreviousActiveId` snapshot.
**Source:** `06-03-PLAN-SUMMARY.md` (Plan 3 bug catch)

### D7: Backend-only, no protocol changes
**What:** No new protocol messages; lock deck flows through the existing `deck-config` message like any other deck.
**Why:** Simpler integration; frontend sees a regular deck with buttons and renders normally. `runtime:lock-mode` pubsub event provides the orthogonal "lock state" channel if frontend needs it.
**Source:** `06-CONTEXT.md`

### D8: Snapshot refresh on consecutive `locked` events
**What:** Second `state === 'locked'` while already locked refreshes `preLockActiveDeckId` and `preLockOverlayDeckId`.
**Why:** Handles screen-saver pulse interleaved with actual lock events. The resume logic guards against double-execution by clearing snapshots to `null` after consume.
**Source:** `06-03-PLAN-SUMMARY.md`

## Lessons

### L1: Addon factory context shape (AddonDeckFactory vs AddonDeckDefinition)
**What happened:** Initial implementation used `AddonDeckFactory = (page: number) => AddonGeneratedDeck` signature expecting `({config})` context. The registry wraps plain functions into a `createDecks` that drops the context entirely: `createDecks: () => { const deck = entry(0); return { [deckName]: deck } }`. Factory threw, addon-decks caught silently, `core:lock` was never registered → user saw `WARN navigateToDeck: deck not found, deckId: core:lock`.
**Why it matters:** When using `decks:` in an addon manifest, use `AddonDeckDefinition` shape (`{createDecks: ({config}) => ...}`) to receive context. Plain function form only gets a `page: number`.
**Source:** `06-UAT.md` (debugging session)

### L2: User config naming matters
**What happened:** User put lock-deck buttons under `decks.lock` in `config.yml`, expecting it to work like the old `session:locked` addon. The runtime ignored `decks.lock` (it's just a regular deck named `lock`, not the addon deck `core:lock`). User saw default time tiles even with their config.
**Why it matters:** Document clearly that lock buttons go under top-level `lock:`, not `decks.lock`. Or auto-merge `decks.lock` into the addon deck (backward-compat). Either way, the convention must be obvious.
**Source:** `06-UAT.md` test 3 failure → config.yml fix

### L3: Special cases in runtime are usually wrong
**What happened:** First implementation put the "if active deck is `core:lock`, build user or default buttons" logic in `runtime.ts:getActiveDeck`. User explicitly called this out as bad code smell — "the logic of inject the user config or the default one must happen in the packages/cli/src/builtin-addons/core/index.ts file".
**Why it matters:** Runtime should look up decks, not decide their content. Deck-creation logic belongs in the addon factory. Move logic to the layer that has the data (config → factory → addon → materialize → runtime static decks).
**Source:** Direct user feedback during UAT

### L4: `findButton` must know about synthesized decks
**What happened:** `findButton` only iterated the static `decks` array. Synthesized lock deck buttons couldn't be looked up. `dispatchGesture("lock:deck:0", "tap")` failed with "button not found".
**Why it matters:** When a deck exists in `getActiveDeck()` output but not in the static array, `findButton` needs to consult `getActiveDeck()`. With the addon-factory refactor, `core:lock` is now in the static array — but this lesson applies to any future synthesized deck.
**Source:** `06-02-PLAN-SUMMARY.md` (post-implementation fix)

### L5: One task per commit is the right rhythm
**What happened:** Phase 6 had ~12 commits across 3 plans. Each commit was small, atomic, and self-contained. Made debugging easy (git bisect, selective revert).
**Why it matters:** Atomic commits make the diff readable, the history bisectable, and reviews focused. Each commit was either "schema change", "runtime state change", "addon registration", "test mock update" — easy to understand in isolation.
**Source:** All PLAN files in `06-lock-deck/`

## Patterns

### P1: Closure-local state in `createRuntime`
**When to use:** Any ephemeral runtime state that doesn't belong in the persistence layer (snapshots, cached pointers, session subscription handles). Phase 6 added `lockActive`, `preLockActiveDeckId`, `preLockOverlayDeckId`, `sessionUnsubscribe`, `latestActiveAppSnapshot` as closure-locals — same pattern Phase 5 used for `overlayDeckId`, `overlayPreviousActiveId`, `overlayNavStacks`.
**Source:** `06-RESEARCH.md`, `06-01-PLAN-SUMMARY.md`

### P2: Setter method mirrors existing setter
**When to use:** When adding a new provider to the runtime. `setSessionProvider` mirrors `setActiveAppProvider` exactly: subscribes once, replaces prior subscription, stores unsubscribe in closure for shutdown. Same shape, predictable for callers.
**Source:** `06-01-PLAN-SUMMARY.md`

### P3: Snapshot regular-layer deck via Phase 5's `overlayPreviousActiveId`
**When to use:** When restoring user context after a global mode change, use Phase 5's existing `overlayPreviousActiveId` snapshot to recover the deck *behind* the overlay — not `getActiveDeckId()` which returns the overlay top.
**Source:** `06-03-PLAN-SUMMARY.md`

### P4: Default fallback when user config absent
**When to use:** Whenever a user-configurable feature has sensible defaults. The addon factory checks `userButtons !== undefined && userButtons.length > 0` and falls back to the 3-button time tiles. No config required, but always works.
**Source:** `06-CONTEXT.md`, `06-RESEARCH.md`

### P5: Test files mirror addon factory output
**When to use:** When the addon factory produces a specific button shape, tests can include a tiny helper that builds the same shape directly into the `decks` array. Avoids coupling tests to addon internals; tests stay focused on runtime behavior.
**Source:** `06-02-PLAN-SUMMARY.md`, `06-03-PLAN-SUMMARY.md`

### P6: Lock-mode escape uses button-type whitelist, not action prefix
**When to use:** When defining escape hatches for restricted modes. Recognizable by: "is this button type known to navigate?" rather than "does this action string match a pattern?". Reuses the existing pubsub plumbing (`runtime:navigate-deck`) without adding new dispatch prefixes.
**Source:** `06-02-PLAN-SUMMARY.md`

### P7: Integration test for addon factory registration
**When to use:** Whenever a special deck is registered through an addon. Tests should exercise `materializeAddonDecks(registry, ..., addonManifest)` end-to-end to catch registration errors (silent failures when factory throws). Plain runtime tests don't catch addon-registry issues.
**Source:** `06-UAT.md` (L1 lesson) → `addon-core-lock.test.ts`

## Surprises

### S1: Addon factory context loss (the big one)
**What was surprising:** The `AddonDeckFactory` signature `(page: number) => AddonGeneratedDeck` doesn't match its name's intuition — it receives a page number, not a context. The registry wraps it into `createDecks` that calls `entry(0)` and drops the context. Factories that destructure `({config})` from the parameter silently throw.
**Impact:** Lost ~30 min debugging the WARN log. Required changing the factory to `AddonDeckDefinition` shape. Should have been caught by the unit tests — added integration test in `addon-core-lock.test.ts` to catch this pattern in future.
**Source:** `06-UAT.md` (L1)

### S2: Plan-3 snapshot bug — overlay top vs regular layer
**What was surprising:** When lock fires while an overlay is active, `getActiveDeckId()` returns the overlay's top stack (e.g. "spotify"), not the regular-layer deck (e.g. "media"). The first implementation stored the wrong deck id; on unlock, the user landed on the overlay deck instead of the regular deck behind it.
**Impact:** Discovered by the overlay-resume test (`expected 'spotify' to be 'media'`). Fixed by reading `overlayPreviousActiveId` (Phase 5's snapshot) instead of `getActiveDeckId()`.
**Source:** `06-03-PLAN-SUMMARY.md`

### S3: Test poll-loop timing
**What was surprising:** The active-app poll loop is `setInterval` at 1000ms with a 200ms debounce. Tests that need a snapshot to propagate must wait ≥ 1200ms. The original `await wait(50)` and `wait(1100)` were too short — overlay wasn't applied yet.
**Impact:** Tests initially failed with `getOverlay() === undefined`. Increased wait to 1500ms.
**Source:** `06-03-PLAN-SUMMARY.md`

### S4: `core:change-deck` already publishes `runtime:navigate-deck`
**What was surprising:** The folder-nav mechanism isn't a new dispatch prefix — it's a pubsub event. `core:change-deck.onTap` (backend) publishes `runtime:navigate-deck`; `run.ts` subscribes and calls `runtime.navigateToDeck`. So the lock pre-check just needs to recognize the button type, no new wiring required.
**Impact:** Saved time during Plan 02 — could reuse existing pubsub plumbing instead of adding a new `navigate://` dispatch prefix.
**Source:** `06-RESEARCH.md`, `06-02-PLAN-SUMMARY.md`

### S5: Pre-existing test failures are everywhere
**What was surprising:** 12 tests were failing before Phase 6 started. The memory said "pre-existing test failures remain" from the requirements-check phase. None of them were caused by Phase 6 work — verified by stashing all Phase 6 commits and re-running on trunk.
**Impact:** Made baseline tracking essential. Every phase measurement must compare against the pre-existing baseline, not assume the count drops to zero.
**Source:** `06-VERIFICATION.md`

### S6: User-config reuse of `core:lock` id
**What was surprising:** The user had already defined `decks.lock` in their `config.yml` from a previous attempt at the lock feature. When I registered `core:lock` as a real addon deck, the user's config didn't see any effect — they'd been configuring the wrong place.
**Impact:** Had to update user's `config.yml` to use the new `lock:` top-level block. Tests didn't catch this because they use synthetic test decks, not real user configs.
**Source:** `06-UAT.md` test 3

---

*Extracted from Phase 6 artifacts on 2026-07-17*