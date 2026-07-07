---
phase: 06-hardware
status: ready
mode: standard
gathered: 2026-06-23
---

# Phase 06: Hardware - Context

**Gathered:** 2026-06-23
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

The real-device pipeline: enumerate Stream Deck devices, let the user pick one (persisting the choice to `device.json`), connect to it via `@elgato-stream-deck/node`, and run the headless-chromium → screenshot → sharp crop → fillKeyBuffer loop. The CLI `run`/`start` commands wire this together with graceful SIGTERM shutdown.

</domain>

<decisions>
## Implementation Decisions

### Write strategy

- **Delta only.** Hash each cropped per-key buffer (sha1 truncated to 16 hex chars). Skip the write if the hash matches the last cycle's hash for that key. Saves SPI bus bandwidth on the 32-key `+` model when nothing changes. Write count = 1 when static, write count = N when N keys change.

### Screenshot trigger

- **Hybrid: timer + event debounce.** Pure timer at `intervalMs` (default 500ms) keeps animations smooth. Plus subscribe to `runtime:activeDeck` and `runtime:invalidate` from the cli pub-sub bus (Phase 03); on event, schedule an immediate re-render with a 50ms debounce so a flurry of invalidates doesn't cause a screenshot storm. Idle CPU drops when nothing is changing.

### Device-selection UX

- **Prompt.** When `device.json` has a saved selection but it doesn't match any currently-connected device, prompt with all connected devices (the stale one shown first as a hint marker, but selectable). After the user picks, save the new `device.json`. If no `device.json` exists, prompt on first run. Same prompt if multiple devices are connected even with a valid saved selection.

### Carrying forward from earlier phases

- **sha1-truncated-to-16** buffer hash (Phase 06 Plan 02 default; confirmed above).
- **Atomic write** for `device.json` (write `.tmp`, rename).
- **`@inquirer/prompts` `select()`** with arrow-key UI (Phase 06 Plan 01).
- **Vite spawn**: Phase 04's `vite-server.ts` (READY port line, restart on crash) is the consumer; renderer connects via Playwright to the spawned URL.
- **Device model layouts**: Phase 05's `gridForKeyCount(keyCount)` for sharp crop layout.

### Agent's Discretion

- Exact Playwright browser launch args (Chromium flags for headless).
- CadenceTimer warning threshold for slow callbacks.
- Linux udev rule content wording (must include `idVendor=0x0fd9`).

</decisions>

<specifics>
## Specific Ideas

- User prefers smooth visual transitions (timer-cadence) but cares about idle CPU on a 32-key device (delta writes).
- User wants explicit prompts over auto-detection magic ("if you have to guess, prompt").
- Hash should be fast (sha1-truncated is fine; no need for blake3 or similar).
- Debounce of 50ms on event-triggered re-renders — chosen by user as a sweet spot between responsiveness and storm-prevention.

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PLAN.md` — section 6 (CLI), 15 (Hardware) — full requirements
- `.planning/PLAN.md` — section 16 (OS-specific) — for udev rule context
- `.planning/PROJECT.md` — requirements R13, R14
- Legacy: `/works/opensource/sireno-deck/packages/cli/src/device/` — algorithm reference (do not copy)
- Legacy: `/works/opensource/sireno-deck/packages/cli/src/render/browser-renderer.ts` — Playwright pipeline reference

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`@/core/pub-sub`** — Phase 03; renderer subscribes to `runtime:activeDeck` + `runtime:invalidate` channels from this.
- **`@/device/models`** — Phase 05; `gridForKeyCount(keyCount)` for crop layout.
- **`@/render/vite-server`** — Phase 04; consumer for the spawned vite URL.
- **`@/addon/registry`** — Phase 02; CLI uses for full validation.
- **`@/action/executor`** — Phase 03; not used here but pattern for exec/shell-out.

### Established Patterns

- Wrapper + interface pattern: device layer wraps `@elgato-stream-deck/node` behind our own `StreamDeckDevice` interface (no SDK leakage).
- vi.mock pattern for native modules: device + inquirer + playwright all mocked at module boundary.
- Atomic write pattern: `.tmp` + rename, already used for daemon PID.
- Config-pipeline pattern: load → validate → execute (extends to device selection).

### Integration Points

- CLI `run` command (`packages/cli/src/cli/commands/run.ts`) — currently a Phase 0 placeholder; will be replaced.
- CLI `start` command — same.
- `sireno-deck/vite` plugin's spawned vite URL flows into renderer.
- `@/deck/runtime` (Phase 03) emits `runtime:activeDeck` events via pub-sub that the renderer will subscribe to.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. User originally raised the question of `--device-model` flag in earlier phases; per the locked decisions, `keyCount` comes from the device itself (no flag needed). Out of scope.

</deferred>

---

_Phase: 06-hardware_
_Context gathered: 2026-06-23_
