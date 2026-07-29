# 05 — Frontend, Emulator, Shared UI

Scope: `packages/cli/frontend/`, `packages/cli/emulator/`, `packages/cli/src/ui/`.

## Findings

### [x] [05-frontend-ui #1] [P0] `Text.test.tsx` is red (`5xl` maps to `14`, test expects `48`)

**Evidence:** `packages/cli/src/ui/primitives/Text.tsx`; `packages/cli/src/ui/primitives/__tests__/Text.test.tsx` expects `5xl=48`.
**Impact:** Test failure; visible mismatch between intent and impl.
**Effort:** S
**Fix sketch:** Update `Text` size table to map `5xl → 48` (and any other drifts) or update test to match new table.
**OSS-impression:** First thing a contributor sees red.

### [x] [05-frontend-ui #2] [P0] `ws-integration.test.tsx` is an empty placeholder

**Evidence:** `packages/cli/frontend/src/__tests__/ws-integration.test.tsx` contains only `export {}`.
**Impact:** Vitest reports as failed suite; no actual integration coverage.
**Effort:** M
**Fix sketch:** Either remove the file or implement the actual WS handshake + state-channel roundtrip it claims.
**OSS-impression:** Empty test files are a top reviewer concern.

### [x] [05-frontend-ui #3] [P0] Frontend `Deck.tsx` does not pass `addonName` to addon components

**Evidence:** `packages/cli/frontend/src/components/Deck.tsx:283-289`; `AddonFrontendButtonProps` requires `addonName` but Deck doesn't supply it.
**Impact:** Addons reading `addonName` get `undefined`; can't self-identify.
**Effort:** S
**Fix sketch:** Pass `addonName` from the matched `scanned` addon to the button component.
**OSS-impression:** Contract violation on the addon API.

### [x] [05-frontend-ui #4] [P0] Frontend `Deck.tsx` passes pointer handlers that `ButtonFrame` drops

**Evidence:** `Deck.tsx` passes `onPointerDown/Up/Move/Leave/Cancel`; `ui/ButtonFrame.tsx` doesn't declare them and the div doesn't forward.
**Impact:** Holds never fire; split-action gestures broken.
**Effort:** S
**Fix sketch:** Either update `ButtonFrame` to forward pointer events, or remove the props from Deck and acknowledge the limitation.
**OSS-impression:** Public interaction model is broken.

### [x] [05-frontend-ui #5] [P0] Manual dbl-click in `Deck.tsx` emits `tap` then `dbl-tap`

**Evidence:** Same file.
**Impact:** Addons see two events for one user gesture; state machines glitch.
**Effort:** S
**Fix sketch:** Use the shared `createGestureDetector` instead of hand-rolled logic; or remove the manual fallback.
**OSS-impression:** Double-firing is a senior review concern.

### [x] [05-frontend-ui #6] [P0] Both `App.tsx` files unconditionally re-render every 250ms

**Evidence:** `frontend/src/App.tsx` and `emulator/src/App.tsx` set `now` 4× per second regardless of health.
**Impact:** Continuous re-render of every deck/addon surface or emulator page.
**Effort:** S
**Fix sketch:** Drive `now` from a `setInterval` that pauses when status is healthy; or remove the unconditional tick.
**OSS-impression:** "Why is the React DevTools tree blinking?"

### [05-frontend-ui #7] [P1] Emulator has no error boundary

**Evidence:** No `ErrorBoundary` anywhere in `packages/cli/emulator/src/`.
**Impact:** Any render exception blanks the SPA.
**Effort:** S
**Fix sketch:** Wrap `App` and each page in an `ErrorBoundary` mirroring the frontend pattern.
**OSS-impression:** Missing safety net.

### [05-frontend-ui #8] [P1] `ThemeUiPresentationProvider` receives `value={{}}` instead of `presentation`

**Evidence:** `packages/cli/frontend/src/App.tsx:123`.
**Impact:** Generated `uiOverrides` export is never imported; theme overrides silently disabled.
**Effort:** S
**Fix sketch:** Construct `presentation` from the loaded theme; pass it explicitly.
**OSS-impression:** Provider wiring bug.

