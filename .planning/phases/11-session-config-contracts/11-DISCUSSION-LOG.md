---
phase: 11
slug: session-config-contracts
areas_discussed:
  - Context contract
  - Injection surfaces
  - Locked deck config
  - Unlock restore semantics
  - Unsupported-platform behavior
created: 2026-05-17
---

# Phase 11: Session + Config Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `11-CONTEXT.md`.

**Date:** 2026-05-17
**Phase:** 11-session-config-contracts
**Areas discussed:** Context contract, Injection surfaces, Locked deck config, Unlock restore semantics, Unsupported-platform behavior

---

## Context contract

### Shared host/session object

| Option | Description | Selected |
|--------|-------------|----------|
| One host context object | One normalized object carries both OS info and session state everywhere | ✓ |
| Separate lock channel | OS info is shared, but lock state travels through another runtime-only path | |
| OS-only shared context | Shared context excludes session state entirely | |

**User's choice:** `One host context object`
**Notes:** This keeps the contract unified across config templating, addon render, and command/status execution instead of inventing multiple host-state seams.

### OS normalization scope

| Option | Description | Selected |
|--------|-------------|----------|
| Type + variant + version | Normalize the exact OS triple required by the roadmap | ✓ |
| Type + version only | Omit variant information | |
| Rich host fingerprint | Add broader host metadata beyond the milestone requirement | |

**User's choice:** `Type + variant + version`
**Notes:** This matches the stated requirement and keeps the context contract intentionally small.

### Session information shape

| Option | Description | Selected |
|--------|-------------|----------|
| State + capability | Expose current session state plus whether lock-awareness is supported | ✓ |
| State only | Expose only locked/unlocked state | |
| Capability only | Expose only whether lock-awareness is supported | |

**User's choice:** `State + capability`
**Notes:** Unsupported hosts should be explicit rather than inferred from missing or fake state.

### Session state enum

| Option | Description | Selected |
|--------|-------------|----------|
| locked / unlocked / unknown | Minimal honest state set for this phase | ✓ |
| locked / unlocked only | No explicit unknown state | |
| Extended state set | Add idle, dimmed, suspended, or transition states | |

**User's choice:** `locked/unlocked/unknown`
**Notes:** `unknown` covers unsupported or not-yet-detected situations without lying.

---

## Injection surfaces

### Shared shape strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Exact shared shape everywhere | Reuse the same canonical host-context object unchanged across all surfaces | ✓ |
| Shared core with surface extras | Keep a common base and allow surface-specific host additions | |
| Equivalent but separate shapes | Allow each surface to expose similar data in different forms | |

**User's choice:** `Exact shared shape everywhere`
**Notes:** This prevents contract drift between runtime, command, and config layers.

### Config templating seam

| Option | Description | Selected |
|--------|-------------|----------|
| Establish the first minimal templating seam | Introduce the smallest config-time interpolation path needed for host context | ✓ |
| Assume a hidden existing seam | Pretend templating already exists and only wire context into it | |
| Defer templating details | Leave the requirement underspecified for planning | |

**User's choice:** `Establish the first minimal templating seam`
**Notes:** The current codebase has no config templating path, so this phase must introduce a narrow one honestly.

### Addon host-context access

| Option | Description | Selected |
|--------|-------------|----------|
| First-class instance input | Pass canonical host context directly into addon instance creation/render usage | ✓ |
| Commands only | Only expose host context through command interpolation | |
| Methods callback | Hide host context behind a runtime getter method | |

**User's choice:** `As first-class instance input`
**Notes:** Addons should not need to scrape strings or runtime-specific getters just to use the canonical host context.

---

## Locked deck config

### Config declaration location

| Option | Description | Selected |
|--------|-------------|----------|
| Top-level runtime setting | Declare locked-session behavior through a top-level runtime/session config key | ✓ |
| Per-deck override | Let each deck declare its own locked fallback | |
| Implicit reserved deck id | Hardcode a magic locked deck name/id | |

**User's choice:** `Top-level runtime setting`
**Notes:** Lock-aware deck substitution is runtime-wide behavior, not a property of each ordinary deck.

### Locked surface type

| Option | Description | Selected |
|--------|-------------|----------|
| Ordinary deck reference | Point the setting at a normal deck defined under `decks` | ✓ |
| Special locked-deck schema | Create a dedicated deck type for locked mode | |
| Agent's discretion | Leave the choice to planning | |

