# Phase 10: Deck Reliability, Application Overlays, Config Includes, and Hardware Lifecycle — Discussion Log

**Gathered:** 2026-07-21
**Mode:** deep
**Purpose:** Human audit trail of all options considered and the user's verbatim choices during Phase 10 context gathering. NOT referenced by downstream agents.

---

## Workstream 1 — Image icons missing on first render

### Question 1.1 — Bug origin

**User's verbatim choice:** "Not sure — investigate"

**Options considered:**
1. Frontend mounts before WS handshake completes (recommended) — React renders immediately with empty asset cache, shows fallback.
2. WS connects, deck-config arrives, React renders before `assets` message processed.
3. Hot-reload race — `bridge.onConnection` registered after connection opens.
4. Not sure — investigate (user picked).

**Rationale captured:** User is not certain of the root cause. Planner/researcher must trace the actual code path to confirm before designing a fix.

### Question 1.2 — Fix shape

**User's verbatim choice:** "Block first paint until assets received (Recommended)"

**Options considered:**
1. Block first paint until assets received (recommended) — frontend shows loading state until both deck-config AND assets message processed.
2. Bundle assets into the deck-config message — single WS message, no race.
3. Preload assets via Vite virtual module — bundled in JS.
4. Agent's discretion.

### Question 1.3 — Frontend loading state

**User's verbatim choice:** "Loading skeleton/spinner"

**Options considered:**
1. Black until assets ready (recommended) — minimal visual signal.
2. Loading skeleton/spinner — explicit feedback (user picked).
3. No visual — wait silently — deck shows whatever was last.
4. Agent's discretion.

---

## Workstream 2 — Chrome overlay + active-window detection

### Question 2.1 — Chrome overlay location

**User's verbatim choice:** "External addon at sireno-deck-addons/chrome-overlay (Recommended)"

**Options considered:**
1. External addon at `~/works/opensource/sireno-deck-addons/chrome-overlay/` (recommended) — mirrors vscode/opencode.
2. Builtin in sireno-deck-2 packages — deviates from pattern.
3. Both — external addon + reference in config.

### Question 2.2 — Chrome trigger process names

**User's verbatim choice:** "Chrome family (Recommended)"

**Options considered:**
1. `['chromium', 'chrome', 'chromium-browser', 'google-chrome', 'google-chrome-stable', 'Brave']` (recommended).
2. Just chrome variants — no Brave.
3. Any browser — includes firefox, edge.
4. Agent's discretion.

### Question 2.3 — Chrome button set

**User's verbatim choice:** "New curated set"

**Options considered:**
1. Replace config.yml chrome deck — port existing.
2. New curated set (user picked) — fresh, expanded.
3. Minimal MVP — smallest useful set.
4. Agent's discretion.

### Question 2.4 — Wayland+GNOME window title fix

**User's verbatim choice:** "Extend wayland-gnome to expose window title (Recommended)"

**Options considered:**
1. Extend wayland-gnome to expose window title (recommended) — implement via D-Bus or extension.
2. Document Wayland limitation — no code change.
3. Smarter xdotool/extension fallback — partial fix.
4. Agent's discretion.

### Question 2.5 — Wayland window title mechanism

**User's verbatim choice:** "D-Bus call to org.gnome.Shell (Recommended)"

**Options considered:**
1. D-Bus call to org.gnome.Shell / org.gnome.Mutter (recommended) — pure code change, no extension install.
2. Ship a GNOME Shell extension — most reliable but largest lift.
3. Use wlr-foreign-toplevel-management protocol — only works on wlroots compositors.
4. Agent's discretion.

### Question 2.6 — OpenCode trigger

**User's verbatim choice:** "Window_name only — extend Wayland+GNOME first"

**Options considered:**
1. Keep window_name; add process_name fallback to 'opencode' (recommended) — covers desktop-binary case.
2. Window_name only — accept TUI limitation on Wayland+GNOME.
3. Window_name only — extend Wayland+GNOME first (user picked) — relies on the wayland-gnome fix.
4. Agent's discretion.

---

## Workstream 3 — Nested YAML config includes

### Question 3.1 — Include notation

**User's verbatim choice:** "YAML tag `!include path/to/file.yml` (Recommended)"

**Options considered:**
1. YAML tag `!include path/to/file.yml` (recommended) — idiomatic, parse-time.
2. Plain key `include: path/to/file.yml` — post-parse.
3. Directive `%YAML 1.2\n%INCLUDE ...` — top of file only.
4. Agent's discretion.

### Question 3.2 — Include scope

**User's verbatim choice:** "Top-level + arbitrary subtrees (Recommended)"

**Options considered:**
1. Top-level + arbitrary subtrees (recommended) — max flexibility.
2. Top-level only — simpler.
3. Within arrays only — `!include` items in a list.
4. Agent's discretion.

### Question 3.3 — Merge semantics

**User's verbatim choice:** "Deep merge for objects, concat for arrays (Recommended)"

**Options considered:**
1. Deep merge for objects, concat for arrays (recommended).
2. Last-wins replace.
3. No merging — include replaces.
4. Agent's discretion.

### Question 3.4 — Path resolution

**User's verbatim choice:** "Relative-to-defining-file + absolute paths allowed (Recommended)"

**Options considered:**
1. Relative-to-defining-file + absolute paths allowed (recommended).
2. Relative-only (sandbox to config dir).
3. Relative-only, no parent traversal.
4. Agent's discretion.

### Question 3.5 — Array concat dedupe

**User's verbatim choice:** "Concat + later wins on id collision (Recommended)"

**Options considered:**
1. Concat + later wins on id collision (recommended).
2. Concat as-is, no dedupe.
3. Reject duplicates at parse time.
4. Agent's discretion.

---

## Workstream 4 — Real-hardware startup splash + black shutdown

### Question 4.1 — Splash background

**User's verbatim choice:** "Match shutdown — black background (Recommended)"

**Options considered:**
1. Match shutdown — black background (recommended) — visual continuity.
2. Keep legacy pink #efe3e1.
3. Theme background.
4. Agent's discretion.

### Question 4.2 — Splash path

**User's verbatim choice:** "Bundle logoFull.png into sireno-deck-2; CLI uses its own copy (Recommended)"

**Options considered:**
1. Bundle logoFull.png into sireno-deck-2 (recommended) — file already exists at same relative path; no cross-repo runtime dep.
2. CLI references legacy path via env var / config.
3. Configurable with sensible default.
4. Agent's discretion.

### Question 4.3 — Splash failure mode

**User's verbatim choice:** "Log warn, skip splash, continue (Recommended)"

**Options considered:**
1. Log warn, skip splash, continue (recommended).
2. Fail fast — exit CLI.
3. Fallback to black frame.
4. Agent's discretion.

### Question 4.4 — pushRawImage implementation

**User's verbatim choice:** "Reuse legacy startup-placeholder.ts verbatim (Recommended)"

**Options considered:**
1. Reuse legacy startup-placeholder.ts verbatim (recommended) — sharp + resize + per-key buffer split.
2. Single fillKeyBuffer call with full image.
3. Send raw BMP/PNG via device protocol.
4. Agent's discretion.

### Question 4.5 — Black shutdown scope

**User's verbatim choice:** "Already complete — no extra work (Recommended)"

**Options considered:**
1. Already complete — no extra work (recommended).
2. Also fire on uncaughtException / unhandledRejection.
3. Make pushBlackFrame always-on.
4. Agent's discretion.

---

## Final shared-understanding check

**User's verbatim choice:** "Yes — write CONTEXT.md"

---

*Discussion log generated: 2026-07-21*