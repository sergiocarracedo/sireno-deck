# Phase 2: Device + Rendering - Context

**Gathered:** 2026-05-12
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect to a Stream Deck device, survive disconnect and reconnect, and prove the first end-to-end React-to-image render path by drawing a static text visual to key `0` while blanking the remaining keys.

</domain>

<decisions>
## Implementation Decisions

### Device Selection
- If exactly one Stream Deck device is connected, auto-pick it with no extra user configuration.
- If the user wants to target a specific device, the selector should be the device serial number.
- If multiple devices are connected and no serial selector is configured, fail and list detected devices with model and serial instead of guessing.

### Reconnect Behavior
- On disconnect, the daemon stays alive and enters automatic reconnect mode.
- Reconnect attempts should continue for up to 5 minutes before giving up.
- Logging should report the disconnect immediately and then emit sparse retry progress rather than logging every retry.
- When reconnect succeeds, restore the last rendered state automatically.

### First Render Scope
- The first visible tracer bullet render should target the top-left key (`0`).
- The remaining keys should be initialized to a known blank state.
- The first rendered visual should be a simple text-based output such as `Hello` or `Hello World`.

### Render Pipeline Shape
- Build the real long-term architecture in this phase rather than a throwaway prototype, but keep the visible feature scope narrow.
- The initial renderer should target per-key image buffers directly.
- Content-change detection must be included from the start so redundant writes are skipped.

### Agent's Discretion
- Exact retry cadence and backoff schedule during the 5-minute reconnect window.
- Exact logger wording and cadence for sparse reconnect progress updates.
- Exact text styling, font sizing, and image composition details for the first static text visual.
- Exact internal module boundaries between device access, rendering, and reconciliation so long as the overall shape stays device -> per-key render -> deduped write.

</decisions>

<specifics>
## Specific Ideas

- The first successful hardware demo should feel obviously real: one visible text render on key `0`, with the rest of the device intentionally blank rather than left in an unknown prior state.
- Multi-device support is explicitly not the goal here; ambiguity should surface as a clear selection error, not an implicit choice.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- .planning/ROADMAP.md
- .planning/REQUIREMENTS.md
- .planning/phases/01-foundation/01-CONTEXT.md
- .planning/phases/01-foundation/01-01-SUMMARY.md
- .planning/phases/01-foundation/01-02-SUMMARY.md

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/cli/index.ts`: Existing CLI command wiring and logger creation can host the Phase 2 device startup path.
- `packages/cli/src/cli/commands/start.ts`: Existing foreground daemon lifecycle, config loading, and signal handling provide the process shell for device connect/render startup.
- `packages/cli/src/util/daemon.ts`: PID lifecycle and signal cleanup already exist and should become the hook point for device disconnect/cleanup integration.
- `packages/cli/src/config/loader.ts`: Existing strict config loading is the integration point for device selection preferences.
- `packages/cli/src/core/schemas.ts`: Existing config schema is where device selector fields and future render-related config shape should be extended.

### Established Patterns
- The CLI is foreground-first and uses `yargs.parseAsync()` for command handlers that return promises.
- Errors are expected to preserve useful metadata through the whole pipeline rather than being reformatted late.
- Tests are colocated and use temp XDG directories to keep filesystem-dependent behavior deterministic.

### Integration Points
- `startDaemon()` is the place where device discovery, initial connection, and renderer bootstrapping should attach.
- Signal cleanup in `packages/cli/src/util/daemon.ts` is where device disconnect and final blanking logic should be plugged in.
- Device selection needs to flow from config schema -> config loader -> startup command -> hardware connection layer.
- The first React render path needs to end in a deduped per-key write layer that the reconnect logic can reuse to restore last rendered state.

</code_context>

<deferred>
## Deferred Ideas

- Interactive runtime device selection prompt when multiple devices are connected.
- Full multi-device support.
- Theme-aware or branded first-render visuals.

</deferred>

---
*Phase: 02-device-rendering*
*Context gathered: 2026-05-12*
