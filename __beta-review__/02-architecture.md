# 02 — Architecture, Runtime, Protocol

Scope: runtime, deck methods, addon-handler-bridge, gesture state machine, WS bridge, protocol schemas.

## Findings

### [x] [02-architecture #1] [P0] Token optional in protocol schema

**Evidence:** `api/protocol-internal.ts:14` `token: z.string().min(1).optional()`.
**Impact:** Production bridge cannot enforce a non-optional token via schema; must be done in handler.
**Effort:** S
**Fix sketch:** Provide a `protocolProd` variant (`.strict()` + `token: required string`); use it for the production handshake, keep dev schema permissive.
**OSS-impression:** The "we have auth" claim is undermined by an `.optional()` token field.

### [x] [02-architecture #2] [P0] `core:next-page` declared but has no handler

**Evidence:** `deck/system-buttons/types.ts:5` lists `core:next-page` in `SYSTEM_BUTTON_TYPES`; no branch in `runtime.ts:handleSystemButton` (lines 381-437) handles it; addon-handler-bridge also has no matcher.
**Impact:** Users placing `type: core:next-page` get a silent no-op; pagination over multiple decks is invisible.
**Effort:** S
**Fix sketch:** Add a `core:next-page` handler in `runtime.ts` (call existing page-nav logic) or remove from `SYSTEM_BUTTON_TYPES` if intentional.
**OSS-impression:** A declared type with no handler is a contradiction reviewers catch.

### [x] [02-architecture #3] [P0] `addon-handler-bridge.ts` hot-reload leaks old addon services

**Evidence:** `addon-handler-bridge.ts:62` aborts on daemon shutdown; `setupAddonServices.dispose()` only wired into `unregisterSignal` (daemon shutdown). Hot-reload (`run.ts:1417-1484`) creates a fresh `addonServices` map but never disposes the previous one.
**Impact:** Old pollers, timers, pubsub subscriptions accumulate across config edits; memory growth proportional to reload count.
**Effort:** M
**Fix sketch:** Wire `setupAddonServices.dispose()` into the rebuild flow; abort the previous `addonHandlerBridge` abort controller before creating the new one.
**OSS-impression:** "Why is CPU climbing after each save?"

### [x] [02-architecture #4] [P0] `runtime.ts` is a god object (890 LoC, 20+ closure vars)

**Evidence:** `deck/runtime.ts`; top-level state: `gestureListener`, `navStack`, `transientDeckId`, `overlayDeckId`, `availableOverlayDeckId`, `overlayPreviousActiveId`, `overlayNavStacks`, `brightness`, `lockActive`, `preLockActiveDeckId`, `preLockOverlayDeckId`, `sessionUnsubscribe`, active-app poll state, debounce timer, latest snapshot.
**Impact:** Hard to test, hard to refactor; high regression risk on any edit.
**Effort:** L
**Fix sketch:** Extract `createOverlayController()`, `createLockModeController()`, `createActiveAppSubscriber()` as composable controllers consumed by `createRuntime`.
**OSS-impression:** Largest class in the system; review fatigue starts here.

### [x] [02-architecture #5] [P1] `handleSystemButton` switch has overlapping branches

**Evidence:** `runtime.ts:381-437`; both `core:settings-entry` `tap` (line 410-413) and `dbl-tap` (line 428-435) navigate, plus the hold case falls through to handler lookup.
**Impact:** Ambiguous intent; hard to reason about which gesture wins when extensions are added.
**Effort:** S
**Fix sketch:** Move to a table `Record<SystemButtonType, Record<Gesture, Handler>>`; reject unknown gestures explicitly.
**OSS-impression:** Switch-overlap is the kind of bug a senior reviewer flags.

### [x] [02-architecture #6] [P1] `findButton` scans all decks on no-colon IDs

**Evidence:** `runtime.ts:156-174` splits by last colon; if absent, iterates every deck and returns the first match.
**Impact:** Addon-injected `info`/`back`/`brightness-down` IDs depend on deck order; non-deterministic.
**Effort:** S
**Fix sketch:** Normalize to `addon:type` always; reject bare button IDs in `validateButton`; resolve via `Map<buttonId, ref>` built once on `setDecks`.
**OSS-impression:** Order-dependent lookups are bugs waiting.

### [x] [02-architecture #7] [P1] `core:settings-entry` tap and dbl-tap both navigate

