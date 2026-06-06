# Roadmap — Sireno Deck

**Version:** v1.4 — Addons & UX Polish (scope cut 2026-06-05: distribution removed)
**Milestone goal:** Expand the bundled addon surface and add the system-reserved back button for subdeck navigation. Distribution work (Phases 40, 47, 48) deferred to v1.5 — Node SEA is architecturally incompatible with the codebase's native bindings. v1.4 scope is six phases (41-46).
**Last updated:** 2026-06-05

## Milestone Summary

v1.4 ships first-run Chromium auto-install, a system-reserved back button in subdecks, and three bundled-addon additions: calendar date-time, weather, and media-volume (mute + up/down). Emoji-selector paginates large categories.

The work splits into six vertical slices: a cross-cutting core change (system-reserved button + first-run UX), then four user-facing feature addons, then the multi-page emoji selector. v1.4 has no distribution work — the dev install path is `git clone && pnpm install`, and the bundled `dist/` artifact is the ship target for v1.5.

## Phases

### ~~Phase 40: Distribution Build Pipeline~~ — Cut from v1.4 (deferred to v1.5)

**Original goal:** Build the CLI as a standalone Node SEA executable and wire the output to `/works/test/test-sireno-deck`.
**Cut rationale (2026-06-05):** Node SEA cannot snapshot this codebase. `node --build-sea` was Node 23 experimental and never landed in Node 22/24 LTS. The real two-step flow (`--experimental-sea-config` + `postject`) cannot load code with native bindings. The project imports `@elgato-stream-deck/node` (node-hid), `sharp` (libvips), `playwright` (chromium), and `dbus-next` (x11) — none survive V8 snapshotting. See `.planning/solutions/build-errors/node-sea-not-viable-for-native-deps-2026-06-05.md`.
**Requirements moved to v1.5:** `BD-01`, `BD-02`

### Phase 41: First-Run Chromium Auto-Install ✓ Complete (2026-06-04)

**Goal:** Detect missing Playwright Chromium on first CLI run and auto-install via `npx playwright install chromium`.
**Requirements:** `BD-03`, `BD-05`
**Status:** [x] ✓ Complete (2026-06-04)

### Phase 42: System-Reserved Back Button ✓ Complete (2026-06-04) — helper + validation + component shipped; runtime integration via gap-closure plan

**Goal:** Hard-reserve the last key slot in every deck. Main deck shows nothing; subdecks show a core-owned back button (tap → previous, hold → home).
**Requirements:** `SRB-01`, `SRB-02`, `SRB-03`, `SRB-04`, `SRB-05`
**Depends on:** 41
**Status:** [x] ✓ Complete (2026-06-04) — validation + component + helper shipped; runtime wiring deferred (needs separate design for hostedButtons pipeline)

### Phase 43: Calendar Date-Time Button ✓ Complete (2026-06-04)

**Goal:** Add a new `date` button type to the built-in `date-time` addon with vertical month/day/weekday layout.
**Requirements:** `CAL-01`, `CAL-02`, `CAL-03`
**Depends on:** 42
**Status:** [x] ✓ Complete (2026-06-04) — replaced `calendar-sheet` stub with real `date` button, configurable timezone + locale, 60s refresh

### Phase 44: Media-Volume Buttons ✓ Complete (2026-06-04)

**Goal:** New `media-volume` button type (separate from `media-player`) with mute toggle, volume up, and volume down variants. Detects real mute state.
**Requirements:** `MV-01` through `MV-07`
**Depends on:** 42
**Status:** [x] ✓ Complete (2026-06-04)

### Phase 45: Weather Addon ✓ Complete (2026-06-04)

**Goal:** New bundled `weather` addon mirroring media-player shape (controller, surface, button, schema, addon registration). Open-Meteo as the primary backend (free, no key, WMO codes), wttr.in as the fallback. Honest "not available" state for unsupported OS / no network.
**Requirements:** `WX-01`, `WX-02`, `WX-03`, `WX-04`, `WX-05`, `WX-06`
**Depends on:** 42
**Status:** [x] ✓ Complete (2026-06-04)

### Phase 46: Emoji-Selector Multi-Page ✓ Complete (2026-06-06)

**Goal:** Paginate emoji-selector categories that overflow the deck, with prev/next navigation buttons.
**Requirements:** `EMO-01` through `EMO-05`
**Depends on:** 42
**Success criteria:**
- [x] `createDecks` refactor to compute per-category pages: `keyCount - reserved - 2` user slots per page
- [x] New `prev` / `next` `change-deck` buttons per page
- [x] Back button repositioned to the system-reserved last slot
- [x] Per-category pagination (each category starts on page 1, not global)
**Research needed:** No (covered by v1.4 research)
**Status:** [x] ✓ Complete (2026-06-06) — 6 categories shipped (12-16 emojis each), pagination with `change-deck` prev/next at positions 12/13, system back at 14, 11/11 emoji-selector tests pass. UAT surfaced two gaps: multi-page `target_deck` (closed by 46-03) and pre-existing SRB-03 system-back injection half (closed by 46-04). Verification re-confirmed.

### ~~Phase 47: CI Matrix Builds for Linux + Mac~~ — Cut from v1.4 (deferred to v1.5)

**Original goal:** GitHub Actions matrix builds produce executables for Linux x64, Linux arm64, and Mac arm64 on every release.
**Cut rationale:** Was predicated on Phase 40's SEA artifact. With Phase 40 deferred, the CI matrix has no artifact to build. The honest v1.5 question is: "what artifact does CI build?" — native binary? Bun compile? tarball? — and that decision is part of v1.5 planning.
**Requirements moved to v1.5:** `BD-04`

