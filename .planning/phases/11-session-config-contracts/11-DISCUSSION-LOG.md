---
phase: 11
slug: session-config-contracts
areas_discussed:
  - Context contract
  - Injection surfaces
  - Locked deck config
  - Unlock restore semantics
  - Unsupported-platform behavior
  - Command interpolation safety
  - Linux lock detection hardening
  - Fallback surface ownership
created: 2026-05-17
---

# Phase 11: Session + Config Contracts - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `11-CONTEXT.md`.

**Date:** 2026-05-17
**Phase:** 11-session-config-contracts
**Areas discussed:** Context contract, Injection surfaces, Locked deck config, Unlock restore semantics, Unsupported-platform behavior, Command interpolation safety, Linux lock detection hardening, Fallback surface ownership

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

## Command interpolation safety

### Shell safety model

| Option | Description | Selected |
|--------|-------------|----------|
| Shell-escape values | Keep `{{host.*}}` syntax, but escape substituted host values before `/bin/sh -c` execution | ✓ |
| Ban host placeholders in commands | Allow `{{host.*}}` only in non-command render/config text | |
| Add separate safe command API | Introduce a new structured argv-style command contract | |

**User's choice:** `Shell-escape values`
**Notes:** This keeps the shipped Phase 11 capability while fixing the actual threat at the smallest boundary.

### Escape boundary

| Option | Description | Selected |
|--------|-------------|----------|
| At command execution only | Escape only at the `/bin/sh -c` boundary | ✓ |
| During all placeholder resolution | Escape in the shared resolver everywhere | |
| Split syntax by context | Introduce separate placeholder syntaxes for UI vs command contexts | |

**User's choice:** `At command execution only`
**Notes:** Rendered labels and config-expanded text should stay human-readable; shell safety belongs at the shell boundary.

### Missing placeholder behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Leave placeholder intact | Preserve current behavior when `{{host.*}}` cannot be resolved | ✓ |
| Replace with empty string | Quietly drop missing placeholders | |
| Fail command before execution | Reject execution on unresolved placeholders | |

**User's choice:** `Leave placeholder intact`
**Notes:** This keeps missing values observable and avoids silently changing command behavior.

---

## Linux lock detection hardening

### Linux support claim

| Option | Description | Selected |
|--------|-------------|----------|
| Real detector or unsupported | Only report `supported` when a real detector initializes | |
| Keep Linux supported-by-default | Continue to claim Linux support from platform alone | ✓ |
| Report Linux as unknown | Soften the claim instead of supported/unsupported | |

**User's choice:** `Keep Linux as supported-by-default`
**Notes:** This was initially chosen, but it directly conflicts with the existing Phase 11 policy against fake support claims and leaves the security finding open.

### Concrete supported path

| Option | Description | Selected |
|--------|-------------|----------|
| One real Linux detector | Implement one specific real detector and only then mark `supported` | ✓ |
| Simulated seam only | Keep tests/interfaces only, no real host integration | |
| Custom answer | A different concrete Linux path chosen by the user | |

**User's choice:** `One real Linux detector`
**Notes:** This corrected the earlier over-broad support claim and re-aligned the discussion with the existing Phase 11 honesty requirement.

### Detector init failure behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fallback to unsupported | Keep startup running, downgrade capability, warn once | ✓ |
| Fail startup hard | Refuse to run without lock detection | |
| Stay supported but unknown | Continue to overclaim support with no live detector | |

**User's choice:** `Fallback to unsupported`
**Notes:** This matches the original degradation policy captured earlier in Phase 11.

### Detector scope

| Option | Description | Selected |
|--------|-------------|----------|
| Lock/unlock only | One long-lived detector limited to lock/unlock transitions | ✓ |
| Richer session states | Include idle/dimmed/suspended semantics | |
| Multi-platform parity | Expand to macOS/Windows in the same fix | |

**User's choice:** `Lock/unlock only`
**Notes:** The security fix should stay narrow and not widen Phase 11 into broader session-state work.

---

## Fallback surface ownership

### Fallback ownership model

| Option | Description | Selected |
|--------|-------------|----------|
| Use bundled addon path | Build the implicit fallback from the bundled date-time addon contract | ✓ |
| Keep runtime-owned fallback | Preserve the bespoke runtime-only date/time button definition | |
| Make fallback config-required | Remove the implicit fallback entirely | |

**User's choice:** `Use bundled addon path`
**Notes:** This keeps the fallback aligned with repo conventions and avoids runtime-only drift.

### Visible compatibility target

| Option | Description | Selected |
|--------|-------------|----------|
| Keep same behavior class | Remain an implicit useful locked-session date/time surface | ✓ |
| Preserve exact current label output | Match the current bespoke fallback exactly | |
| Open to a different fallback entirely | Re-decide the fallback experience during the fix | |

**User's choice:** `Keep same behavior class`
**Notes:** The security fix can change implementation details as long as it remains a useful implicit date/time lock surface.

### Runtime boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Selection only | Runtime decides configured-vs-implicit fallback, not bespoke render details | ✓ |
| Selection plus render details | Keep fallback implementation details in runtime | |
| Nothing runtime-owned | Push the whole fallback concept out of core | |

**User's choice:** `Selection only`
**Notes:** Runtime still owns lock-mode switching, but the fallback surface itself should come through the existing addon contract.

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
- Exact startup warning wording and logging level.

### Security-fix follow-up
- Exact POSIX shell-escaping mechanics for host-derived command substitutions.
- Exact concrete Linux detector implementation path, as long as `supported` only means a real detector initialized.
- Exact bundled date-time button/deck composition used for the implicit locked fallback, as long as it stays an implicit useful date/time surface.

---

## Deferred Ideas

- Richer host fingerprints beyond OS `type`, `variant`, and `version`.
- Extended session semantics such as idle, dimmed, suspended, or transition-specific states.
- Fake universal lock detection across unsupported platforms or desktop environments.
- Richer lock-screen overlays, dimming behavior, or polish beyond the Phase 11 boundary.

---

*Phase: 11-session-config-contracts*
*Discussion log generated: 2026-05-17*