### [05-frontend-ui #9] [P1] Frontend `App.tsx` publishes `state` twice per WS message

**Evidence:** `frontend/src/bridge/client.ts:102-109` + `App.tsx:286-289`.
**Impact:** Every listener invoked twice per message.
**Effort:** S
**Fix sketch:** Centralize publish; remove the duplicate in App.
**OSS-impression:** Two publishers, one event.

### [05-frontend-ui #10] [P1] `Icon.tsx` calls `useAssetCache` conditionally

**Evidence:** `packages/cli/src/ui/primitives/Icon.tsx`; `useAssetCache()` only runs for `asset://` sources.
**Impact:** Conditional hook — re-rendering between Lucide/emoji and asset changes hook order; React throws.
**Effort:** S
**Fix sketch:** Always call `useAssetCache()`; gate the cache read internally.
**OSS-impression:** Conditional hooks are a top React bug.

### [05-frontend-ui #11] [P1] `IconLabelProgressSurface.tsx` returns from theme-override branch before hooks

**Evidence:** `packages/cli/src/ui/surfaces/IconLabelProgressSurface.tsx`; conditional return pre-hooks.
**Impact:** Same hook-order violation as #10.
**Effort:** S
**Fix sketch:** Always run hooks, branch on the override after.
**OSS-impression:** Same class as #10.

### [05-frontend-ui #12] [P1] `ButtonFrame` ignores `pressed/isTapping/isHolding/holdProgress/buttonType`

**Evidence:** `packages/cli/src/ui/ButtonFrame.tsx`.
**Impact:** Props documented but ignored; downstream UX state is wrong.
**Effort:** S
**Fix sketch:** Wire each prop to its visual effect.
**OSS-impression:** Dead props are a senior review concern.

### [05-frontend-ui #13] [P1] `Bridge.client` does not close a connecting socket

**Evidence:** `packages/cli/frontend/src/bridge/client.ts`; `close()` checks `readyState` and only closes if OPEN.
**Impact:** A socket stuck in CONNECTING can fire events after unmount; pending messages queue grows.
**Effort:** S
**Fix sketch:** Call `socket.terminate()` unconditionally; cap pending queue.
**OSS-impression:** Lifecycle race.

### [05-frontend-ui #14] [P1] Emulator `bridge.ts` never resets `attempts` after success

**Evidence:** `packages/cli/emulator/src/bridge.ts`.
**Impact:** Ten successful connects over the process lifetime can permanently fail later if attempts count is global.
**Effort:** S
**Fix sketch:** Reset attempts in `onopen`.
**OSS-impression:** Cumulative-counter bug.

### [05-frontend-ui #15] [P1] `ValueChart.tsx` uses static pattern IDs

**Evidence:** `packages/cli/src/ui/surfaces/ValueChart.tsx`; pattern IDs like `chart-pattern` are hard-coded.
**Impact:** Multiple charts in one document resolve another chart's SVG pattern.
**Effort:** S
**Fix sketch:** Generate a unique ID per chart instance (`useId`).
**OSS-impression:** ID collision is a senior concern.

### [05-frontend-ui #16] [P1] `TemporaryErrorSurface.tsx` spreads `label/details` onto DOM

**Evidence:** `packages/cli/src/ui/surfaces/TemporaryErrorSurface.tsx`.
**Impact:** React DOM warnings; unknown HTML attributes leak.
**Effort:** S
**Fix sketch:** Destructure `label`/`details`; pass the rest.
**OSS-impression:** DOM warning spam.

### [05-frontend-ui #17] [P1] `IconLabelSurface.tsx` duplicates emoji rendering from `Icon`

**Evidence:** `packages/cli/src/ui/surfaces/IconLabelSurface.tsx`.
**Impact:** Two emoji implementations drift.
**Effort:** S
**Fix sketch:** Use `<Icon source="emoji:..." />` internally.
**OSS-impression:** Code duplication is a senior concern.

