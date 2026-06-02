---
phase: 34
slug: button-action-command-interface
areas_discussed:
  - Action timing semantics
  - Adoption boundary
  - Command execution behavior
  - Hook and schema surface
created: 2026-06-02
---

# Phase 34: Button action command interface - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-02
**Phase:** 34-button-action-command-interface
**Areas discussed:** Action timing semantics, Adoption boundary, Command execution behavior, Hook and schema surface

---

## Action timing semantics

### Tap vs double-tap when both are configured

| Option | Description | Selected |
|--------|-------------|----------|
| Double-tap wins | Delay single-tap execution briefly so a second tap can run `double-tap` instead of firing both commands. | ✓ |
| Tap fires immediately | Run `tap` right away even if a second tap later triggers `double-tap`. | |
| Disallow both together | Reject configs that define both `tap` and `double-tap`. | |

**User's choice:** `Double-tap wins (Recommended)`
**Notes:** User chose deterministic gesture ownership over immediate single-tap behavior.

### Hold threshold

| Option | Description | Selected |
|--------|-------------|----------|
| One shared threshold | Use one internal hold delay for all adopters of the shared command-action contract. | ✓ |
| Per-button override | Let each button tune hold timing. | |
| Global runtime setting | Add a project-wide timing setting for hold actions. | |

**User's choice:** `One shared threshold (Recommended)`
**Notes:** User kept timing standardized and out of the public config surface.

### Hold vs double-tap precedence

| Option | Description | Selected |
|--------|-------------|----------|
| Hold owns long-press | A long press becomes `hold`; `double-tap` only applies to quick tap sequences. | ✓ |
| Long press counts toward double-tap | A held first press can still contribute to a later `double-tap`. | |
| Forbid hold with double-tap | Reject configs that define both gestures. | |

**User's choice:** `Hold owns long-press (Recommended)`
**Notes:** User preferred non-overlapping gesture branches.

### Double-tap-only configs

| Option | Description | Selected |
|--------|-------------|----------|
| Do nothing on unmatched single tap | If only `double-tap` exists, a single tap that does not complete the gesture fires nothing. | ✓ |
| Fallback to double-tap anyway | Run the `double-tap` command after timeout even on one tap. | |
| Reject double-tap-only configs | Require `tap` whenever `double-tap` exists. | |

**User's choice:** `Do nothing (Recommended)`
**Notes:** User kept gestures literal and partial configs valid.

---

## Adoption boundary

### Initial built-in rollout

| Option | Description | Selected |
|--------|-------------|----------|
| Action + date-time only | Refactor only the explicitly requested adopters. | |
| Action + date-time + system-status | Expand the migration to the built-ins already duplicating command-action behavior. | |
| All command-capable built-ins except media-player | Move every built-in with generic command-action config onto the shared contract while preserving media-player as internal-only. | ✓ |

**User's choice:** `All command-capable built-ins except media-player`
**Notes:** User widened the rollout beyond the original minimum so the existing duplicated system-status action seams also get cleaned up now.

### Date-time button coverage

| Option | Description | Selected |
|--------|-------------|----------|
| Digital date/time buttons only | Limit the new config surface to `date-time` and `time`. | |
| All regular date-time buttons except locked tiles | Expose the optional contract on `date-time`, `time`, `analog-clock`, `clock`, and `calendar-sheet`, but keep locked-session tiles internal. | ✓ |
| Every date-time button including locked tiles | Extend the public contract into the implicit locked-session tile surface too. | |

**User's choice:** `All regular date-time buttons except locked tiles`
**Notes:** User widened the date-time rollout beyond the original explicit examples while keeping the implicit locked fallback out of scope.

### Media-player boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Keep media-player separate | Leave media-player on its existing internal gesture behavior and config surface. | ✓ |
| Expose shared schema but keep local behavior | Add the config shape without using the shared hook. | |
| Migrate hold only | Partially adopt the shared contract for hold and keep tap internal. | |

**User's choice:** `Yes, keep media-player separate (Recommended)`
**Notes:** User preserved the earlier Phase 30 boundary around truthful internal media-player behavior.

### Public API scope

| Option | Description | Selected |
|--------|-------------|----------|
| Public addon API | Publish the shared schema/interface and hook for bundled and external addon authors alike. | ✓ |
| Built-in only first | Use the shared contract only for bundled buttons in this phase. | |
| Internal utility only | Hide the shared contract from addon authors. | |

