# Phase 38: Startup Image Full Deck Coverage - Context

**Gathered:** 2026-06-04
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Change the startup placeholder logo from the current centered 88%×36% size to fill 100% of the device surface using `fit: "contain"`, with the logo's own border color (`#efe3e1`) as the solid background. No distortion, no runtime color extraction, no per-device special-casing.

</domain>

<decisions>
## Implementation Decisions

### Scale Strategy
- Use `fit: "contain"` at **100% of both width and height** — scale the logo to fill whichever dimension hits the canvas edge first while preserving aspect ratio
- No minimum size clamps (remove the existing `Math.max(72, ...)` / `Math.max(40, ...)` restrictions)
- No distortion — `fit: "fill"` explicitly rejected

### Background Color
- Replace `STREAM_DECK_KEY_PRESET.background` (`#0f1720`) with **`#efe3e1`** — extracted one-time from `logoFull.png` border pixels (rgb(239, 227, 225))
- No runtime color extraction — the hex value is hardcoded as a constant
- No gradient, no blurred backdrop — solid color only

### Device Variance
- **Uniform behavior** — same `contain` at 100% logic for every device (Pedal, Neo, Mini, Stream Deck+, MK.2, XL)
- Letterboxing is accepted where device aspect ratio diverges from logo aspect ratio (~1.625:1)

### Edge Cases
- Tiny devices (Pedal 72×72, Neo 144×72) use the same uniform logic — no special casing, no minimum size floor

### Agent's Discretion
- Which constant name to use for the new background color (`STARTUP_BG_COLOR` or similar)
- Whether to keep or remove the `STARTUP_LOGO_FULL_PATH` constant (unchanged)
- Exact file changes in `startup-placeholder.ts` (resize dimensions, background color constant)

</decisions>

<specifics>
## Specific Ideas

The logo border color was determined by sampling corner and edge pixels of `packages/cli/src/assets/logoFull.png` — all four corners and all four edge centers returned `rgb(239, 227, 225)` consistently.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/render/startup-placeholder.ts` — the only file to modify
- `packages/cli/src/render/startup-placeholder.test.ts` — update test expectations

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sharp` resize with `fit: "contain"` (startup-placeholder.ts:22) — same library, same pattern, just different dimensions
- `STREAM_DECK_KEY_PRESET.background` (render-preset.ts:13) — current background color, replaced with hardcoded `#efe3e1`

### Established Patterns
- Deck-wide composite → per-key extraction via `sharp.extract()` — unchanged
- Startup placeholder created in `start.ts` via `createStartupPlaceholderBuffers()` — unchanged

### Integration Points
- Only `startup-placeholder.ts` and its test file need changes
- No changes to `start.ts`, `browser-renderer.ts`, `device/stream-deck.ts`, or any other file

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---
*Phase: 38-startup-image-full-deck-coverage*
*Context gathered: 2026-06-04*
