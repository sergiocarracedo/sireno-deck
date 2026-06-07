# Roadmap — Sireno Deck

**Version:** v1.5 — Distribution Build Pipeline (re-scope pending)
**Milestone goal:** Build and ship a distributable Sireno binary. v1.5 must first decide the distribution target (native FFI binary / Bun compile / npm distribution / pkg) before re-planning Phases 40, 47, 48.
**Last updated:** 2026-06-07

---

## Completed Milestones

### v1.4 — Addons & UX Polish
Completed 2026-06-07. 7 phases (41-46, 49), 35 requirements delivered. See `.planning/milestones/v1.4-ROADMAP.md` for full details.

Bundled addons shipped: first-run Chromium auto-install, system-reserved back button, calendar date-time, media-volume (mute/up/down), weather (Open-Meteo + wttr.in fallback), emoji-selector with real emoji rendering and paginated categories.

### v1.3 — Content Helpers, System Status, and Media
Completed 2026-05-28. See `.planning/milestones/v1.3-ROADMAP.md` for full details.

### v1.2 — Phase 30 Execution + Phase 31 CLI Dev Watch
Completed 2026-05-22. See `.planning/milestones/v1.2-ROADMAP.md` for full details.

---

## v1.5 Backlog (queued for planning)

- **Phase 40 (re-scope)** — Distribution Build Pipeline. v1.5 must first decide the distribution target before re-planning. Node SEA is not viable (incompatible with native deps). See `.planning/solutions/build-errors/node-sea-not-viable-for-native-deps-2026-06-05.md`.
- **Phase 47 (re-scope)** — CI Matrix Builds. Depends on the v1.5 distribution decision.
- **Phase 48 (re-scope)** — Build & Install Documentation. Depends on the v1.5 distribution decision.

### v1.5 Requirements (draft — to be finalized)

| REQ-ID | Description | Phase | Status |
|--------|-------------|-------|--------|
| BD-01 | Build pipeline produces standalone executables (Linux x64/arm64, Mac arm64) | 40 | deferred — distribution target TBD |
| BD-02 | Output written to configurable path outside repo | 40 | deferred |
| BD-03 | Auto-install Playwright Chromium on first run | 41 | ✓ satisfied (v1.4) |
| BD-04 | CI matrix builds for Linux + Mac | 47 | deferred |
| BD-05 | Clear "ready to run" UX (no bundled Chromium) | 41 | ✓ satisfied (v1.4) |

**Note:** BD-03 and BD-05 were completed in v1.4 (Phase 41). The remaining BD-* requirements depend on the v1.5 distribution target decision.