### [05-frontend-ui #18] [P1] Emulator `DeckFrame.tsx` only handles mouse events

**Evidence:** `packages/cli/emulator/src/DeckFrame.tsx`.
**Impact:** Keyboard activation, touch, stylus, pointer cancellation, window blur are not handled. Keyboard buttons do nothing.
**Effort:** M
**Fix sketch:** Forward keyboard events to the gesture detector; add touch support.
**OSS-impression:** Accessibility gap.

### [05-frontend-ui #19] [P1] Emulator `App.tsx` is a 1-file monolith

**Evidence:** `packages/cli/emulator/src/App.tsx` does navigation, device selection, diagnostics overlays, iframe orchestration.
**Impact:** Hard to test or extend.
**Effort:** M
**Fix sketch:** Extract `<DeviceSelector>`, `<DiagnosticsPanel>`, `<EmulatorFrame>` components.
**OSS-impression:** Largest emulator file.

### [05-frontend-ui #20] [P1] Emulator duplicates reconnect components inline

**Evidence:** `App.tsx` inlines ReconnectingBanner/DisconnectedOverlay markup; the extracted components in `components/` are unused.
**Impact:** Three sources of truth for the same UI.
**Effort:** S
**Fix sketch:** Delete inline markup; use the components.
**OSS-impression:** Duplication is a senior concern.

### [05-frontend-ui #21] [P1] Emulator `lastError` is populated from protocol `"error"` payloads, not client errors

**Evidence:** `packages/cli/emulator/src/App.tsx`.
**Impact:** A `button-error` can become the displayed connection error.
**Effort:** S
**Fix sketch:** Read `client.lastError()`; separate from protocol errors.
**OSS-impression:** Wrong source for state.

### [05-frontend-ui #22] [P1] Emulator gesture detector cross-key bug

**Evidence:** Shared detector clears `waiting-second` on any other key press without emitting the pending tap.
**Impact:** Tap on A then tap on B within window = A's tap lost.
**Effort:** S
**Fix sketch:** Test and fix cross-key cancellation behavior in `createGestureDetector`.
**OSS-impression:** Gesture semantics gap.

### [05-frontend-ui #23] [P2] `cn()` array-vs-arg bug

**Evidence:** `packages/cli/src/ui/utils/cn.ts`; if first arg is array, later args ignored.
**Impact:** Silent arg loss.
**Effort:** S
**Fix sketch:** Reject array + arg form, or document and test.
**OSS-impression:** API surface bug.

### [05-frontend-ui #24] [P2] `ChannelRegistry` retains last payloads indefinitely

**Evidence:** `packages/cli/src/api/react/registry.ts`.
**Impact:** Memory grows with every distinct dynamic channel observed.
**Effort:** S
**Fix sketch:** TTL eviction; or explicit cleanup on `unsubscribe`.
**OSS-impression:** Memory hygiene.

### [05-frontend-ui #25] [P2] `ChannelRegistry` doesn't reactively notify subscribers

**Evidence:** Same file.
**Impact:** `ButtonSurface` copies to local state; extra render.
**Effort:** S
**Fix sketch:** Use `useSyncExternalStore` on the registry.
**OSS-impression:** React 19 best practice.

### [05-frontend-ui #26] [P2] `AssetCacheContext` cache has no subscription

**Evidence:** `packages/cli/src/ui/contexts/AssetCacheContext.tsx`.
**Impact:** First `assetsReady` transition forces render; later asset updates don't notify.
**Effort:** M
**Fix sketch:** Convert to observable cache.
**OSS-impression:** Reactivity gap.

### [05-frontend-ui #27] [P2] `Icon.tsx` imports entire `lucide-react` namespace

**Evidence:** `packages/cli/src/ui/primitives/Icon.tsx`.
**Impact:** Tree-shaking defeated; bundle size grows.
**Effort:** S
**Fix sketch:** Build dynamic import map; or use explicit icon names.
**OSS-impression:** Bundle size smell.