**Evidence:** `runtime.ts:410-413` (tap) and 428-435 (dbl-tap) both open settings or toggle overlay.
**Impact:** Two gestures on one button doing similar things → user confusion.
**Effort:** S
**Fix sketch:** Split: tap = open settings; dbl-tap = no-op (or vice versa). Decide on intent; document in ARCHITECTURE.
**OSS-impression:** Gesture mapping needs to be a table the docs agree with.

### [02-architecture #8] [P1] `invokeAction` lock-mode escape uses a hard-coded set

**Evidence:** `runtime.ts:453-474`; `LOCK_FOLDER_NAV_TYPES` only includes `core:change-deck` and `core:page-nav`.
**Impact:** An addon providing an "escape hatch" button is silently blocked in lock mode.
**Effort:** S
**Fix sketch:** Add a `lock.escape` opt-in to button config; consult it in addition to the static set.
**OSS-impression:** Hard-coded allowlists are exactly where extension authors get stuck.

### [x] [02-architecture #9] [P1] `addon-handler-bridge.ts` uses `console.error` 10× instead of the logger

**Evidence:** Lines 134, 157, 165, 269, 284, 303, 322, 333, 357, 374.
**Impact:** Errors bypass pino; not in service log file; not filterable; untyped.
**Effort:** S
**Fix sketch:** Replace with `ctx.logger.error({ addonName, buttonType, err }, "...")`; thread the logger via the bridge context.
**OSS-impression:** A grep for `console.error` returns 10 hits.

### [02-architecture #10] [P1] `addon-handler-bridge.ts` does O(n·m) lookups

**Evidence:** Lines 184-194 and 206-216 each scan `scanned` for every button in every deck.
**Impact:** With 100 buttons × 10 addons, 1000 comparisons per preflight.
**Effort:** S
**Fix sketch:** Build `Map<buttonType, ScannedAddon>` once at top; reuse.
**OSS-impression:** A perf-conscious reviewer will spot the nested scans.

### [02-architecture #11] [P1] `addon-handler-bridge.ts` has 3 near-identical handler wrappers

**Evidence:** Lines 272-336; tap/dbl-tap/hold differ only by gesture name and method name.
**Impact:** 3× the maintenance; bug fixes must be replicated.
**Effort:** S
**Fix sketch:** Factory `makeGestureHandler(gesture: "tap"|"dblTap"|"hold")` returning the closure.
**OSS-impression:** Copy-paste with two-line delta is the classic refactor target.

### [02-architecture #12] [P1] `addon-handler-bridge.ts:onUnmount` only fires on deck nav, not unload

**Evidence:** Lines 342-361 subscribe `runtime:deck-inactive` only; `runtime:addon-unloaded` does not exist; on daemon shutdown `buttonAbort.abort()` runs `dispose()` but `onUnmount` is never called for the hot-reload path.
**Impact:** Addons that expect lifecycle symmetry between nav and unload are surprised.
**Effort:** M
**Fix sketch:** Fire `onUnmount` in `dispose()` and on hot-reload; document the lifecycle as one ordered sequence.
**OSS-impression:** Lifecycle ordering matters for addon authors.

### [02-architecture #13] [P1] `addon-handler-bridge.ts` unload ctx is a stub

**Evidence:** Lines 363-371; `publish: () => {}`, `poll: async () => {}`.
**Impact:** A poll mid-execution races with `onUnload`; `media/backend.ts:139-142` mutates `provider` while poll still running.
**Effort:** S
**Fix sketch:** Await in-flight polls before `onUnload`; expose `await untilIdle()` on the bridge ctx.
**OSS-impression:** Race conditions in unload are a known extension footgun.

### [02-architecture #14] [P1] `runtime.ts:active-app` poll has no rejection handler

**Evidence:** Lines 741-764; `void provider.getActive().then(...)` — promise with no `.catch`.
**Impact:** If `getActive()` throws (dbus dies), unhandled rejection hits `main.ts:64-69` and kills the daemon.
**Effort:** S
**Fix sketch:** `.catch(err => log.warn({ err }, "active-app poll failed"))`.
**OSS-impression:** Unhandled rejection in a long-lived daemon is a top reliability concern.

### [02-architecture #15] [P1] Active-app debounce window (200ms) is dead

**Evidence:** `runtime.ts:738` debounce = 200ms; `runtime.ts:763` poll interval = 1000ms; only one snapshot can be in flight.
**Impact:** Dead code; misleading comment.
**Effort:** S
**Fix sketch:** Remove the debounce timer or lower the poll interval below the debounce window.
**OSS-impression:** Ineffective code smells worse than missing code.

### [x] [02-architecture #16] [P1] `setDecks` resets `overlayDeckId` but not `overlayPreviousActiveId`

