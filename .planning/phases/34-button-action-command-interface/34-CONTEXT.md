# Phase 34: Button action command interface - Context

**Gathered:** 2026-06-02
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Add one shared optional command-action contract for addon buttons so bundled and external buttons can declaratively map `tap`, `hold`, and `double-tap` gestures to system commands through one common schema fragment/interface and one reusable hook. Use that shared surface to refactor all command-capable built-in buttons except `media-player`, and expose the new optional command-action config across the regular `date-time` buttons while keeping locked-session tiles and `media-player` on their existing internal behavior seams.

</domain>

<decisions>
## Implementation Decisions

### Gesture Semantics
- The shared command-action contract supports `tap`, `hold`, and `double-tap` gestures.
- If both `tap` and `double-tap` are configured, `double-tap` suppresses `tap`; the implementation should wait through one shared double-tap window before firing the single-tap command.
- Hold uses one shared internal threshold for all adopters in this phase.
- Hold owns long-press behavior; `double-tap` applies only to quick tap/release sequences.
- Partial gesture support is valid. If a gesture has no configured command, the shared behavior is a silent no-op.
- `double-tap`-only configurations are valid; a single unmatched tap does nothing.

### Public Contract Surface
- Standardize the public config shape on a nested `commands` object, using `commands.tap`, `commands.hold`, and `commands.double-tap`.
- Publish both a reusable schema fragment/interface and a reusable runtime hook as part of the public addon authoring API.
- The hook should stay narrow: `useButtonActionCommand(...)` returns gesture handlers only and should not become a full button-definition factory.
- Buttons declare partial support by providing only the subset of `commands` entries they want.

### Adoption Boundary
- This is a public addon API, not a built-in-only helper.
- Migrate all command-capable built-in buttons except `media-player` onto the shared command-action contract in this phase.
- Within the built-in `date-time` addon, expose the shared optional command-action config on all regular buttons except the locked-session tiles.
- `media-player` stays on its existing internal gesture semantics and does not expose the new shared command-action config in this phase.

### Command Execution Behavior
- Shared command-action handlers should await command execution instead of fire-and-forget behavior.
- The shared hook should not automatically call `methods.invalidate()` before or after command execution.
- The shared hook should rely on the existing runtime command execution and button-error reporting seams instead of introducing a new failure UX.

### Agent's Discretion
- Exact internal storage/timer strategy for the shared hold and double-tap timing state, as long as the locked gesture semantics stay truthful.
- Exact module/file placement for the shared schema fragment/interface and hook within the public addon API surface.
- Exact migration sequencing across the built-in adopters, as long as the final public contract and rollout boundary match the decisions above.

</decisions>

<specifics>
## Specific Ideas

- The old scattered config fields such as `command`, `tap_command`, and `hold_command` should converge on one shared nested `commands` shape instead of preserving multiple public naming conventions.
- The shared hook target is a one-line authoring seam similar to `useButtonActionCommand({ tap: '...', hold: '...' })` that hides the timer/gesture plumbing but not rendering.
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` is the simplest current adopter and should stop hand-rolling its command tap behavior.
- The `date-time` addon should gain optional action-command support for the regular visible button types, not just `date-time` and `time`; locked-session tiles remain out of scope.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/STATE.md`
- `.planning/phases/30-content-helpers-system-status-and-media/30-CONTEXT.md`
- `.planning/phases/32-addon-owned-data-polling-contract/32-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/action/executor.ts`
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx`
- `packages/cli/src/builtin-addons/system-status/schemas.ts`
- `packages/cli/src/builtin-addons/system-status/buttons/bars.tsx`
- `packages/cli/src/builtin-addons/system-status/buttons/label-values.tsx`
- `packages/cli/src/builtin-addons/date-time/index.ts`
- `packages/cli/src/builtin-addons/date-time/schemas.ts`
- `packages/cli/src/builtin-addons/date-time/buttons/date-time.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/analog-clock.tsx`
- `packages/cli/src/builtin-addons/date-time/buttons/calendar-sheet.tsx`
- `packages/cli/src/builtin-addons/media-player/button.tsx`
- `packages/cli/src/builtin-addons/media-player/schemas.ts`

No external specs - requirements are fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts` already defines the public mounted-button runtime contract and is the natural export seam for a shared command-action schema/interface and hook.
- `packages/cli/src/action/executor.ts` already owns command execution plus host-context placeholder resolution, so the new shared hook should keep using `methods.runCommand(...)` instead of inventing a second command path.
- `packages/cli/src/deck/runtime.ts` already provides `onPress`, `onRelease`, and `onTap` handler entry points plus button-local store access, which is enough to implement hold and double-tap behavior without widening core runtime scope.

### Established Patterns
- Phase 30 already introduced button-local optional tap/hold command behavior in `system-status` and bounded `media-player` around truthful internal gesture semantics with optional hold only.
- Phase 32 locked core runtime as capability-agnostic while addon-owned buttons own capability semantics, schemas, polling, and render behavior.
- Current command-action behavior is fragmented: `action` uses a single `command`, `system-status` uses `tap_command` and `hold_command`, and `media-player` keeps `hold_command` local while hard-owning tap behavior.

### Integration Points
- Add the shared public contract and hook to `packages/cli/src/addon/api.ts` or closely related public addon API modules.
- Refactor `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` onto the shared contract.
- Refactor the `system-status` button schemas and duplicated hold/tap timer handlers onto the shared contract.
- Add optional shared command-action support to the regular `date-time` button schemas and definitions without widening the locked-session tile seam.
- Leave `packages/cli/src/builtin-addons/media-player/button.tsx` and `packages/cli/src/builtin-addons/media-player/schemas.ts` on their current internal behavior path for this phase.

</code_context>

<deferred>
## Deferred Ideas

- Extending the shared contract into `media-player` while preserving its fixed tap play/pause semantics.
- Adding per-button or global hold/double-tap timing configuration.
- Adding custom failure callbacks or button-local command result UI beyond the existing runtime error/reporting path.

</deferred>

---
*Phase: 34-button-action-command-interface*
*Context gathered: 2026-06-02*
