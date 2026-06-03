# Phase 14 Discussion Log

**Phase:** 14 - Richer Built-in Toggles
**Date:** 2026-05-18
**Mode:** standard
**Status:** complete

## Areas Selected

- Built-in toggle config shape
- Command authority model
- State continuity and lifecycle
- Toggle visuals and labels

## Area: Built-in toggle config shape

### Question 1
**Prompt:** How should the built-in toggle be exposed in config?

**Options considered:**
- `One type + mode (Recommended)`: Ship one built-in toggle type with an explicit discriminator like internal vs command-get-set vs command-toggle-status. Shared visuals and lifecycle stay unified while schema validation stays strict per mode.
- `Separate toggle types`: Use different built-in button types for internal toggle and each command-driven model. Simpler per-type schemas, but more surface area and more chances for render/lifecycle drift.
- `One loose type`: Use one toggle type without an explicit discriminator and infer behavior from which command fields are present. Small YAML surface, but validation and error messages get mushy fast.

**User choice:** `One type + mode (Recommended)`

### Question 2
**Prompt:** Which authority/model names should the config use?

**Options considered:**
- `internal/get-set/toggle-status (Recommended)`: Use model names that describe authority cleanly: internal, get-set, and toggle-status. Short, explicit, and maps directly to the two required command-driven models plus runtime-owned state.
- `local/command/shell`: Short names, but command is too broad and shell describes transport rather than authority model.
- `stateful/polled/optimistic`: Describes behavior style, but muddies the actual command contract and will confuse config authors.

**User choice:** `internal/get-set/toggle-status (Recommended)`

### Question 3
**Prompt:** How should on/off presentation be configured?

**Options considered:**
- `Shared base + overrides (Recommended)`: Use common toggle fields plus optional per-state overrides for label, subtitle, icon, and command metadata. Keeps config concise while still allowing distinct ON/OFF visuals.
- `Full on/off state objects`: Model the toggle as two full state objects. Very explicit, but duplicates a lot of config and makes simple toggles noisy.
- `Minimal fixed labels`: Keep presentation mostly built-in with only a couple of text fields. Smallest API, but too rigid for a programmable deck tool.

**User choice:** `Shared base + overrides (Recommended)`

## Area: Command authority model

### Question 1
**Prompt:** For command-driven toggles, what should count as the final source of truth after a tap?

**Options considered:**
- `Status/get command wins (Recommended)`: After tap, the runtime may show a temporary pending state, but the next get_state or status command decides the real ON/OFF state. This matches external authority and avoids lying when commands fail or drift.
- `Tap result wins until refresh`: Assume the command succeeded and flip immediately until polling catches up. Faster-feeling, but can show false state for too long.
- `Never flip until poll returns`: Only update after the authoritative command returns. Safest, but interaction can feel dead unless pending UI is very clear.

**User choice:** `Status/get command wins (Recommended)`

### Question 2
**Prompt:** In `toggle-status` mode, how should the runtime determine the post-tap state?

**Options considered:**
- `Require status command (Recommended)`: Every toggle-status config must provide a status command, and the runtime reconciles to that authoritative result after taps and on refresh. Clear contract, fewer lies.
- `Infer from previous state`: Assume toggle means invert the last known state. Works for ideal cases, but breaks if the external system changed out of band or the command failed.
- `Optional status command`: Allow bare toggle-only configs and fall back to local inversion when status is missing. More flexible, but weakens the command-driven guarantee in SCS-07.

**User choice:** `Require status command (Recommended)`

### Question 3
**Prompt:** How should command output map to toggle state?

**Options considered:**
- `Canonical boolean tokens (Recommended)`: Trim and case-fold stdout, then accept a small explicit set like on/off, true/false, 1/0. Unknown output becomes unavailable/error instead of being guessed.
- `User-defined token mapping`: Let each config declare custom strings for ON/OFF. Flexible, but adds more schema and test surface in the same phase.
- `Truthy/falsey heuristic`: Guess from arbitrary strings like enabled, active, yes, disabled, etc. Convenient at first, but too fuzzy and error-prone.

**User choice:** `User-defined token mapping`

