# Phase 14: Richer Built-in Toggles - Context

**Gathered:** 2026-05-18
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Phase 14 delivers built-in toggle buttons that cover both runtime-owned internal state and command-driven external authority models.

Scope is limited to `SCS-06` and `SCS-07`:
- internal-state toggles that preserve runtime-owned state across normal deck/runtime lifecycle events
- command-driven toggles that support both `get_state + set_on/set_off` and `toggle + status` authority models
- coherent toggle rendering/behavior across refreshes and lifecycle transitions

Out of scope for this phase:
- durable persistence for internal toggle state across fresh daemon process starts
- broader command parsing systems such as regex-based state extraction
- unrelated new widget capabilities beyond the built-in toggle contract

## Implementation Decisions

### Toggle Contract Shape
- Ship one built-in `toggle` button type, not separate built-in button types per authority model.
- The config uses an explicit `mode` discriminator with these values:
  - `internal`
  - `get-set`
  - `toggle-status`
- The config surface uses shared base presentation fields with optional per-state overrides rather than two fully duplicated state objects.

### Command Authority Models
- For command-driven toggles, external command results are the final source of truth.
- After a tap, the runtime may show temporary pending behavior, but the next authoritative read decides the real `on`/`off` state.
- `toggle-status` mode must require a `status_command`; it must not infer the post-toggle state from the previous runtime value.
- Command output parsing should support explicit token mapping through `on_values` and `off_values` lists.
- Planner/research should still preserve sane canonical defaults underneath when mapping is omitted, as long as the explicit token-list contract remains first-class and documented.

### State Continuity And Lifecycle
- Internal toggle state is runtime-owned and must survive normal deck activation, refresh, and reconnect behavior within the same running daemon.
- Internal toggle state does not need durable persistence across a fresh process restart in this phase; a new process can use the configured initial state.
- Command-driven toggles should render a pending or unavailable state until the first authoritative read completes; they must not guess an initial `on`/`off` value.
- If a command-driven write fails, preserve the last authoritative state but surface an error or unavailable treatment until a later successful read clears it.

### Toggle Visuals And Labels
- Toggle modes should be visually distinguishable.
- Phase 14 should keep one shared toggle base layout while varying mode-specific accents, badges, subtitles, or small chrome treatment.
- Phase 14 should not create three totally bespoke toggle widgets.
- The existing toggle render family should remain the base reuse point unless research finds a stronger low-risk seam.

### Prior Constraints To Preserve
- Shared/default render contracts from earlier phases remain authoritative where applicable:
  - explicit `background` precedence stays `button -> deck -> theme`
  - explicit render contracts like `fit` must not be silently overridden by toggle defaults
- Runtime reset behavior must follow ownership. Runtime-owned internal state should not be cleared merely because a deck re-activates or the device reconnects.
- Session/host context remains available for command resolution and render behavior through the existing canonical host/session contract.

### Agent's Discretion
- Exact YAML field names for shared base presentation vs. per-state overrides, as long as they clearly encode the chosen single-type discriminated contract.
- Exact pending/error copy and subtitle wording, as long as command-driven unknown state remains visibly honest.
- Whether canonical boolean parsing is additive to custom `on_values` / `off_values` or only the fallback when lists are omitted.
- Whether mode-specific visual accents are implemented through the current render `variant: "toggle"` seam or a tightly related shared renderer seam.

## Specific Ideas

- The built-in toggle should feel like one control family, even though the three modes differ in authority and lifecycle semantics.
- Command-driven toggles should never fake certainty when startup state, failed writes, or out-of-band external changes make the real state unknown.
- Visual distinction between modes should come from restrained mode accents rather than from fully bespoke renderers.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/phases/11-session-config-contracts/11-CONTEXT.md`
- `.planning/phases/12-backgrounds-text-fitting/12-CONTEXT.md`
- `.planning/phases/13-global-wrapper-style-primitives/13-CONTEXT.md`
- `.planning/quick/007-preserve-internal-toggle-state-across-deck-activation-and-reconnect/007-SUMMARY.md`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/deck/runtime.ts`: already provides runtime instance ownership, lifecycle hooks (`onActivate`, `onDeactivate`, `refresh`, `onTap`), polling, reconnect-safe activation flow, and command execution wiring.
- `packages/cli/src/core/schemas.ts`: already carries partial toggle-era config fields such as `states` and `status_command`, and is the right place to harden the built-in toggle schema.
- `packages/cli/src/render/text-image.ts`: already contains a `toggle` visual variant that can anchor the shared toggle layout.
- `packages/cli/src/render/reconciler.ts` and `packages/cli/src/render/types.ts`: already preserve toggle-flavored render props through the public render contract.

### Established Patterns
- Validation should fail early and with path-aware diagnostics when config-authored contracts are wrong.
- Shared renderer contracts should stay narrow and explicit rather than drifting into heuristic behavior.
- Runtime state ownership matters: only externally rehydratable state should be eagerly reset.
- Bundled built-ins should ship through the same addon registry path as external addons rather than special-casing a separate runtime-only button system.

### Integration Points
- A new bundled built-in toggle definition likely belongs in `builtin-addons/core-buttons/` unless planning finds a cleaner built-in-addon home.
- Runtime refresh and tap flows in `packages/cli/src/deck/runtime.ts` will need mode-aware toggle rehydration and failure handling.
- Config validation in `packages/cli/src/core/schemas.ts` must strictly enforce per-mode required/forbidden fields.
- Focused runtime/render/config tests and a committed manual review fixture will be required to prove lifecycle continuity and command-authority behavior.

## Deferred Ideas

- Durable persistence of internal toggle state across fresh daemon process restarts.
- Regex-based or broader heuristic command-state parsing beyond explicit token lists.

---
*Phase: 14-richer-built-in-toggles*
*Context gathered: 2026-05-18*
