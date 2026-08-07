# 02 — Code Smells

---

## [CS1] [P2] `run.ts` is 1849 lines — monolithic pipeline

**Evidence:** `packages/cli/src/cli/commands/run.ts` — 1849 lines.

Contains: `runRealModePipeline`, `runEmulatorLifecycle`, `preflight` logic, hot-reload watcher, config watching, system provider startup, addon registration, process signal handling, and WS bridge integration — all in one file.

**Impact:** Hard to navigate, hard to test in isolation, high risk of merge conflicts. New contributors must read 1849 lines to understand how the daemon starts.

**Effort:** Medium — split into co-located modules (not new packages).

**Fix sketch:**
- `pipeline/preflight.ts` — config loading, validation, directory creation
- `pipeline/providers.ts` — system provider startup
- `pipeline/addons.ts` — addon registration and lifecycle
- `pipeline/runtime.ts` — runtime construction and WS bridge wiring
- `pipeline/watch.ts` — hot-reload and config watching
- `run.ts` — orchestrates the above (~100 lines)

---

## [CS2] [P2] Frontend Deck.tsx implements manual gesture detection

**Evidence:** `packages/cli/frontend/src/components/Deck.tsx:142-218`

`DeckButtonCell` implements:
- **Double-tap:** `lastClickAtRef` + 300ms threshold
- **Hold:** `holdTimerRef` + 500ms threshold, `isHoldingRef` flag
- **Feedback:** CSS class toggling for button press/release states

```ts
const lastClickAtRef = useRef(0);
const holdTimerRef = useRef<ReturnType<typeof setTimeout>>();
const isHoldingRef = useRef(false);
```

This logic already lives in `packages/cli/src/runtime/core/gesture-state-machine.ts` and `packages/cli/src/runtime/core/deck-methods/button.ts`. The frontend is duplicating it.

Under the architecture the runtime owns gesture detection; the frontend SPA subscribes to `runtime:gesture:*` channels and renders state.

**Impact:** Gesture logic is duplicated in two places with subtle timing differences. If the hold threshold changes in the runtime, the SPA desynchronizes visually.

**Effort:** Medium — depends on whether this is intentional for emulator mode. See architecture report [A2].

**Fix sketch:**
- If the SPA should never emit button events (as ARCHITECTURE.md claims): remove `useButtonAction` and gesture detection from `DeckButtonCell`, route everything through the bridge gesturer.
- If emulator mode needs local gesture detection: update ARCHITECTURE.md to document the exception, and add a code comment marking the duplication.

---

## [CS3] [P1] 21 protocol schemas lack `.strict()`

See security report [S3] for full details.

**Code-smell angle:** This is a convention violation — the project rule says "Zod schemas with `.strict() for config/protocol`." 21 schemas violate it. When writing a new schema, a developer looks at existing schemas for the pattern; they copy the `.extend()` pattern without `.strict()` and the violation propagates. This is the "broken windows" effect in API types.

---

## [CS4] [P3] `sendToCaller` name is misleading

**Evidence:** `packages/cli/src/ws-bridge.ts:249-254`

The function is named `sendToCaller` and accepts a `caller` parameter — but iterates all `wss.clients`. The name implies "reply to the requesting client" but the implementation broadcasts.

**Impact:** A developer reading the call site thinks results go only to the caller. The implementation says otherwise. This mismatch already caused the privacy bug in [S2]. Even after fixing the body, the name confusion lingers — `sendToCaller` is still used in contexts where broadcast behavior is expected by some callers.

**Effort:** Low — rename `sendToCaller` → `sendToClient` to match actual semantics after the fix.

---

## [CS5] [P3] `runtime.test.ts` is 1664 lines

**Evidence:** `packages/cli/src/runtime/__tests__/runtime.test.ts` — 1664 lines.

**Impact:** Slow to navigate, tests lack clear grouping, failures hard to diagnose. Contributes to the 24 failing test suites.

**Effort:** Medium — split by subsystem: `gesture-state-machine.test.ts`, `deck-methods.test.ts`, `deck.test.ts`, `addon-bridge.test.ts`.

---

## [CS6] [P3] Missing `coreMethods` in test fixtures causes cascading type errors

**Evidence:** Multiple test files construct partial runtime/deck objects without `coreMethods`.

Many of the 357 typecheck errors are `Property 'coreMethods' is missing in type ...` — test fixtures omit fields that the strict type requires.

**Impact:** Tests compile but with incorrect type assertions (`as any` workarounds). Real bugs in the type shape are hidden by blanket casts.

**Effort:** Low — extract a `createTestDeck()` / `createTestRuntime()` factory in a test helper that fills all required fields. Use shoehorn for partial data.

---

## [CS7] [P4] Two formatter configs (unchanged from beta review)

**Evidence:** Beta review flagged two formatter configs with conflicting rules. Status unconfirmed in this review (format gate passes, but config drift may still exist).

**Impact:** If two formatters disagree, CI may pass one and fail the other depending on execution order.

---

## [CS8] [P4] Default exports in builtin addon index files

**Evidence:** `AGENTS.md` says "No default exports for new logic — named exports only. Existing default exports in `packages/cli/src/builtin-addons/*/index.ts` predate this rule."

**Impact:** Mixed conventions confuse contributors. Marginal.

**Effort:** Low — convert remaining default exports to named exports in a mechanical PR.