## Coverage Check

| Requirement | Phase    | Status |
|-------------|----------|--------|
| BD-01       | v1.5     | Deferred from v1.4 (Phase 40 cut) |
| BD-02       | v1.5     | Deferred from v1.4 (Phase 40 cut) |
| BD-03       | 41       | ✓ Complete |
| BD-04       | v1.5     | Deferred from v1.4 (Phase 47 cut) |
| BD-05       | 41       | ✓ Complete |
| SRB-01      | 42       | ✓ Complete |
| SRB-02      | 42       | ✓ Complete |
| SRB-03      | 42       | ✓ Complete |
| SRB-03a     | 42       | ✓ Complete |
| SRB-03b     | 42       | ✓ Complete |
| SRB-04      | 42       | ✓ Complete |
| SRB-05      | 42       | ✓ Complete |
| CAL-01      | 43       | ✓ Complete |
| CAL-02      | 43       | ✓ Complete |
| CAL-03      | 43       | ✓ Complete |
| MV-01       | 44       | ✓ Complete |
| MV-02       | 44       | ✓ Complete |
| MV-03       | 44       | ✓ Complete |
| MV-04       | 44       | ✓ Complete |
| MV-05       | 44       | ✓ Complete |
| MV-06       | 44       | ✓ Complete |
| MV-07       | 44       | ✓ Complete |
| WX-01       | 45       | ✓ Complete |
| WX-02       | 45       | ✓ Complete |
| WX-03       | 45       | ✓ Complete |
| WX-04       | 45       | ✓ Complete |
| WX-05       | 45       | ✓ Complete |
| WX-06       | 45       | ✓ Complete |
| EMO-01      | 46       | ✓ Complete |
| EMO-02      | 46       | ✓ Complete |
| EMO-03      | 46       | ✓ Complete |
| EMO-04      | 46       | ✓ Complete |
| EMO-05      | 46       | ✓ Complete |
| EMO-06      | 49       | Not started (next) |
| EMO-07      | 49       | Not started (next) |
| EMO-08      | 49       | Not started (next) |
| EMO-09      | 49       | Not started (next) |
| EMO-10      | 49       | Not started (next) |
| EMO-11      | 49       | Not started (next) |
| EMO-12      | 49       | Not started (next) |
| EMO-13      | 49       | Not started (next) |
| EMO-14      | 49       | Not started (next) |

### ~~Phase 48: Build and Install Documentation~~ — Cut from v1.4 (deferred to v1.5)

**Original goal:** Ship end-user and developer documentation for the v1.4 standalone binary.
**Cut rationale:** Was predicated on Phase 40's SEA artifact. README is already truthful about the dev install path (`git clone && pnpm install`). End-user install documentation needs a real distribution target, which is a v1.5 question.

### Phase 49: Emoji-Selector UX Revamp — Added 2026-06-06 (v1.4 late addition)

**Goal:** Rewrite the emoji-selector based on real-world Stream Deck usage feedback so each emoji category is a navigable subdeck with proper pagination, real-emoji rendering (no U+1Fxxx placeholders), bigger key-art, and HID keyboard-stroke output (tap = emoji, double-tap = shortcode). Ship a new addon-provided entry button that shows a 2×3 grid of six emojis so the user discovers the addon's affordance without authoring boilerplate.
**Requirements:** `EMO-06` through `EMO-14` (to be assigned at plan-phase)
**Depends on:** Phase 46 (current emoji-selector base)
**Status:** [ ] Not started

User feedback driving this phase:
- Subdeck back button must return all the way home (currently bounces one level — surface the system back wiring on subdecks for the emoji case).
- Tap should send the emoji to the host via an HID keyboard stroke; double-tap should send the emoji's shortcode (e.g. `:fire:`) via the same HID path.
- Emoji glyphs render as `U+1Fxxx` placeholders in the browser — must render real platform emoji glyphs (browser font stack, e.g. `Apple Color Emoji`, `Segoe UI Emoji`, `Noto Color Emoji`).
- Emoji key art should be much larger on the button (full-surface or near-full-surface, not a small icon in a card).
- Subcategories must be split (e.g. "Smileys and People" → "Smileys" + "People") and the category list sourced from a real emoji catalog (`piliapp.com/emoji/list/`), not a hand-rolled one.
- Pagination: the `n-2` button on each page is the page nav — tap = next, double-tap = previous — and a `Chip` overlay shows "Tap" / "Dbl Tap" hints.
- The main emoji entry button (the one on a parent deck that jumps into the emoji main deck) is provided by the addon as a first-class button type, not a config-authored button. Its render is a 2×3 grid of six emojis (see attached reference image).

**Research needed:** Yes — emoji catalog sourcing, HID keyboard-stroke output (`@elgato-stream-deck/node` capabilities or a separate HID path), and the browser-side font stack for real emoji glyphs.

### Plans
*Not yet planned — run `plan-phase 49`*

### v1.5 Backlog (informational)

These phases are deferred from v1.4 and queued for v1.5 planning:

- **Phase 40 (re-scope)** — Distribution Build Pipeline. v1.5 must first decide the distribution target (native FFI binary / Bun compile / npm distribution / pkg) before re-planning.
- **Phase 47 (re-scope)** — CI Matrix Builds. Depends on the v1.5 distribution decision.
- **Phase 48 (re-scope)** — Build & Install Documentation. Depends on the v1.5 distribution decision.

### Plans
*Phase 46 complete with gap-closure plans 46-03 and 46-04 executed and verified. v1.4 milestone complete.*
