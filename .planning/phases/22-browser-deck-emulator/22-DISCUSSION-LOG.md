---
phase: 22
slug: browser-deck-emulator
areas_discussed:
  - Runtime model
  - Interaction contract
  - Emulated device switching
  - Entry point and scope boundary
created: 2026-05-24
---

# Phase 22: Browser deck emulator - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 22-browser-deck-emulator
**Areas discussed:** Runtime model, Interaction contract, Emulated device switching, Entry point and scope boundary

---

## Runtime model

| Option | Description | Selected |
|--------|-------------|----------|
| Same real runtime, virtual device | Run the existing runtime and swap the physical device seam for a browser-backed virtual device/event layer | ✓ |
| Preview-only renderer | Show the deck visually without the full runtime/action loop | |
| Separate emulator runtime | Build a distinct browser-only runtime | |

**User's choice:** `Same real runtime, virtual device (Recommended)`
**Notes:** The user explicitly preferred the honest path over a fake preview or a forked runtime model.

| Option | Description | Selected |
|--------|-------------|----------|
| Run real actions/status commands | Keep behavior aligned with the normal trusted runtime model | ✓ |
| Render and status only, no actions | Disable real actions for safety | |
| Prompt before every action | Require confirmation for actions in emulator mode | |

**User's choice:** `Run real actions/status commands (Recommended)`
**Notes:** The emulator is intended for real preview/debugging, not a neutered demo mode.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, browser-only mode is valid | Allow startup without attached hardware when emulator mode is selected | ✓ |
| Require hardware if config expects it | Keep hardware discovery constraints even in emulator mode | |
| Only for tests, not end users | Restrict emulator mode to internal/dev use | |

**User's choice:** `Yes, browser-only mode is valid (Recommended)`
**Notes:** This is the core reason the phase exists.

---

## Interaction contract

| Option | Description | Selected |
|--------|-------------|----------|
| Full press/release semantics | Map mouse down/up onto the existing deck event model | ✓ |
| Simple click only | Collapse interaction to clicks | |
| Configurable modes | Offer multiple interaction mappings | |

**User's choice:** `Full press/release semantics (Recommended)`
**Notes:** The emulator should honor the same event model the runtime already uses.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, reflect real press/hold states | Show visible pressed/hold state transitions in the browser UI | ✓ |
| No, only trigger events | Keep browser visuals static while dispatching events | |
| Only pressed, not hold | Show a simpler visual state model | |

**User's choice:** `Yes, reflect real press/hold states (Recommended)`
**Notes:** The first rollout should be visually useful for interaction debugging, not only functionally wired.

| Option | Description | Selected |
|--------|-------------|----------|
| Mouse only first | Require only mouse interaction in the first rollout | ✓ |
| Add number-key shortcuts now | Add a narrow keyboard path immediately | |
| Full keyboard navigation | Add a broader keyboard interaction layer | |

**User's choice:** `Mouse only first (Recommended)`
**Notes:** Keyboard support was intentionally deferred to keep the first rollout narrow.

---

## Emulated device switching

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit selector in the browser UI | Let users choose device layout directly in the emulator page | ✓ |
| CLI flag only | Choose the virtual device only at startup | |
| Both browser UI and CLI seed | Support both persistent startup config and in-page controls | |

**User's choice:** `Explicit selector in the browser UI (Recommended)`
**Notes:** The emulator should be self-contained for users without hardware.

| Option | Description | Selected |
|--------|-------------|----------|
| Fail clearly with an emulator-specific error state | Show an honest error when the selected layout cannot represent the config | ✓ |
| Clip to visible keys | Silently render only the keys that fit | |
| Auto-switch to the smallest fitting device | Change the selected device automatically | |

**User's choice:** `Fail clearly with an emulator-specific error state (Recommended)`
**Notes:** Silent clipping was rejected as dishonest.

| Option | Description | Selected |
|--------|-------------|----------|
| Restart runtime for the new device shape | Treat device shape as a startup-level contract and restart on change | ✓ |
| Hot-swap in place | Mutate key count/layout live without restart | |
| Ask every time | Prompt before changing shape | |

**User's choice:** `Restart runtime for the new device shape (Recommended)`
**Notes:** The device shape is fundamental enough that a clean restart was preferred over hidden state mutation.

---

## Entry point and scope boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated CLI mode/command | Expose emulator mode explicitly at the CLI layer | ✓ |
| Auto-fallback from start | Switch into emulator mode implicitly on hardware failure or absence | |
| Internal dev-only script | Keep the feature off the public CLI surface | |

**User's choice:** `Dedicated CLI mode/command (Recommended)`
**Notes:** The emulator should be explicit, not magical.

| Option | Description | Selected |
|--------|-------------|----------|
| Single local page focused on the virtual deck | One local browser page plus minimal controls/status | ✓ |
| Multi-page local app | Broader in-browser app surface | |
| Embed into docs/demo page | Attach the emulator to documentation/demo flow | |

**User's choice:** `Single local page focused on the virtual deck (Recommended)`
**Notes:** The phase is about emulation, not building a general web UI product.

| Option | Description | Selected |
|--------|-------------|----------|
| Config editing UI | Keep config editing out of scope for the first rollout | ✓ |
| Keyboard shortcuts | Keep keyboard interaction out of scope for the first rollout | ✓ |
| Multi-user or remote access | Keep the emulator local and single-user | ✓ |
| Sandboxing action commands | Do not introduce a new safety model for emulator mode | ✓ |
| Session recorder / playback | Defer capture/replay tooling | ✓ |

**User's choice:** `Config editing UI (Recommended), Keyboard shortcuts (Recommended), Multi-user or remote access (Recommended), Sandboxing action commands (Recommended), Session recorder / playback`
**Notes:** The scope boundary intentionally keeps the first emulator rollout centered on local truthful execution without hardware.

---

## Agent's Discretion

- Exact CLI command spelling and startup flags.
- Exact local page layout and status chrome around the virtual deck.
- Exact implementation seam used to bridge browser mouse events into `StreamDeckKeyEvent`-style runtime input.

## Deferred Ideas

- Config editing UI inside the emulator.
- Keyboard shortcuts or keyboard navigation.
- Multi-user or remote access.
- Action sandboxing or permission prompts that differ from the normal runtime model.
- Session recording and playback.

---

*Phase: 22-browser-deck-emulator*
*Discussion log generated: 2026-05-24*
