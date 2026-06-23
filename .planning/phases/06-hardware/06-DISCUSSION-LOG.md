# 06-DISCUSSION-LOG

## Mode

Standard (4-question per area max, single-option recommendations).

## Areas discussed

### 1. Write strategy

Options considered:
- (A) Delta only — hash each cropped key buffer; skip write if unchanged (Recommended)
- (B) Always write all keyCount buffers every cycle
- (C) Hybrid — full write on startup, delta after

User choice: **(A) Delta only**.

Rationale: User cares about SPI bus bandwidth on 32-key devices. Delta writes are the natural fit. Plan 02 already specifies buffer-hash skip; user confirmed.

### 2. Screenshot trigger

Options considered:
- (A) Pure timer (Recommended in proposal)
- (B) Event-driven only — subscribe to runtime:activeDeck + runtime:invalidate
- (C) Hybrid — timer + event debounce 50ms

User choice: **(C) Hybrid — timer + event debounce**.

Rationale: User wants smooth animations (timer cadence) but also low idle CPU when nothing is changing. The hybrid gives both. 50ms debounce on event-triggered re-renders prevents screenshot storms when invalidates arrive in bursts.

### 3. Device-selection UX (stale saved selection)

Options considered:
- (A) Prompt with all connected devices (Recommended in proposal)
- (B) Fail with helpful error message
- (C) Auto-detect single new device and use it without prompting

User choice: **(A) Prompt**.

Rationale: User prefers explicit prompts over auto-detection. The saved-but-stale selection is shown as a hint marker in the prompt but the user is free to pick another device.

## Areas delegated to agent's discretion

- Exact Playwright browser launch flags
- CadenceTimer warning threshold for slow callbacks
- Linux udev rule content wording (must include `idVendor=0x0fd9`)

## Carrying forward from earlier phases (not re-decided)

- sha1-truncated-to-16 buffer hash (Phase 06 Plan 02 default)
- Atomic `.tmp` + rename for `device.json`
- `@inquirer/prompts` `select()` for arrow-key UI
- Phase 04 `vite-server.ts` for the consumer's URL
- Phase 05 `gridForKeyCount` for crop layout

## Deferred ideas

None.
