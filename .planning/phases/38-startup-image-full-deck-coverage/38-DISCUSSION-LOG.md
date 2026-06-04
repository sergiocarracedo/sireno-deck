# Phase 38 Discussion Log

**Phase:** 38 — Startup Image Full Deck Coverage
**Date:** 2026-06-04
**Mode:** standard

## Areas Discussed

### 1. Scale Strategy

**Question:** How should the logo scale to fill 100% of the deck surface?

**Options considered:**
- `cover` (crop to fill, maintain aspect ratio) — some edges clipped
- `fill` (stretch/distort to fit exactly) — distorts logo
- `contain` + background fill (keep aspect ratio, maximize size within bounds) — letterboxing on one axis

**Decision:** `contain` at 100% of both axes. No minimum size clamps. Logo fills to whichever dimension hits the canvas edge first.

**Rationale:** Keeps the logo recognizable without distortion. Letterboxing is an acceptable trade-off for uniform behavior across all device shapes.

---

### 2. Background Treatment

**Question:** What should the background and letterboxed areas look like?

**Options considered:**
- Solid `#0f1720` (current)
- Gradient extracted from logo colors — requires runtime sharp color extraction
- Blurred logo backdrop — more computation, more complex
- Logo's own border color — extracted once, hardcoded

**Decision:** Use `#efe3e1` (rgb(239, 227, 225)) — extracted one-time from `logoFull.png` border pixels. Hardcoded constant, no runtime extraction.

**Rationale:** The logo was designed for this background color. All four corners and edge centers are consistently this color. Simple, no new dependencies.

---

### 3. Device Aspect Ratio Variance

**Question:** Different treatment per device or uniform?

**Options considered:**
- Uniform for all devices — same `contain` at 100% logic
- Device-specific sizing — different scale percentages per device class

**Decision:** Uniform for all devices. Same logic for Pedal, Neo, Mini, Stream Deck+, MK.2, and XL.

**Rationale:** Predictable. Letterboxing varies naturally by device aspect ratio relative to the logo's ~1.625:1 ratio.

---

### 4. Edge Cases for Tiny Devices

**Question:** Special handling for Pedal (72×72) and Neo (144×72)?

**Options considered:**
- Uniform logic — same `contain` at 100%
- Minimum size floor — keep logo at least 40px tall

**Decision:** Uniform covers it. No minimum size floor, no special casing.

**Rationale:** The logo will be small but intact. Consistent with uniform behavior decision.

## Deferred Ideas

None.

## Agent's Discretion Items

- Constant name for new background color
- Whether to keep existing `STARTUP_LOGO_FULL_PATH` constant (likely unchanged)
- Exact resize width/height values (change from current `88%/36%` to `100%/100%`)