### Question 4
**Prompt:** If command-driven toggles support custom output mapping, what shape should that mapping take?

**Options considered:**
- `on/off token lists (Recommended)`: Allow explicit token lists like on_values and off_values, while still defaulting to canonical boolean tokens when omitted. Simple to validate and easy to explain.
- `Single exact strings`: Require one exact on token and one exact off token. Smallest surface, but too brittle for commands that emit multiple acceptable forms.
- `Regex per state`: Maximum flexibility, but this is too much parser power for Phase 14 and makes errors harder to reason about.

**User choice:** `on/off token lists (Recommended)`

## Area: State continuity and lifecycle

### Question 1
**Prompt:** Before the first authoritative command result arrives, how should command-driven toggles render?

**Options considered:**
- `Pending until first read (Recommended)`: Show a neutral pending/unavailable state until get_state or status_command resolves. Honest about unknown external state and avoids false ON/OFF flashes on startup or reconnect.
- `Use configured default`: Render an initial ON/OFF guess from config until polling catches up. Faster-looking, but can be wrong immediately.
- `Remember last seen value`: Persist the last observed command state in memory across reconnects/startups and show that first. Smoother, but stale if the external system changed while we were gone.

**User choice:** `Pending until first read (Recommended)`

### Question 2
**Prompt:** If a command-driven toggle tap fails, what should the button show?

**Options considered:**
- `Keep last truth + error (Recommended)`: Preserve the last authoritative ON/OFF state but surface an unavailable/error presentation until a later read succeeds. Keeps signal while admitting the write failed.
- `Drop to unknown immediately`: Clear the state entirely on failure. Honest, but throws away useful last-known truth and can make the button jumpy.
- `Keep optimistic flip`: Leave the flipped state visible despite the failure and wait for polling. Too misleading for an authoritative command model.

**User choice:** `Keep last truth + error (Recommended)`

### Question 3
**Prompt:** How far should internal toggle state continuity go in Phase 14?

**Options considered:**
- `Running daemon only (Recommended)`: Preserve internal state across activation, refresh, and reconnect within the active runtime, but a fresh process start reuses configured initial state. Keeps Phase 14 narrow and avoids introducing persistence storage.
- `Persist across process restarts`: Store internal toggle state somewhere durable and restore it on startup. Useful, but definitely a broader capability than the current phase needs.
- `Reset on every deck activation`: Simplest behavior, but directly conflicts with SCS-06 and the prior quick fix.

**User choice:** `Running daemon only (Recommended)`

## Area: Toggle visuals and labels

### Question 1
**Prompt:** How should the three toggle modes render visually?

**Options considered:**
- `One shared toggle variant (Recommended)`: All modes use the same toggle visual family and state badges; only labels, subtitles, and pending/error indicators vary. Keeps the UX coherent and reuses the existing toggle render variant.
- `Different variant per mode`: Internal and command-driven toggles get visibly different card styles. Could help teach authority, but risks visual drift and more renderer work.
- `Default card only`: No dedicated toggle chrome; just shared/default cards with text changes. Minimal work, but throws away the existing toggle render seam.

**User choice:** `Different variant per mode`

### Question 2
**Prompt:** If modes render differently, what level of divergence is acceptable in Phase 14?

**Options considered:**
- `Shared base, mode accents (Recommended)`: Keep one underlying toggle layout but vary badges, subtitles, and small chrome treatment by mode. Distinct enough to signal authority model without creating three bespoke renderers.
- `Three bespoke toggle widgets`: Each mode gets its own layout and visual behavior. Strong distinction, but a lot more render and verification surface for this phase.
- `Same layout, text only`: Technically different by mode name/subtitle only. Lowest risk, but barely honors the choice to differentiate modes visually.

**User choice:** `Shared base, mode accents (Recommended)`

## Agent's Discretion

- Exact field names for shared and per-state presentation values.
- Exact pending/error wording and badge copy.
- Whether canonical boolean parsing is additive beneath explicit token lists.
- Exact renderer seam used to implement the shared base plus mode accents.

## Deferred Ideas

- Durable persistence of internal toggle state across full process restarts.
- Regex-based command output parsing.

---
*Audit log for Phase 14 discussion*