**Evidence:** `runtime.ts:150-153`.
**Impact:** Hot-reload while overlay is active leaves stale `overlayPreviousActiveId`; `setOverlay(null)` tries to restore a dead id then falls back.
**Effort:** S
**Fix sketch:** Reset both or neither; document the chosen behavior.
**OSS-impression:** Asymmetry is a hint at a missing invariant.

### [02-architecture #17] [P1] `ws-bridge` `subscribe-channels` broadcasts to all clients

**Evidence:** `render/ws-bridge.ts:143-160` iterates `wss.clients` to push triggered poll results.
**Impact:** A new client subscribing to its own channel causes a broadcast to all existing clients — privacy leakage across surfaces.
**Effort:** M
**Fix sketch:** Broadcast only to the requesting socket; or add an explicit `isPrivate` flag in channel registration.
**OSS-impression:** Cross-client broadcast is exactly the bug privacy-conscious reviewers look for.

### [x] [02-architecture #18] [P1] `ws-bridge` parse errors are silent (no log)

**Evidence:** `render/ws-bridge.ts:75-165`; `JSON.parse` and `safeParse` failures close the socket with codes 4002/4003 but no log line.
**Impact:** Operator sees "WS connection lost" with no reason; debugging impossible.
**Effort:** S
**Fix sketch:** `logger.warn({ reason, raw }, "ws message rejected")` before close.
**OSS-impression:** No log = no signal in production.

### [x] [02-architecture #19] [P1] `ws-bridge` cacheable poller runs N times for N waiting sockets

**Evidence:** `render/ws-bridge.ts:212-232` `for (const sock of waiting)` calls poll() per socket.
**Impact:** 10 sockets × 100ms = 1s channel latency.
**Effort:** S
**Fix sketch:** Poll once, broadcast result to all waiting sockets.
**OSS-impression:** N× amplification in a per-channel path is conspicuous.

### [02-architecture #20] [P1] `ws-bridge` only validates token on `hello`

**Evidence:** `render/ws-bridge.ts:99-105`; no re-check after handshake.
**Impact:** A hijacked TCP socket (post-handshake, local-process) can send any message.
**Effort:** S
**Fix sketch:** For each message, re-include a nonce bound at hello; verify on subsequent frames.
**OSS-impression:** Trust-once is a known anti-pattern.

### [x] [02-architecture #21] [P1] `ws-bridge` handshake timeout is silent (no log)

**Evidence:** `render/ws-bridge.ts:13` `HANDSHAKE_TIMEOUT_MS = 5000`; close with no log entry.
**Impact:** Misbehaving clients die quietly.
**Effort:** S
**Fix sketch:** Log on timeout with peer ip/port.
**OSS-impression:** Silent timeouts are a debugging blind spot.

### [x] [02-architecture #22] [P1] `state-publisher.cadence` field is dead

**Evidence:** `render/state-publisher.ts:21-28`; set in `registerChannel`, never read.
**Impact:** Confuses readers; signals incomplete refactor.
**Effort:** S
**Fix sketch:** Delete the field.
**OSS-impression:** Dead state = unfinished work.

### [02-architecture #23] [P1] `icon-source-resolver.ts` silently breaks on `data:`/`http:` URLs

**Evidence:** `render/icon-source-resolver.ts:46-55` rejects at resolve time with no upstream enforcement; addon frontends can send a `data:` icon and the resolver throws.
**Impact:** Frontend fallback chain renders `alert-circle` Lucide icon silently.
**Effort:** S
**Fix sketch:** Resolve at button-config validation time, not at message build time; provide an explicit "broken icon" surface.
**OSS-impression:** Silent fallback = invisible bug.

### [02-architecture #24] [P2] `methods.ts:dispatch` parses `type://{...}` JSON without strict validation

**Evidence:** `methods.ts:198-243`; `JSON.parse(inner)` throws on malformed input; the runtime surfaces it as a `NotImplementedError` but the layer has no Zod check.
**Impact:** Runtime sees a string-shaped throw for what should be a structured failure.
**Effort:** S
**Fix sketch:** Wrap in a Zod schema for `DispatchPayload`; surface as a typed error.
**OSS-impression:** Manual JSON.parse is a regression vs the rest of the codebase.

### [02-architecture #25] [P2] `methods.ts:keyMacro` `kind` discrimination is documentation-only

