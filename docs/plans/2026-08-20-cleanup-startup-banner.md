---
plan_contract: ce-plan/v1
product_contract_source: ce-plan-bootstrap
artifact_readiness: implementation-ready
created: 2026-08-20
---

# Startup banner cleanup + daemon vite crash

## Problem Frame

`p dev start --emulator` on this box now reaches TCP-bound-on-52937 but the daemon child dies before writing `runtime-state.json`. The user sees:

1. Banner prints ✓
2. Vite subprocess crashes (FATAL `[emulator] frontend vite exited after becoming ready`)
3. `ERROR background run failed`
4. `daemon: TCP bound on 52937 but runtime state did not appear in 5s`
5. `Failed to start SirenoDeck`

Plus two CLI-side nits the user explicitly asked to fix:

1. **Log lines include `[HH:MM:SS]` timestamps** + heavy indentation the operator doesn't want
2. **`[✗ media — chromium not installed]`** appears in the banner — that's `probeMediaAccess` (Chromium for frontend tests), not an addon. Misleading.

## Goal Capsule

1. Daemon reaches steady state (writes runtime-state.json) so `p dev start --emulator` succeeds.
2. CLI banner drops the timestamp and indentation in operator-facing logs (keeps structured JSON in `service.log`).
3. Banner replaces the misleading `media — chromium not installed` with the actual addon check section (`runBuiltinAddonChecks`).

## Scope

**In scope:**

- Fix daemon vite-subprocess crash so runtime-state.json gets written
- Remove `[HH:MM:SS]` timestamp + indentation from `formatHuman`
- Drop `probeMediaAccess` from the system feature line; rely on addon checks instead

**Out of scope:**

- Long-term fix for vite crash root cause (investigate separately)
- Changing `service.log` JSON schema (the file keeps full structured fields; only the operator-facing formatter changes)
- Restructuring the supervisor / spawn flow

## Key Decisions

### KTD-1: Vite subprocess crash is the root cause — investigate by running the daemon in foreground

**Decision:** Run the daemon in foreground with the same env vars to capture vite's actual error. Then either:

- (a) If vite fails on missing `sireno-deck-theme` (CSS @import), add the alias to the vite config
- (b) If vite fails on something else, surface the stderr in the parent's `printDaemonEvents`

**Rationale:** The user's crash is reproducible locally. Need the actual error before guessing a fix.

**Governs:** `packages/cli/frontend/vite.config.ts`, `packages/cli/emulator/vite.config.ts`

### KTD-2: Drop `probeMediaAccess` from banner; addon checks already cover media

**Decision:** Remove `media` from `FeatureItem[]`. The addon checks section (already exists from PR #26) shows `media: [✗ media-control]` for Linux/macOS/Windows tooling availability.

**Rationale:** The system feature line was inherited from PR #24 — `probeMediaAccess` checks if Chromium is installed for Playwright tests, which has nothing to do with whether the user's media addon can talk to `playerctl`. Two different concerns conflated under one label.

**Governs:** `packages/cli/src/cli/startup-display.ts:231-238`

### KTD-3: Strip timestamp + indent from `formatHuman`, keep JSON file intact

**Decision:** `formatHuman` no longer prepends `HH:MM:SS ` and no longer indents continuation lines. The structured JSON in `service.log` keeps `time` field — only the operator-facing formatter changes.

**Rationale:** User explicitly asked. Operators reading the terminal output don't need per-line timestamps (the log file has them for correlation). Indent was for narrow terminals but adds noise when stdout is captured to a pipe.

**Governs:** `packages/cli/src/util/logger.ts:formatHuman`

## Implementation Units

### IU-1: Investigate vite subprocess crash

**File:** `packages/cli/frontend/vite.config.ts` + `packages/cli/emulator/vite.config.ts`

Run `pnpm --filter sirenodeck run dev start --emulator` and tail `/run/user/1000/sireno-deck/service.log` to find the actual vite error.

Likely fix candidates (apply whichever the error points to):

- Add `sireno-deck-theme` alias to vite resolve.alias (the manual run earlier showed a Pre-transform error)
- Or add the package to vite's `optimizeDeps` to force pre-bundling

If the error is something else, capture it and decide inline.

### IU-2: Drop `probeMediaAccess` from banner

**File:** `packages/cli/src/cli/startup-display.ts`

Remove `probeMedia` from the `BannerDeps` interface, `defaultBannerDeps`, the `Promise.all` call, and the `FeatureItem[]` construction. The `BannerResult` shape stays the same (the unused `media` field is dropped).

### IU-3: Strip timestamp + indent from `formatHuman`

**File:** `packages/cli/src/util/logger.ts`

- Drop the `time` field and `indentContinuationLines` call from `formatHuman` output
- `level` + `component` + `msg` + `ctx` remain (but no leading indent prefix)

Existing tests that depend on the timestamp-prefixed format need to be updated to match.

### IU-4: e2e verification

Run `pnpm --filter sirenodeck run dev start --emulator` from a clean state (kill any daemon, clear `/run/user/1000/sireno-deck*`). Confirm:

- Daemon stays up
- Banner prints without `HH:MM:SS` and without indent
- Banner shows addon checks but no `media — chromium not installed`
- `runtime-state.json` appears within 5s
- CLI prints `✓ Sireno Deck started`
- Emulator URL opens in a browser (optional, but flagged in verification)

## Files to Create/Modify

**Modify:**

- `packages/cli/src/cli/startup-display.ts` — remove `probeMedia` from banner deps + Promise.all + FeatureItem
- `packages/cli/src/util/logger.ts` — strip timestamp + indent from `formatHuman`
- `packages/cli/src/util/__tests__/logger.test.ts` — update tests for new format
- `packages/cli/frontend/vite.config.ts` + `packages/cli/emulator/vite.config.ts` — fix vite crash (depending on root cause)
- `packages/cli/src/cli/__tests__/startup-display.test.ts` — update if banner tests depend on `media` field

**Create:**

- None

## Risks

- **Tests that grep for timestamps**: `restart.test.ts` mocks `snapshotDaemonLog` so it doesn't touch `formatHuman`. Most other tests use raw JSON or unmocked pino. The `printDaemonEvents` formatting in `startup-display.ts` does call `formatHuman` so its tests may need updates.
- **`probeMediaAccess` is also imported by other code** (e.g., `system-requirements`): keeping that import valid even though we drop it from the banner.
- **Vite fix may change behavior for real users** (not just this box). Apply the minimal change: only fix what's broken, don't refactor.
