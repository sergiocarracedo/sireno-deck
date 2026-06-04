# Phase 39: Themable Media Player Surface - Discussion Log

**Date:** 2026-06-04
**Mode:** standard

## Gray Areas Discussed

### 1. Override Registration Mechanism

**Question:** How should theme-provided Surface components be registered/discovered?

**Options considered:**
1. **Manifest entry (Recommended)** — Themes add `mediaPlayer: { surface: './components/MediaPlayerSurface.tsx' }` to manifest. Runtime loads it as a separate module. Explicit and traceable.
2. **Convention-based lookup** — Media-player addon checks for a `surface.tsx` file in the active theme package root at startup. Auto-discovered, convention-based.
3. **Core component registry API** — Addons call a new core API like `theme.getComponent('media-player', 'Surface')`. Theme registers components via `theme.registerComponent()`.

**User choice:** Manifest entry (Recommended)

**Rationale:** Manifest-driven matches existing theme contract (buttonFrame, stylesheet assets). Explicit and traceable, no magic.

---

### 2. Surface Component Contract

**User context (received before options):** "the addon surface acts as a fallback if the theme doesn't define an override"

**Question:** What should the Surface component contract be?

**Options considered:**
1. **Raw snapshot + config (Recommended)** — Theme Surface receives raw `MediaControllerSnapshot` + button config. Theme extracts whatever it needs. Built-in Surface stays as a fallback that receives the same shape.
2. **Full props contract** — Theme Surface must accept `title, artist, source, progress, status, time` — same as built-in Surface. Themed and built-in must match exactly.
3. **Title/artist only** — Theme Surface only needs title and artist. Other fields are optional, themes decide. Built-in still gets all fields.

**User choice:** "a theme override component gets the same as the Surface.tsx component in the addon"

**Rationale:** The theme override Surface receives the same props as the built-in `Surface.tsx` (title, artist, source, progress, status, time). Both share the same prop interface — themes compose their own layout but accept all six props.

---

### 3. Override Resolution Priority

**Question:** How should override resolution prioritize theme vs built-in?

**Options considered:**
1. **Manifest-driven, no opt-out (Recommended)** — If the active theme's manifest declares `mediaPlayer.surface`, use it. Otherwise, fall back to the built-in `Surface.tsx`. No opt-out for theme — declaring it means using it.
2. **Manifest + opt-out flag** — Theme can declare `mediaPlayer.surface` and additionally set `use_builtin: true` to force the built-in Surface. Adds a flag, gives theme authors an escape hatch.
3. **Per-render lookup** — Resolution happens at render time: addon checks theme each render and falls back if missing. Caches result. Same outcome as static resolution, but lazily resolved.

**User choice:** Manifest-driven, no opt-out (Recommended)

**Rationale:** Once a theme declares the override, the built-in is not used. Resolution is once at theme load, not per render. Simple, predictable.

---

## Areas Delegated to Agent's Discretion

- Exact manifest schema location (top-level vs nested) — agent decides what fits existing theme manifest shape
- Path resolution mechanism (theme-relative vs absolute) — agent follows existing theme asset conventions
- Error handling for invalid theme Surface (missing props, render error) — agent decides failure UX
- Whether to validate the theme Surface at theme load time (type check) or at first render

---

## Deferred Ideas

None — discussion stayed within phase scope.