**Evidence:** `methods.ts:156-186`; the `kind` field is mapped but the provider has its own kind detection.
**Impact:** Layer's responsibility is unclear.
**Effort:** S
**Fix sketch:** Either delete the kind switch or make it the canonical dispatch point.
**OSS-impression:** Decorative branches are confusing.

### [02-architecture #26] [P2] `system-back-injection.ts` drops user buttons silently in lock mode

**Evidence:** `system-back-injection.ts:30, 53-54`; if user has a button at slot n-1 AND lock is active, the user's button is dropped and no system button replaces it.
**Impact:** Slot stays empty; undocumented behavior.
**Effort:** S
**Fix sketch:** Document in ARCHITECTURE; add a `// ponytail:` comment if intentional.
**OSS-impression:** Implicit slot rules need to be explicit.

### [02-architecture #27] [P2] `paginate-deck.ts` O(n²) position assigner

**Evidence:** `deck/position-buttons.ts:1-64`; bumps on duplicate.
**Impact:** Quadratic on the addon-deck merge.
**Effort:** S
**Fix sketch:** Use a `Set<number>` to claim positions.
**OSS-impression:** O(n²) is a one-glance hit.

### [02-architecture #28] [P2] `addon-handler-bridge.ts` doesn't await in-flight publishes on unload

**Evidence:** Lines 363-377; `globalService.onUnload?.(...)` is fire-and-forget.
**Impact:** In-flight publishes can land after unload; subscribers may have already unsubscribed.
**Effort:** S
**Fix sketch:** Drain in-flight publishes via a barrier or document the eventual-consistency contract.
**OSS-impression:** Fire-and-forget in lifecycle is suspect.

### [02-architecture #29] [P2] `browser-renderer.ts:201` drops Playwright types via cast

**Evidence:** `as PlaywrightLike` discards the actual Playwright API surface.
**Impact:** Type drift hides; tests pass against stubs only.
**Effort:** S
**Fix sketch:** Re-export the `playwright` types; remove the cast.
**OSS-impression:** `as` casts are a smell.

### [02-architecture #30] [P3] Gesture constants in ARCHITECTURE disagree with source

**Evidence:** ARCHITECTURE:175 says 500ms; ARCHITECTURE:418 says 200ms; source uses 200ms.
**Impact:** Reviewers confused.
**Effort:** S
**Fix sketch:** Pick one; update the other.
**OSS-impression:** Doc/source drift on a core constant.

### [02-architecture #31] [P3] `core/gesture-state.ts` is 341 LoC

**Evidence:** Single file owning the entire gesture state machine.
**Impact:** Hard to add new gestures cleanly.
**Effort:** M
**Fix sketch:** Extract `detectGesture(down, up, sequence)` from the FSM so gestures are configurable.
**OSS-impression:** Largest single-purpose file in core/.

### [02-architecture #32] [P3] Public API exports wrong file

**Evidence:** `packages/cli/src/index.ts` exports the frontend `Deck` (violates boundary) but omits actual shared UI exports like `BarsSurface`, `ValueChart`, `PaginatedSurface`, `TemporaryErrorSurface`.
**Impact:** An addon UI library is advertised but its surface is wrong.
**Effort:** M
**Fix sketch:** Replace `src/index.ts` with `export * from "@/ui"` only; document the supported subset.
**OSS-impression:** Public API mismatch with README.

### [02-architecture #33] [P3] `addon/loader.ts` warns on apiVersion mismatch but still loads

**Evidence:** Loader compares `json.apiVersion` to `currentApiVersion`; on mismatch logs a warning and continues.
**Impact:** Silent load of incompatible addon; crashes later.
**Effort:** S
**Fix sketch:** Hard-fail with a structured error; document migration path.
**OSS-impression:** Warning-as-error policy is a senior review concern.

### [02-architecture #34] [P4] `outputClient/real.ts` unsubscribeBrightness is a no-op

**Evidence:** Lines 131-138.
**Impact:** Dead code; signals partial refactor.
**Effort:** S
**Fix sketch:** Delete or implement.
**OSS-impression:** No-ops in lifecycle are easy flags.

### [02-architecture #35] [P4] `action/executor.ts:executeCommand` second helper unused

**Evidence:** Two helpers exported, only one referenced.
**Impact:** Confusing surface.
**Effort:** S
**Fix sketch:** Delete the unused one.
**OSS-impression:** Two names for one thing.

### [02-architecture #36] [P4] `device/linux-udev.ts:installUdevRules` unused

**Evidence:** Exported but never called.
**Impact:** Dead export.
**Effort:** S
**Fix sketch:** Delete or wire.
**OSS-impression:** Udev rules hinted at but never installed.
