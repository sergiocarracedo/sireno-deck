# Plan 11-02 Summary

**Completed:** 2026-06-27

## What was built

The v0.1.0 CHANGELOG (Keep-a-Changelog format, v0.1.0 only) plus the milestone-shipped ceremony: `ROADMAP.md` row 11 → ✅ done, `STATE.md` → `current_phase: shipped`, `AGENTS.md` → "v0.1.0 ✅ shipped".

## Key files

- `CHANGELOG.md` (new, repo root) — Keep-a-Changelog format. Sections: Added (workspace, config, addon API, deck runtime, WS bridge, vite plugin, React frontend, emulator, hardware, OS providers, themes, 7 built-in addons, daemon lifecycle, HTTP server, npm addon loader, documentation), Changed (unified vite frontend, reserved slot, gesture message), Fixed (cross-button dbl-tap, gesture thresholds, transparent buttons, device model propagation, frame dimensions), Removed (legacy lifecycle hooks, snapshot message, vue-sirendeck surface).
- `.planning/ROADMAP.md` — phase 11 row updated to `✅ done`.
- `.planning/STATE.md` — `current_phase: shipped` + new "Milestone shipped: v0.1.0" section.
- `.planning/AGENTS.md` — Current Phase block → "v0.1.0 ✅ shipped"; next = phase 12.

## Decisions made

- **Keep-a-Changelog format** for compatibility with GitHub Releases, conventional changelog tools, and the user's familiarity with the format.
- **v0.1.0 only, no "Unreleased"** — matches CONTEXT decision. The next version starts a fresh entry.
- **Conventional Commits grouping** — `feat:` → Added, `fix:` → Fixed, `refactor:`/`perf:` → Changed, `docs:`/`chore:`/`test:`/`style:` → dropped (too granular for a v0.1 release doc).
- **Headline features per phase** in the Added section — pulled from `.planning/ROADMAP.md`. One bullet per phase (~12 bullets), not per commit.
- **Removed section** lists things that were removed compared to the legacy v1 — gives context to upgraders.

## Deviations

None. All 4 tasks (CHANGELOG, ROADMAP, STATE, AGENTS) completed as planned.

## Notes for downstream

- The CHANGELOG's date is `2026-06-27` (today). If the user wants to backfill or correct, edit the file directly.
- No version-compare links (no GitHub repo URL assumed).
- Phase 12 (addon-frontend-registry) is the next planned work, already on the roadmap.

## Commits

- `5c0b4b8` — CHANGELOG + milestone-shipped ceremony
