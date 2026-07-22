# Phase 12: Deck Reliability, Emulator UX, Logging, and Background Service - Context

**Gathered:** 2026-07-22
**Mode:** deep
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 12 makes the current deck runtime reliable and observable across real hardware and the emulator. It migrates system-status rendering from the legacy generic addon model, assigns array-deck button positions deterministically for the active device key count, preserves invalid-button slots with persistent error surfaces, improves emulator addon/config visibility and operational log density, and runs the backend as a native persistent user service controlled by the CLI.

The phase does not add unrelated product capabilities. Service installation and lifecycle behavior must cover the host operating systems supported by the project, while implementation details are established through research and planning.

</domain>

<decisions>
## Implementation Decisions

### System-status addon
- Port the legacy system-status generic button with feature parity, adapting it to the current addon API.
- The generic button supports the legacy metric catalog, up to three metrics, text and bars variants, formatter/presentation overrides, polling/render intervals, and command actions.
- Remove the current CPU-, RAM-, disk-, and network-specific button types and migrate in-repository references to the generic type.
- This is a hard cutover: stale configurations using removed types become invalid-button error surfaces rather than compatibility aliases.
- Metrics unavailable on the current platform use the legacy unavailable rendering and do not block the addon.
- Canonical legacy references: `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/schemas.ts`, `buttons/builtinSystemStatusButton.tsx`, `domain/live-metrics.ts`, `domain/display-metrics.ts`, and `index.ts`.

### Deck-array position assignment
- Button `position` is optional in the user-facing deck/button configuration.
- Recompute assignments from the original config whenever the device `keyCount` changes; do not preserve a prior assignment across device changes.
- Explicit positions are reserved first and remain authoritative when in range.
- Later duplicate explicit positions are treated as unpositioned and reflow into the next available gaps in config-file order.
- Unpositioned buttons fill empty positions in config-file order.
- Buttons at or beyond the available range (`keyCount - 1`) are dropped and never sent to the frontend.
- Deck output is sparse: unoccupied positions remain empty rather than being filled with generated surfaces.
- Reuse and extend `packages/cli/src/deck/position-buttons.ts`; its current O(n²) scan is acceptable for deck sizes.

### Error surfaces
- Invalid button configurations do not invalidate the whole deck.
- An invalid button with an explicit position keeps that position; an invalid unpositioned button receives a normal assigned slot according to config order.
- The invalid slot renders the red `core:temporary-error` surface with validation details and remains visible until the config is corrected/reloaded; the error is not transient.
- If a navigation action targets a deck that does not exist, show the error surface at the initiating button's position, keep navigation state unchanged, and retain the error until the next successful config/deck update.
- Reuse existing button validation and temporary-error plumbing rather than introducing a second error protocol.

### Emulator presentation
- The emulator Addons page uses one wrapped flow of colored UI tags rather than a list/table.
- The legend appears above the flow and explains colors for addon source/name, regular decks, overlay decks, and buttons.
- Render the addon source next to the addon name.
- The Config page shows the resolved absolute config-file path.
- Use the existing emulator frontend and tag primitives where available; do not create a parallel metadata model unless existing bridge data is insufficient.

### Logging
- Operational logs remain structured and retain stable context fields, but human-readable output should be compact and one line.
- Context such as `deckId`, `position`, and `gesture` should be rendered inline with the message rather than emitted as redundant multiline dumps.
- Remove noisy follow-up diagnostics such as complete button lists from normal/info logs; retain detailed dumps only behind an appropriate debug-level path.

### Background service
- Convert backend execution into a persistent native per-OS user service, with the CLI acting as the control surface for start, stop, restart, reload, update-config, and related lifecycle commands.
- `start --config <path>` resolves and persists the config path in service state. Later service commands use the stored path unless explicitly replaced.
- Background service output goes to native system logging: journald on Linux, launchd/unified logging on macOS, and the platform-equivalent service log on Windows. Foreground CLI mode continues to log to the terminal.
- Persist the service/backend PID and managed child PIDs. On stop, restart, or crash, terminate tracked children, use process-tree/group termination where supported, prune stale PID entries, and clean up state files.
- Existing `packages/cli/src/util/daemon.ts` is a reusable starting point for PID, token, child tracking, and stale-process handling; planning should determine what must be extended versus replaced.

### Agent's Discretion
- Exact legacy-to-current addon API adapters and file layout.
- Exact metric catalog implementation details and platform probes, provided legacy feature parity and unavailable rendering are preserved.
- Exact tag colors, typography, spacing, and component names, provided the requested legend and single wrapped flow are clear.
- Exact native service-manager templates, installation mechanism, IPC/control protocol, and process-tree implementation after platform research.
- Exact compact-log formatter wiring, provided structured fields remain queryable and normal logs stay one line.

</decisions>

<specifics>
## Specific Ideas

- The system-status buttons currently render empty; use the legacy addon at `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/` as the implementation base.
- Remove the dedicated CPU, disk, network, RAM, and similar buttons because all are achievable through the generic button.
- The user explicitly wants overflow buttons omitted and position calculation to respond to device key-count changes.
- Example desired log shape: `20:33:48 INFO emulator: button-action received (deckId: main, position: 11, gesture: tap)`.
- The backend should start automatically with the operating system once installed/enabled as a service.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/schemas.ts`
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/buttons/builtinSystemStatusButton.tsx`
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/domain/live-metrics.ts`
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/system-status/domain/display-metrics.ts`
- `packages/cli/src/builtin-addons/system-status/`
- `packages/cli/src/deck/position-buttons.ts`
- `packages/cli/src/config/validation.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/deck-config.ts`
- `packages/cli/src/util/daemon.ts`
- `packages/cli/src/outputClient/emulator.ts`
- `packages/cli/emulator/src/SidePanel.tsx`
- `packages/cli/src/util/logger.ts` or the repository's active logger setup

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `positionButtons` already implements explicit-position reservation, duplicate reflow, gap filling, overflow dropping, and accepts `keyCount`.
- `validateButton` and `validatePerDeck` already produce button-scoped validation issues.
- Existing `core:temporary-error` transport/frontend plumbing already supports red error rendering.
- `daemon.ts` already persists daemon PID, tokens, child PIDs, stale-process cleanup, and basic start/stop/status operations.
- `outputClient/emulator.ts` already rebuilds runtime decks when the virtual device model/key count changes.

### Established Patterns
- Configuration uses strict Zod schemas and named exports for new logic.
- Decks are materialized in the backend and sent to the frontend through deck-config messages; backend remains authoritative for active deck state.
- Existing logs use pino structured fields; the main cleanup should reduce noisy records rather than discard useful context.
- The project uses Vitest and has pre-existing test failures documented in state/summaries; new tests should isolate Phase 12 behavior.

### Integration Points
- System-status migration connects addon registry/manifest, button schemas, backend metric publication, and frontend surfaces.
- Position assignment connects raw config parsing, deck materialization, runtime key-count rebuilds, pagination/system-button injection, and deck-config serialization.
- Error handling connects full validation, deck construction, navigation runtime, protocol messages, and frontend `Deck` rendering.
- Emulator improvements connect backend metadata/protocol messages with `packages/cli/emulator/src/SidePanel.tsx`.
- Service lifecycle connects CLI commands, runtime startup/shutdown, daemon state, child process spawning, config watch/reload, and OS service managers.

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within the Phase 12 boundary.

</deferred>

---
*Phase: 12-deck-reliability-and-service*
*Context gathered: 2026-07-22*
