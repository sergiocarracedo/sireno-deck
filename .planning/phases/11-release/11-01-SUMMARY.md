# Plan 11-01 Summary

**Completed:** 2026-06-27

## What was built

The v0.1.0 documentation: a repo-root README that gives new users a working quickstart + copy-pasteable `config.yml` + CLI reference + addon-author pointer. Ten per-addon READMEs (one per builtin addon) documenting button types, config schema, and a real working example. The existing `packages/cli/README.md` is trimmed from a Phase-0 scaffold stub to CLI-internal architecture details.

## Key files

- `README.md` (new, repo root) — title + why + quickstart + 11-line `config.yml` example + CLI reference + how-it-works + addon-author list + license.
- `packages/cli/README.md` (trimmed) — scripts + layout + conventions. Points to the root README for user-facing content.
- `packages/cli/src/builtin-addons/core-buttons/README.md` (new) — `core:action`, `core:change-deck` + the internal `core:toggle`/`core:media-sample`.
- `packages/cli/src/builtin-addons/internal-settings/README.md` (new) — auto-generated `settings` overlay deck.
- `packages/cli/src/builtin-addons/session/README.md` (new) — `session:locked` overlay deck.
- `packages/cli/src/builtin-addons/date-time/README.md` (new) — 6 button types with config schemas + example.
- `packages/cli/src/builtin-addons/emoji-selector/README.md` (new) — auto-generated decks; 8 categories; favorites.
- `packages/cli/src/builtin-addons/media-player/README.md` (new) — single split-action button; per-OS provider notes.
- `packages/cli/src/builtin-addons/system-status/README.md` (new) — 7 metric types (CPU, RAM, swap, fan, uptime, battery, load avg) with config.
- `packages/cli/src/builtin-addons/value-display/README.md` (new) — run shell commands; 3 formatters (`raw`, `strip`, `line`).
- `packages/cli/src/builtin-addons/weather/README.md` (new) — Open-Meteo; WMO codes; 10-min poll.
- `packages/cli/src/builtin-addons/brightness/README.md` (new) — OS-native brightness; tap/hold semantics.

## Decisions made

- **One README per addon** — keeps each file short (~50-80 lines) and self-contained. Cross-references via "See also" links.
- **Buttons table** at the top of each addon README maps `core:type` → description. The exact button types match the addon's `index.ts` exports.
- **Example section** at the bottom shows the addon in a real `config.yml` context. Re-uses the pattern from the root README's `config.yml` example where possible.
- **Root README is users-first**: the addon-author section is a single block with links to each per-addon README.
- **No screenshots / diagrams** in v0.1.0. Per CONTEXT: "Whether to include a screenshot (skip unless trivial; agent's call)" — skipped because no pre-existing screenshots and generating them isn't worth the time.

## Deviations

None. All 4 tasks (root README, trimmed CLI README, 10 addon READMEs, verification) completed as planned.

## Notes for downstream

- The README's `config.yml` example is a copy-pasteable starting point. It uses `core:time`, `core:date`, `core:weather`, `core:action`, `core:system-status`, `core:change-deck`. The user's actual `config.yml` at the repo root is richer (11 buttons); consider updating the README example to match if it grows further.
- Each per-addon README links to `schemas.ts` for the canonical config shape. If a schema changes, the README goes stale; per CONTEXT, this is acceptable (the addon API itself is the source of truth, and the READMEs are summaries).
- The trimmed `packages/cli/README.md` references the root README instead of duplicating content.

## Commits

- `3f7a47a` — repo-root README + trimmed CLI README
- `8abd863` — 10 per-addon READMEs
