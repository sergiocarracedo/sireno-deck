---
phase: 11-release
status: researched
date: 2026-06-27
---

# Phase 11 — Research

## Keep-a-Changelog format

**Decision:** Follow https://keepachangelog.com (the canonical "Keep a Changelog" format).

**Confidence: HIGH** — standard format, well-known.

**Structure:**
```
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [0.1.0] - 2026-06-27

### Added
- ...

### Changed
- ...

### Fixed
- ...

### Removed
- ...
```

**Section ordering:** Added → Changed → Fixed → Removed (the order they appear in the format spec).

## Conventional Commits grouping

**Decision:** Group commits by `type:` prefix:
- `feat:` → "Added" (or "Changed" if significant enough)
- `fix:` → "Fixed"
- `refactor:` → "Changed"
- `perf:` → "Changed"
- `docs:` → drop (or mention in a single line at the top if cumulative)
- `chore:` → drop
- `test:` → drop
- `style:` → drop

**Confidence: HIGH** — the project's commit history follows Conventional Commits (every commit is `feat(phase-...)` / `fix(...)` / `docs(...)` / `chore(...)` / `refactor(...)` etc).

## README structure (root)

**Decision:** Match the legacy `sireno-deck` README structure roughly, but rewrite for v2:

```
# sireno-deck-2

[1-paragraph why]

## Quick start

[install + first command]

## config.yml example

[10-15 line copy-pasteable]

## CLI

[command reference]

## How it works (optional)

[brief architecture]

## For addon authors

[link to per-addon READMEs + addon API]

## License

[MIT or whatever]
```

**Confidence: HIGH** — standard README structure.

## Per-addon README template

**Decision:** One file per addon. Sections:

```
# {addon-name}

[1-paragraph what it does]

## Buttons

| Type             | Description        |
| ---------------- | ------------------ |
| `core:foo`       | ...                |
| `core:bar`       | ...                |

## Config

[per-button YAML example]

## Example

[real config.yml snippet using the addon]
```

**Confidence: HIGH** — matches how legacy per-addon docs are written.

## CHANGELOG entries by phase

**Phase headlines** (pulled from `.planning/ROADMAP.md`):

- **01 scaffold** — workspace, TS 7.0 RC, oxlint/oxfmt, vitest, yargs, pino, daemon helpers
- **02 config-addons** — config.yml zod schemas, YAML loader, `@file.yml` expander, addon registry
- **03 deck-runtime** — pub-sub, gesture state machine (tap/dbl-tap/hold), store, deck runtime, 3 core addons
- **04 ws-frontend** — WS bridge v3 with token handshake, vite plugin, React 19 + Tailwind 4 frontend
- **05 emulator** — emulator shell with iframe-to-frontend vite, mouse-to-gesture, device models (mk2/plus/mini/xl)
- **06 hardware** — Playwright render pipeline, device enumeration + interactive prompt, udev rules
- **07 os-providers** — Linux (dbus-next, playerctl, gnome-shell), macOS (osascript), Windows (PowerShell + UIA)
- **08 builtin-themes** — themes/default + themes/light, Tailwind 4 tokens, ButtonFrame + 4 surfaces
- **09 builtin-addons** — 7 addons: date-time, emoji-selector, media-player, system-status, value-display, weather, brightness
- **10 daemon-polish** — daemon PID + token + children files, Node http server with token injection, npm addon loader (R19)
- **11 release** — root README + per-addon READMEs + CHANGELOG

**Confidence: HIGH** — pulled directly from the roadmap.

## File layout

```
README.md                                      # NEW (root)
CHANGELOG.md                                   # NEW (root)
packages/cli/README.md                         # TRIM (CLI-internal only)
packages/cli/src/builtin-addons/core-buttons/README.md          # NEW
packages/cli/src/builtin-addons/internal-settings/README.md    # NEW
packages/cli/src/builtin-addons/session/README.md               # NEW
packages/cli/src/builtin-addons/date-time/README.md             # NEW
packages/cli/src/builtin-addons/emoji-selector/README.md        # NEW
packages/cli/src/builtin-addons/media-player/README.md          # NEW
packages/cli/src/builtin-addons/system-status/README.md         # NEW
packages/cli/src/builtin-addons/value-display/README.md         # NEW
packages/cli/src/builtin-addons/weather/README.md               # NEW
packages/cli/src/builtin-addons/brightness/README.md            # NEW
```

10 per-addon READMEs + root README + trimmed CLI README + CHANGELOG = 13 new docs.

## Tests / verification

No code tests (it's docs). Verification:
- Every per-addon README references the button types exported by its `index.ts` (cross-check via `grep`).
- The root README's `config.yml` example actually parses against the schema (run `pnpm exec tsx -e "loadConfig({ configPath: '...' })"` on the example).
- The CHANGELOG renders correctly on GitHub.

## Risks

1. **CHANGELOG bloat** — if we include every commit, the file gets long. Mitigation: curate aggressively; one bullet per logical change, not per commit.
2. **Per-addon drift** — if the addon's `index.ts` changes after the README is written, the README goes stale. Mitigation: link the README's button table to the schema file; add a note "for the latest schema, see `schemas.ts`".
3. **The user might want a different style** — the agent will follow standard practice; deviations acceptable per agent's discretion in CONTEXT.md.
