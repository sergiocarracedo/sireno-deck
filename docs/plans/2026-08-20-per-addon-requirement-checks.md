---
plan_contract: ce-plan/v1
product_contract_source: ce-plan-bootstrap
artifact_readiness: implementation-ready
created: 2026-08-20
---

# Per-Addon Requirement Checks

## Problem Frame

Addons declare OS-specific runtime dependencies (e.g., `playerctl` for media on Linux) but there is no structured way to verify these before the addon runs. The `sirenodeck system-requirements` command probes core system capabilities (`keyMacro`, `clipboard`, `notification`), but addon-specific tooling (media players, clipboard tools used only by one addon) is invisible at startup.

Operators see failures at runtime (media buttons silently failing, log errors) instead of a clear preflight summary. Each addon should be able to declare what it needs, and the CLI should display pass/fail per-addon at startup.

## Goal Capsule

Let each builtin addon declare requirement checks (OS-specific tool availability). Core runs these checks for enabled addons on start and restart, displaying results with green checkmarks for pass and orange for X, alongside the existing system capability probes.

## Scope

**In scope:**

- `AddonManifestV1` gets optional `checks` field
- `AddonCheck` / `AddonCheckResult` types in `addon/api.ts`
- Core runs checks for enabled addons on start/restart (not on `run` in non-daemon mode, where startup-display already shows system capabilities)
- Display results in startup banner (green ✓ / orange ✗)
- Media addon: OS-specific checks via `createMediaProvider` + probe (playerctl on Linux, afplay on macOS, etc.)
- `sirenodeck system-requirements` includes addon checks in its output

**Out of scope:**

- External/npm addon checks (only builtins for now)
- Checks blocking startup (warn only, never prevent daemon from starting)
- UI rendering of addon checks (frontend is out of scope)

## Key Decisions

### KTD-1: `checks` lives on `AddonManifestV1`, not on `AddonGlobalService`

**Decision:** Add optional `checks` array directly on `AddonManifestV1`.

**Rationale:** Checks are metadata about the addon's runtime needs, not lifecycle behavior. `AddonGlobalService` is for runtime behavior (onLoad/onUnload, pollers, methods). Manifest-level placement means checks are available before the addon is loaded, which is when preflight probes should run.

**Governs:** `packages/cli/src/addon/api.ts` (AddonManifestV1)

### KTD-2: Checks return results, not throw

**Decision:** Each `check()` returns `AddonCheckResult` with `available: boolean` and optional `reason`. No exceptions.

**Rationale:** Checks probe external commands; failures are expected (tool not installed). Throwing would require per-check try/catch at the call site. Returning a result keeps the caller simple and the display logic uniform.

**Governs:** `AddonCheckResult` type

### KTD-3: OS-specific logic lives in the addon, not in core

**Decision:** The media addon's `check()` instantiates its own provider via `createMediaProvider(process.platform, executor)` and probes the underlying commands. Core has no media-specific knowledge.

**Rationale:** Each addon knows its own OS-specific dependencies. Core just collects and displays results. This keeps the addon API generic and avoids core becoming a registry of every addon's tooling.

**Governs:** `packages/cli/src/builtin-addons/media/index.ts`

### KTD-4: Checks run on start (daemon), not on run (foreground)

**Decision:** Addon checks run in the `start` handler after `preflight()`, and after `waitForFullStart` returns. They do NOT run in `run` (foreground) mode, where the startup banner already shows system capabilities.

**Rationale:** `run` mode is ephemeral; the banner already shows media/exec/http status. `start` mode is the operator's long-lived interface where per-addon health matters. Keeps the check path simple.

**Governs:** `packages/cli/src/cli/commands/start.ts`

### KTD-5: Display format reuses existing `formatFeaturesLine` pattern

**Decision:** Use the same `[✓ name]` / `[✗ name — reason]` format from `startup-display.ts:176-183`. Addon checks append as a second line labeled `Addons:` below the existing `Features:` line.

**Rationale:** Consistent visual language. Operators already know `[✓ ...]` / `[✗ ...]`. No new display primitive needed.

**Governs:** `packages/cli/src/cli/startup-display.ts`

## Implementation Units

### IU-1: Addon check types

**File:** `packages/cli/src/addon/api.ts`

Add to existing types:

```typescript
export interface AddonCheckResult {
  readonly available: boolean
  readonly reason?: string
}

export interface AddonCheck {
  readonly name: string
  readonly check: () => Promise<AddonCheckResult>
}
```

Extend `AddonManifestV1`:

```typescript
export interface AddonManifestV1 {
  // ... existing fields
  readonly checks?: ReadonlyArray<AddonCheck>
}
```

**Test file:** `packages/cli/src/addon/__tests__/api.test.ts` (new — type-only, verify shape)

### IU-2: Check runner

**File:** `packages/cli/src/cli/startup-display.ts` (or a new `packages/cli/src/addon/check-runner.ts` if startup-display grows too large)