**User's choice:** `Public addon API (Recommended)`
**Notes:** User wants a real common addon contract, not another bundled-only convenience seam.

---

## Command execution behavior

### Awaiting configured commands

| Option | Description | Selected |
|--------|-------------|----------|
| Await commands | Gesture handlers wait for command execution to finish. | ✓ |
| Fire and forget | Return immediately after dispatching the command. | |
| Depends on gesture | Await some gestures but not others. | |

**User's choice:** `Await commands (Recommended)`
**Notes:** User chose one honest async contract instead of preserving the repo's current inconsistency.

### Invalidation behavior

| Option | Description | Selected |
|--------|-------------|----------|
| No automatic invalidate | Keep command execution separate from UI refresh decisions. | ✓ |
| Always invalidate after success | Automatically refresh after running any command. | |
| Invalidate before running | Trigger rerender pre-emptively before command completion. | |

**User's choice:** `No automatic invalidate (Recommended)`
**Notes:** User kept the hook narrowly about gestures-to-commands.

### Failure handling

| Option | Description | Selected |
|--------|-------------|----------|
| Rely on existing runtime behavior | Do not add a second failure surface in the shared hook. | ✓ |
| Track failure in button state | Add button-local command failure state/feedback. | |
| Expose failure callbacks | Let adopters customize failure behavior through hook options. | |

**User's choice:** `Rely on existing runtime behavior (Recommended)`
**Notes:** User kept the phase focused on unifying command wiring, not building richer command-result UX.

### Missing gesture config

| Option | Description | Selected |
|--------|-------------|----------|
| Silent no-op | Unconfigured gestures simply do nothing. | ✓ |
| Warn in logs | Missing configs emit diagnostics. | |
| Reject partial configs | Only full gesture sets are valid. | |

**User's choice:** `No-op silently (Recommended)`
**Notes:** User reaffirmed that partial implementations are first-class, not errors.

---

## Hook and schema surface

### Public config shape

| Option | Description | Selected |
|--------|-------------|----------|
| Nested `commands` object | Standardize on `commands.tap`, `commands.hold`, and `commands.double-tap`. | ✓ |
| Flat `*_command` fields | Keep names like `tap_command` and `hold_command`. | |
| Both shapes temporarily | Support old and new config shapes together during migration. | |

**User's choice:** `Nested \`commands\` object (Recommended)`
**Notes:** User wants a hard-cut homogeneous surface instead of another compatibility layer.

### Hook responsibility

| Option | Description | Selected |
|--------|-------------|----------|
| Gesture handlers only | Return the runtime gesture handlers needed by `defineMountedButton`. | ✓ |
| Handlers plus schema helper | Couple runtime handler generation and schema composition in one return shape. | |
| Full button factory | Let the helper own full button definition assembly. | |

**User's choice:** `Gesture handlers only (Recommended)`
**Notes:** User kept the hook narrow and reusable.

### Shared schema publishing

| Option | Description | Selected |
|--------|-------------|----------|
| Publish both schema + hook | Ship both the reusable config/schema fragment and the runtime hook. | ✓ |
| Hook only | Leave schema composition duplicated in adopters. | |
| Schema only | Leave runtime wiring duplicated in adopters. | |

**User's choice:** `Publish both schema + hook (Recommended)`
**Notes:** User explicitly wants schema homogenization, not just handler reuse.

### Partial support model

| Option | Description | Selected |
|--------|-------------|----------|
| Partial `commands` entries | A button opts in by providing only the gesture commands it supports. | ✓ |
| Explicit capability list | Add metadata such as `supported_actions`. | |
| Separate per-button variants | Use extra schema branches or types for each supported combination. | |

**User's choice:** `Partial commands entries (Recommended)`
**Notes:** User wants the schema itself to express optionality without extra capability metadata.

## Agent's Discretion

- Exact file layout for the shared exported schema/interface and hook.
- Exact internal timer/state plumbing for hold and double-tap behavior.
- Exact migration sequence across the built-in adopters.

## Deferred Ideas

- Extending the shared command-action contract into `media-player` later.
- Adding configurable hold or double-tap timing.
- Adding richer command-result state or UI beyond the current runtime error/reporting seam.

---

*Phase: 34-button-action-command-interface*
*Discussion log generated: 2026-06-02*
