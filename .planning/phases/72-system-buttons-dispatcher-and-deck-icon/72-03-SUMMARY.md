---
phase: 72-system-buttons-dispatcher-and-deck-icon
plan: 72-03
wave: 1
depends_on: []
status: executed
---

# 72-03-SUMMARY

## What was built

Gap-closure documentation for 3 UAT gaps diagnosed in Phase 72 verification:

- **Gaps 1+2 (icon path prefix semantics):** Documented that `icon://<name>` selects a built-in Lucide icon name (static glyph), not a custom logo image. Custom logo images use `./<path>`, `addon://`, or `brand://` prefixes. Documented the 4-tier fallback chain (configured icon → first emoji → name initial → `layout-grid`).

- **Gap 3 (2-line SplitActionSurface trigger conditions):** Documented that the 2-line variant requires both a configured overlay deck with `process_names` AND `autoShow: false`. Included a minimal config example showing the pattern.

Documentation was written to both the root `README.md` (Configuration section) and `packages/cli/README.md` (user-facing CLI docs), with corresponding clarifications added to `.planning/REQUIREMENTS.md` and `.planning/ROADMAP.md`.

## Key files

- `README.md` — New "Configuration" section added after Getting Started, documenting icon path prefix resolution, fallback chain, overlay deck icon rule, and 2-line SplitActionSurface trigger conditions with config example.
- `packages/cli/README.md` — Mirrored the same documentation from root README.
- `.planning/REQUIREMENTS.md` — Added documentation clarification notes to BUG-03 and BUG-04 entries.
- `.planning/ROADMAP.md` — Marked all 7 Phase 72 success criteria as ✓, added gap-closure note.

## Decisions made

1. **README.md structure:** Added a new standalone "Configuration" section rather than nesting within an existing section. The existing README had no config documentation section; creating one at the right structural level (after Getting Started, before Built-in Addons) provides a clear home for future config documentation.

2. **packages/cli/README.md mirroring:** The CLI package README already existed with installation/usage docs but no config section. Mirrored the same Content section structure and content for consistency, with appropriate package-specific context.

3. **No downstream doc tasks created:** The addon API docs gap (document that `icon` is in `getDeckPayload` exclusion list) was flagged in 72-01-SUMMARY but is out of scope for this gap-closure. Noted for future phase.

## Verification

- `pnpm --filter sireno-deck-cli test` → **125 failed / 573 passed**. All failures are pre-existing:
  - `start.test.ts` (54-67): `addonRegistry.listButtons is not a function` — missing mock for startDaemon/startEmulatorSession tests.
  - `theme.test.ts` (68-77): `foregroundContrast` / `parseThemeYaml` validation failures — pre-existing theme resolution issues.
  - `runtime.test.ts` (79-123): `addonRegistry.listButtons() is not a function` + `ENOENT` fixture resolution — pre-existing.
  - `weather.test.tsx` (124-127): content assertion failures — pre-existing weather data mismatch.

**Zero new failures from documentation changes.**