```typescript
export interface AddonCheckOutcome {
  readonly addonName: string
  readonly checkName: string
  readonly available: boolean
  readonly reason?: string
}

export const runAddonChecks = async (
  addons: ReadonlyArray<{ name: string; checks?: ReadonlyArray<AddonCheck> }>,
): Promise<ReadonlyArray<AddonCheckOutcome>> => { ... }
```

Runs all checks across all enabled addons in parallel. Returns flat array of outcomes.

**Test file:** `packages/cli/src/addon/__tests__/check-runner.test.ts` (new)

### IU-3: Display addon check results

**File:** `packages/cli/src/cli/startup-display.ts`

Add `printAddonCheckResults(outcomes, output)` using same `[✓ name]` / `[✗ name — reason]` pattern. Called from `start` handler after `printDaemonUrl`.

**Test file:** `packages/cli/src/cli/__tests__/startup-display.test.ts` (extend existing)

### IU-4: Wire into start handler

**File:** `packages/cli/src/cli/commands/start.ts`

After `waitForFullStart` returns and `printDaemonUrl(state)`:

1. Collect enabled addons with `checks` from the loaded addon registry
2. Call `runAddonChecks(addons)`
3. Call `printAddonCheckResults(outcomes)`

No blocking. Log check failures as warnings, never throw.

**Test file:** `packages/cli/src/cli/commands/__tests__/start.test.ts` (extend existing)

### IU-5: Media addon checks

**File:** `packages/cli/src/builtin-addons/media/index.ts`

Add `checks` to the manifest:

```typescript
export const manifest: AddonManifestV1 = {
  // ... existing fields
  checks: [
    {
      name: "playerctl",
      check: async () => {
        const provider = createMediaProvider(process.platform, executor)
        // probe: try getStatus() or command -v playerctl
        // return { available: true/false, reason: "..." }
      },
    },
  ],
}
```

The check instantiates the OS-specific provider (via `createMediaProvider`) and probes whether the underlying command exists. Returns `{ available: false, reason: "install playerctl" }` when missing.

**Test file:** `packages/cli/src/builtin-addons/media/__tests__/checks.test.ts` (new)

### IU-6: Include addon checks in `system-requirements` output

**File:** `packages/cli/src/cli/commands/system-requirements.ts`

After the existing capability summary, run addon checks and append results. Same format, grouped under `Addon checks:` heading.

**Test file:** `packages/cli/src/cli/commands/__tests__/system-requirements.test.ts` (extend existing)

## Test Scenarios

### IU-1 (types)

- Type compiles with `checks` present
- Type compiles without `checks` (optional field)
- `AddonCheckResult` shape: `{ available: boolean; reason?: string }`

### IU-2 (check runner)

- Returns empty array when no addons have checks
- Runs checks in parallel across addons
- Returns `{ available: true }` when check passes
- Returns `{ available: false, reason: "..." }` when check fails
- Handles check throwing (returns `{ available: false, reason: "check error" }`)
- Multiple checks per addon: each produces its own outcome

### IU-3 (display)

- Formats `[✓ playerctl]` for passing check
- Formats `[✗ playerctl — install playerctl]` for failing check
- No output when all checks pass (or all pass — operator choice, but "no news is good news" is cleaner)
- Output is a single line: `Addons: [✓ playerctl] [✓ wf-recorder]`

### IU-4 (start handler wiring)

- Checks run after `waitForFullStart` returns
- Check failures do not prevent daemon from starting
- Check results appear in startup output

### IU-5 (media addon checks)

- Linux: probes `playerctl` (and `wpctl` for PipeWire)
- macOS: probes `afplay` (or equivalent)
- Windows: probes PowerShell media cmdlets
- Returns `{ available: false, reason: "..." }` with install instructions when missing

### IU-6 (system-requirements)

- Addon checks appear in `sirenodeck system-requirements` output
- Grouped under `Addon checks:` heading
- Same ✓/✗ format as other checks

## Files to Create/Modify

**Modify:**

- `packages/cli/src/addon/api.ts` — add types, extend `AddonManifestV1`
- `packages/cli/src/cli/startup-display.ts` — add `printAddonCheckResults`
- `packages/cli/src/cli/commands/start.ts` — wire checks into start handler
- `packages/cli/src/builtin-addons/media/index.ts` — add `checks` to manifest
- `packages/cli/src/cli/commands/system-requirements.ts` — include addon checks

**Create:**

- `packages/cli/src/addon/check-runner.ts` — check runner logic
- `packages/cli/src/addon/__tests__/check-runner.test.ts` — tests
- `packages/cli/src/builtin-addons/media/__tests__/checks.test.ts` — media addon check tests

## Risks

- **Media provider instantiation in check**: `createMediaProvider` may have side effects (spawning processes). The check should only probe command availability, not full provider init. If `createMediaProvider` does more than command probing, the check should use `command -v` directly instead.
- **Addon checks on external addons**: Out of scope. The `checks` field is on `AddonManifestV1` which external addons can also use, but core only runs checks for builtin addons on start. Future work can extend to external addons.