### [05-frontend-ui #28] [P2] `TapIndicator.tsx` renders a block-level `Text` div inside a span

**Evidence:** `packages/cli/src/ui/primitives/TapIndicator.tsx`.
**Impact:** Invalid HTML nesting.
**Effort:** S
**Fix sketch:** Use inline element or restructure.
**OSS-impression:** HTML validity.

### [05-frontend-ui #29] [P2] `ProgressBar` missing ARIA

**Evidence:** `packages/cli/src/ui/primitives/ProgressBar.tsx`.
**Impact:** Screen readers get no progress info.
**Effort:** S
**Fix sketch:** Add `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`.
**OSS-impression:** Accessibility baseline.

### [05-frontend-ui #30] [P2] `BarsSurface` value layers are `aria-hidden`

**Evidence:** `packages/cli/src/ui/surfaces/BarsSurface.tsx`.
**Impact:** Screen readers get no values.
**Effort:** S
**Fix sketch:** Add text equivalents or `aria-label`.
**OSS-impression:** Accessibility baseline.

### [05-frontend-ui #31] [P2] `ReconnectingBanner` lacks `role="status"`/live region

**Evidence:** `packages/cli/frontend/src/components/ReconnectingBanner.tsx`.
**Impact:** Screen readers don't announce reconnects.
**Effort:** S
**Fix sketch:** Add `role="status"` and `aria-live="polite"`.
**OSS-impression:** Accessibility baseline.

### [05-frontend-ui #32] [P2] `SplitActionSurface` decorative divider lacks `aria-hidden`

**Evidence:** `packages/cli/src/ui/surfaces/SplitActionSurface.tsx`.
**Impact:** Decorative content announced.
**Effort:** S
**Fix sketch:** `aria-hidden="true"` on the divider; fix nonexistent `background-accent` utility.
**OSS-impression:** Accessibility baseline.

### [05-frontend-ui #33] [P2] `PaginatedSurface` manual tap kills auto-advance permanently

**Evidence:** `packages/cli/src/ui/surfaces/PaginatedSurface.tsx`; manual tap clears auto-advance interval; effect does not restart.
**Impact:** Manual tap disables the timer.
**Effort:** S
**Fix sketch:** Restart the interval effect on manual advance.
**OSS-impression:** Interaction state bug.

### [05-frontend-ui #34] [P2] `PaginatedSurface` allows empty runtime array despite `allPages[current]!`

**Evidence:** Same file.
**Impact:** Crash on empty pages.
**Effort:** S
**Fix sketch:** Validate at prop level; render placeholder.
**OSS-impression:** Defensive code missing.

### [05-frontend-ui #35] [P2] No direct tests for `ButtonFrame` interaction/pointer forwarding

