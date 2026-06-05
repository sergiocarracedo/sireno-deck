# Phase 44: Media-Volume Buttons - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Add two new button types to extend the media-player addon: `media-mute` (toggle system audio mute, shows real state) and `media-volume` (with `variant: 'up' | 'down'`, increments/decrements volume by 5% per tap, shows current volume as bar + percentage). Both honor the existing 600ms hold gesture, with the smart affordance that **hold on volume up/down toggles mute** instead of stepping.

Linux: `pactl` against `@DEFAULT_SINK@` (PulseAudio + PipeWire compatible). macOS: `osascript` without sudo. Windows: explicitly unsupported with "not available on this OS" state.

</domain>

<decisions>
## Implementation Decisions

### Two button types
- **`media-mute`** — toggle system audio mute, displays real state via icon
- **`media-volume`** — single type, two variants (`variant: 'up' | 'down'`)
- Two separate schemas:
  - `BuiltinMediaMuteButtonSchema` — no fields beyond the addon base
  - `BuiltinMediaVolumeButtonSchema` — accepts `variant: 'up' | 'down'`

### Tap behavior
- **`media-mute` tap:** toggle mute (query current state, flip it)
- **`media-volume` tap (up):** increment volume by 5%
- **`media-volume` tap (down):** decrement volume by 5%
- All use the existing 600ms hold threshold from `addon/api.ts:85`

### Hold behavior
- **`media-mute` hold (≥600ms):** toggle mute (same as tap)
- **`media-volume` hold (≥600ms):** toggle mute (clever ergonomic — user can press-hold either volume button to silence quickly)

### Mute visual
- Mute button shows real state via Lucide icon:
  - Muted: `volume-x` (red tone)
  - Unmuted: `volume-2` (foreground tone)
- Polls system state (every 2-3s) to update the icon
- Linux: `pactl get-sink-mute @DEFAULT_SINK@`
- macOS: `osascript` `output muted of (get volume settings)`

### Volume visual
- `media-volume` button shows:
  - Current volume percentage as a number (e.g., "65")
  - A `Bars` progress bar showing the percentage (reuse shared `Bars` from `ui/`)
- Linux: parse `pactl get-sink-volume @DEFAULT_SINK@` to extract percentage
- macOS: parse `osascript` `output volume of (get volume settings)` (0-100)
- Polled at 1-2s for smooth visual updates

### OS-specific adapters
- New domain class `MediaVolumeController` with `getMuteState()` and `getVolumePercent()` methods
- Linux: pactl calls
- macOS: osascript calls
- Windows: returns explicit "unavailable" snapshot

### Agent's Discretion
- Exact poll interval for mute state and volume percentage
- Whether to add visual feedback for the volume step on tap (flash a "+5" briefly)
- Exact `Bars` style (horizontal vs vertical)
- Whether to make the 5% step configurable per-button

</decisions>

<specifics>
## Specific Ideas

- **"Hold on volume up/down toggles mute"** is a clever ergonomic choice — the user doesn't need a dedicated mute button. They can press-hold EITHER volume button to silence
- **Volume bar + percentage** is the "media-player-style" visual treatment. The existing `Bars` component from `ui/` already supports this
- **Real-state polling** is essential for a hardware button — the user expects the icon to reflect the actual system state, not what they last set

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `/works/opensource/sireno-deck/.planning/research/v1.4/FEATURES.md` — media-volume feature spec
- `/works/opensource/sireno-deck/.planning/research/v1.4/ARCHITECTURE.md` — extends MediaController interface
- `/works/opensource/sireno-deck/.planning/REQUIREMENTS.md` — `MV-01` through `MV-07`
- `/works/opensource/sireno-deck/.planning/phases/44-media-volume-buttons/...` (this file)
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/domain/media-controller.ts` — existing controller pattern
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/domain/linux-media-controller.ts` — Linux pactl pattern
- `/works/opensource/sireno-deck/packages/cli/src/builtin-addons/media-player/domain/macos-media-controller.ts` — macOS osascript pattern
- `/works/opensource/sireno-deck/packages/cli/src/ui/Bars.tsx` — shared bar component
- `/works/opensource/sireno-deck/packages/cli/src/ui/Icon.tsx` — Lucide icons (volume-x, volume-2)
- `/works/opensource/sireno-deck/packages/cli/src/addon/api.ts:85` — existing 600ms hold timer

</canonical_refs>

<deferred>
## Deferred Ideas

- Per-button configurable step size
- Visual flash for step feedback
- Mute button with "always-mute" hold option (different from toggle)
- Default audio device selection
- Per-application volume control

</deferred>

---
*Phase: 44-media-volume-buttons*
*Context gathered: 2026-06-04*