**User's choice:** `An ordinary deck reference`
**Notes:** This keeps config and rendering uniform.

### Missing locked-deck behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit built-in runtime fallback | Automatically show a default date/time locked surface | ✓ |
| Shipped example only | Document a fallback deck, but do not synthesize one automatically | |
| Built-in named deck template | Ship a reusable explicit template users must reference | |

**User's choice:** `provide a default lock deck fallback with the date and time`
**Follow-up decision:** `Implicit built-in runtime fallback`
**Notes:** The user explicitly rejected doing nothing when config omits a locked deck and wanted a real runtime fallback rather than documentation-only guidance.

---

## Unlock restore semantics

### What unlock restores

| Option | Description | Selected |
|--------|-------------|----------|
| Full prior navigation state | Restore the active deck and back-stack exactly as they were before lock | ✓ |
| Only active deck id | Restore just the visible deck | |
| Always main deck | Reset to the main deck on unlock | |

**User's choice:** `Full prior navigation state`
**Notes:** This matches the roadmap success criterion and avoids dropping the user onto an arbitrary surface.

### Locked-mode navigation isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Keep lock mode isolated | Locked-surface navigation cannot mutate saved pre-lock state | ✓ |
| Mutate the main stack | Locked mode reuses and mutates the normal navigation stack | |
| Disable locked-surface navigation entirely | Locked mode shows a non-navigable surface only | |

**User's choice:** `Keep lock mode isolated`
**Notes:** This preserves the exact pre-lock user context for later restoration.

### Restore fallback when prior state is unclear

| Option | Description | Selected |
|--------|-------------|----------|
| Main deck fallback | Restore saved state when available, else return to main deck | ✓ |
| Most recent rendered surface | Restore whatever the device last rendered | |
| Keep locked surface until manual nav | Do not auto-restore when prior state is unclear | |

**User's choice:** `Main deck fallback`
**Notes:** This gives planning a deterministic base case.

---

## Unsupported-platform behavior

### Unsupported host runtime behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Run normally and expose unsupported capability | Keep runtime functional and mark lock-awareness as unsupported | ✓ |
| Warn and continue | Same as above with an explicit warning bundled into the choice | |
| Hard fail startup | Refuse to start when lock detection is unsupported | |

**User's choice:** `Run normally and expose unsupported capability`
**Notes:** Lock-aware behavior should degrade explicitly instead of blocking the whole CLI.

### Startup warning policy

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, warn once | Emit one explicit startup warning that lock-aware behavior is unavailable | ✓ |
| No warning, context only | Only expose the unsupported capability through host context | |
| Warn only when configured | Emit a warning only when the user configured locked-session behavior | |

**User's choice:** `Yes, warn once`
**Notes:** This keeps the runtime honest without turning unsupported lock detection into noisy repeated logs.

---

## Contradictions And Risks

- No major contradiction remains in the selected decisions. The chosen set consistently favors one canonical host-context contract and explicit degradation on unsupported hosts.
- The main implementation risk is widening too many public seams at once. Planning should keep the host-context contract narrow and reuse one runtime-owned source of truth rather than separately bolting context into loader, runtime, and command code.
- The main config risk is letting the new templating support sprawl beyond host-context interpolation. This phase should add the minimum viable config-time seam only.
- The main navigation risk is accidentally letting locked-mode deck changes mutate the saved pre-lock stack. Planning should model lock mode as isolated runtime state from the start.

---

## Agent's Discretion

- Exact host-context field names and TypeScript type shape.
- Exact config key names/nesting for runtime/session lock settings.
- Exact templating syntax and evaluation boundaries for host-context interpolation.
- Exact first supported lock-detection implementation path.
- Exact built-in locked fallback deck composition, as long as it remains a simple date/time surface.
- Exact startup warning wording and logging level.

---

## Deferred Ideas

- Richer host fingerprints beyond OS `type`, `variant`, and `version`.
- Extended session semantics such as idle, dimmed, suspended, or transition-specific states.
- Fake universal lock detection across unsupported platforms or desktop environments.
- Richer lock-screen overlays, dimming behavior, or polish beyond the Phase 11 boundary.

---

*Phase: 11-session-config-contracts*
*Discussion log generated: 2026-05-17*
