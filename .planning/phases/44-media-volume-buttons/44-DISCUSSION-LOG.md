# Phase 44 Discussion Log

**Date:** 2026-06-04
**Phase:** 44 — Media-Volume Buttons
**Mode:** standard

## Carrying Forward

From v1.4 research (locked):
- New `media-volume` button type (or types)
- Extends `MediaController` interface
- Linux: pactl against `@DEFAULT_SINK@` (works on PulseAudio + PipeWire)
- macOS: osascript without sudo
- Windows stays "unavailable" for v1.4

## Gray Areas Discussed

### 1. Schema shape

**Initial choice:** Single type, variant field.
**User changed mind to:** Two separate button types.

**Decision:** Two types — `media-mute` (toggle) and `media-volume` (with `variant: 'up' | 'down'`). Two schemas, two button definitions, but both belong to the media-player addon.

### 2. Volume step size

**Options considered:**
- **Fixed 5% increments** ✅ chosen
- 10% increments
- Configurable per-button

**Decision:** Fixed 5% per tap, matching pactl's default behavior.

### 3. Hold behavior

**User's verbatim answer:** "hold on volume up or down should toggle mute"

**Decision:**
- `media-mute` hold → toggle mute (same as tap, kept simple)
- `media-volume` hold (either direction) → toggle mute

This is a clever ergonomic affordance — the user can press-hold either volume button to silence without aiming for the dedicated mute button.

### 4. Mute visual

**Options considered:**
- **Icon reflects real state** ✅ chosen
- Static icon, no state check
- Color tone reflects state

**Decision:** Icon swaps between `volume-x` (red, muted) and `volume-2` (foreground, unmuted) based on polled system state.

### 5. Volume button content

**User's verbatim addition:** "volume button should be able to show a bar and number with the volume level"

**Decision:** Reuse the shared `Bars` component for the bar; show percentage as a number above/below the bar.

## Agent's Discretion

- Exact poll intervals
- Whether to add step-flash visual feedback
- Exact `Bars` style
- Whether to make the 5% step configurable

## Deferred Ideas

- Per-button configurable step size
- Visual flash for step feedback
- Mute button with "always-mute" hold option
- Default audio device selection
- Per-application volume control

## Next

`plan-phase 44` — convert these decisions into executable plans.
