# Phase 11: Session + Config Contracts - Context

**Gathered:** 2026-05-17
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 11 establishes the core host/session contract for the v1.2 milestone. It should introduce one normalized host context shape, inject that shape consistently into config templating, addon render, and command/status execution, and add the runtime/config contract for lock-aware deck behavior. The phase is not a broad host-introspection effort and should not widen into richer session semantics, cross-platform parity promises, or visual polish beyond the locked-session surface handoff.

</domain>

<decisions>
## Implementation Decisions

### Canonical Host Context Contract
- Phase 11 should define one canonical host context object shared across all supported surfaces.
- The OS portion of that contract must normalize exactly these fields:
  - `type`
  - `variant`
  - `version`
- The session portion of that contract must expose both:
  - current session `state`
  - lock-awareness `capability`
- The normalized session state set for this phase is limited to:
  - `locked`
  - `unlocked`
  - `unknown`

### Injection Surfaces
- The exact same host-context shape must be reused across:
  - addon render/input
  - command and status execution
  - config templating
- Addons should receive host context as a first-class instance input rather than being forced to reconstruct it indirectly through command interpolation or ad hoc method calls.
- Phase 11 is allowed to establish the first minimal config templating seam needed to consume the canonical host context. Planning should keep that seam narrow rather than turning this phase into a general-purpose templating system.

### Locked-Session Config Contract
- Lock-aware runtime behavior should be declared through a top-level runtime/session config setting rather than per-deck overrides.
- When a custom locked-session surface is configured, it should point at an ordinary deck defined in `decks`.
- If no locked-session deck is configured, the runtime should still provide a built-in locked fallback surface that shows date/time.
- That default fallback should be implicit runtime behavior, not just an example config pattern.

### Unlock Restore Contract
- Unlock must restore the full pre-lock navigation state, not only the visible deck id.
- Locked-session mode should be isolated from the normal navigation stack.
- Navigation or actions performed while the locked-session surface is active must not mutate the saved pre-lock navigation state.
- If no meaningful pre-lock state exists, unlock should restore the main deck.

### Unsupported-Host Behavior
- Unsupported lock detection must not block normal runtime startup.
- The canonical host context must expose unsupported lock-awareness explicitly through session capability rather than implying support from missing values.
- Runtime should log a one-time startup warning when lock-aware behavior is unavailable on the current host path.

### Agent's Discretion
- Exact field names inside the canonical host-context object, as long as the contract preserves the user-approved semantics above.
- Exact minimal templating syntax/mechanics for config-time host-context interpolation.
- Exact config key names and nesting for the top-level runtime/session lock setting.
- Exact implementation seam for host/session detection on the first supported lock-aware platform path.
- Exact warning text and logging level for the one-time unsupported-host warning.

</decisions>

<specifics>
## Specific Ideas

- The current codebase has no host-context seam yet, so planning should treat this as a contract-introduction phase rather than pretending the injection path already exists.
- Keep the normalized contract honest: do not invent fake lock/session parity across unsupported desktop environments.
- The default locked fallback should be useful immediately, which means a simple built-in date/time surface rather than a blank screen or required YAML setup.
- Config templating should stay minimal and host-context-driven, not become a broad dynamic config language.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/PROJECT.md`
- `.planning/REQUIREMENTS.md`
- `.planning/ROADMAP.md`
- `.planning/STATE.md`
- `.planning/phases/10-public-authoring-exports/10-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/action/executor.ts`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/config/loader.ts`
- `packages/cli/src/core/schemas.ts`
- `packages/cli/src/deck/controller.ts`
- `packages/cli/src/deck/runtime.ts`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/cli/src/deck/runtime.ts`: owns button instance creation, runtime navigation, and command execution wiring; this is the main seam for injecting canonical host context and preserving/restoring pre-lock navigation state.
- `packages/cli/src/addon/api.ts`: current addon instance options only include `button`, `config`, `methods`, and `theme`; Phase 11 will need to widen this public contract carefully to add first-class host context.
- `packages/cli/src/config/loader.ts`: current config loading and validation path has no templating/interpolation step, so the first host-context templating seam will need to enter here or immediately around it.
- `packages/cli/src/core/schemas.ts`: owns the top-level config schema and deck/button expansion flow, so any runtime/session config keys for locked-session behavior should be validated here.
- `packages/cli/src/cli/commands/start.ts`: central startup orchestration point and the likely home for one-time unsupported-host warnings plus the first host/session detector bootstrap.

### Established Patterns
- Core owns runtime scheduling and command execution rather than delegating those concerns to addons.
- Public contracts are kept narrow and explicit instead of leaking incidental internal structure.
- Prior milestone research already committed the project to one core-owned normalized context contract shared across all host-aware surfaces.

### Integration Points
- Canonical host context injection will connect config loading, addon instance creation, and command/status execution through a single runtime-owned source of truth.
- Locked-session deck switching and unlock restoration will connect runtime activation logic in `packages/cli/src/deck/runtime.ts` with navigation-state handling in `packages/cli/src/deck/controller.ts`.
- The top-level lock-aware config setting will connect schema validation in `packages/cli/src/core/schemas.ts` with startup/runtime behavior in `packages/cli/src/cli/commands/start.ts`.
- The implicit date/time fallback will likely reuse existing built-in date/time render primitives rather than inventing a separate visual system.

</code_context>

<deferred>
## Deferred Ideas

- Broader host-context fields beyond OS `type` / `variant` / `version`.
- Wider session-state semantics such as idle, dimmed, suspended, or transition-specific states.
- Fake universal lock detection across unsupported platforms or desktop environments.
- Richer lock-screen visuals or behaviors beyond deck substitution, default date/time fallback, and later dimming work in Phase 15.

</deferred>

---
*Phase: 11-session-config-contracts*
*Context gathered: 2026-05-17*