**Evidence:** `packages/cli/src/themes/default/__tests__/ButtonFrame.test.tsx` passes unsupported pointer props but never asserts they work.
**Impact:** Test gives false confidence.
**Effort:** S
**Fix sketch:** Add a test that simulates pointer events and verifies handler invocation (after #4 is fixed).
**OSS-impression:** Test quality.

### [05-frontend-ui #36] [P2] No `ErrorBoundary` test in frontend

**Evidence:** No test for `packages/cli/frontend/src/components/ErrorBoundary.tsx`.
**Impact:** Boundary behavior unverified.
**Effort:** S
**Fix sketch:** Add a test that throws and verifies fallback.
**OSS-impression:** Test gap.

### [05-frontend-ui #37] [P3] `_wsClientInitialized` is module-global

**Evidence:** `packages/cli/frontend/src/bridge/client.ts`.
**Impact:** Assumes only one mounted frontend instance.
**Effort:** S
**Fix sketch:** Move into a React context.
**OSS-impression:** Module global in component code.

### [05-frontend-ui #38] [P3] `Icon` warning set is unbounded

**Evidence:** `packages/cli/src/ui/primitives/Icon.tsx`.
**Impact:** Every distinct invalid source retained forever.
**Effort:** S
**Fix sketch:** Cap the set or use LRU.
**OSS-impression:** Memory hygiene.

### [05-frontend-ui #39] [P3] `frontend/index.html` missing viewport meta tag

**Evidence:** `packages/cli/frontend/index.html` lacks `<meta name="viewport">`.
**Impact:** Mobile/responsive layouts broken.
**Effort:** S
**Fix sketch:** Add the meta tag like the emulator does.
**OSS-impression:** First HTML review.

### [05-frontend-ui #40] [P3] Production HTTP server has no SPA fallback

**Evidence:** `packages/cli/src/cli/http-server.ts` serves only `/` and `/index.html`; `/decks/:deckId` returns 404.
**Impact:** Reloading a frontend route in production fails.
**Effort:** S
**Fix sketch:** Add `app.use((req, res) => res.sendFile(indexHtml))` catch-all.
**OSS-impression:** Common bug.

### [05-frontend-ui #41] [P3] Test roots created without unmount in `ButtonFrame.test.tsx`

**Evidence:** `packages/cli/src/themes/default/__tests__/ButtonFrame.test.tsx`.
**Impact:** Test pollution across runs.
**Effort:** S
**Fix sketch:** Use `render` from Testing Library; `cleanup` after.
**OSS-impression:** Test hygiene.

### [05-frontend-ui #42] [P3] Fetches don't abort on unmount in emulator pages

**Evidence:** `packages/cli/emulator/src/pages/{AddonsPage,ConfigPage}.tsx` use a `cancelled` flag without `AbortController`.
**Impact:** Late responses can land after unmount.
**Effort:** S
**Fix sketch:** Use `AbortController` + `signal`.
**OSS-impression:** Lifecycle hygiene.

### [05-frontend-ui #43] [P3] `AddonsPage` treats `internal === builtin`

**Evidence:** `packages/cli/emulator/src/pages/AddonsPage.tsx`.
**Impact:** Conflates two concepts; tests reinforce the bug.
**Effort:** S
**Fix sketch:** Check `source` field; render separate sections.
**OSS-impression:** Domain confusion.

### [05-frontend-ui #44] [P3] `ValueChart` no accessible description

**Evidence:** `packages/cli/src/ui/surfaces/ValueChart.tsx`.
**Impact:** Screen readers see nothing.
**Effort:** S
**Fix sketch:** Add `aria-label` from `label` prop; wire `unit`.
**OSS-impression:** Accessibility baseline.

### [05-frontend-ui #45] [P3] `ValueChart` assumes points are time-sorted

**Evidence:** Same file.
**Impact:** Wrong rendering for unsorted input.
**Effort:** S
**Fix sketch:** Sort defensively or document precondition.
**OSS-impression:** Input contract drift.

### [05-frontend-ui #46] [P3] `ValueChart` negative resolution non-terminating downsample loop

**Evidence:** Same file.
**Impact:** Potential infinite loop.
**Effort:** S
**Fix sketch:** Clamp `resolution` to `>= 1`.
**OSS-impression:** Edge case.

### [05-frontend-ui #47] [P4] `TapIndicator` uses `useMemo` for trivial lookup

**Evidence:** `packages/cli/src/ui/primitives/TapIndicator.tsx`.
**Impact:** Code smell; small perf loss.
**Effort:** S
**Fix sketch:** Delete `useMemo`; compute inline.
**OSS-impression:** Premature memoization.

### [05-frontend-ui #48] [P4] `Chip.tsx` imports `TextProps` as value

**Evidence:** `packages/cli/src/ui/primitives/Chip.tsx`.
**Impact:** Tree-shaking defeat.
**Effort:** S
**Fix sketch:** `import type { TextProps }`.
**OSS-impression:** Type import style.

### [05-frontend-ui #49] [P4] `frontend/src/__mocks__/addons-registry.ts` is empty

**Evidence:** Test mock registry is empty.
**Impact:** Deck tests never exercise real addon mounting.
**Effort:** S
**Fix sketch:** Populate with 1-2 mock addons; render and assert.
**OSS-impression:** Test coverage gap.
