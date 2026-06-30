# Phase 11: release - Context

**Gathered:** 2026-06-27
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Ship the v0.1.0 documentation release: a real, working README at the repo root that gives new users a working quickstart and addon authors a pointer into per-addon docs. One README.md per builtin addon. A Keep-a-Changelog `CHANGELOG.md` summarizing v0.1.0 only. **No npm publish, no tarball, no git tag, no `pnpm package` script** — the user explicitly deferred distribution. v0.1.0 is the version in `package.json`; the deliverable is docs. Mark v0.1.0 as shipped in `ROADMAP.md` + `STATE.md`.

</domain>

<decisions>
## Implementation Decisions

### R-doc — README structure

- **Repo-root `README.md`** is the primary README. Replaces the stub at `packages/cli/README.md` (which currently says "Phase 0 scaffold").
- **Two audiences**: users + addon authors.
  - **Users** get: install, `sireno run --emulator` quickstart, a real copy-pasteable `config.yml` snippet (10-15 lines) showing a deck with several button types, troubleshooting / FAQ if needed.
  - **Addon authors** get: a `## For addon authors` section linking to each per-addon README + a pointer to the addon API (`packages/cli/src/addon/api.ts`).
- **`packages/cli/README.md`** is kept but trimmed to CLI-internal details (dev workflow, scripts, architecture).

### R-doc — Per-addon docs

- **One `README.md` per builtin-addon directory**: `packages/cli/src/builtin-addons/{addon}/README.md`. Each lists:
  - The button types it provides (e.g., `core:time`, `core:date`, `core:clock`, `core:analog-clock`, `core:date-time`, `core:locked-time-tile` for date-time).
  - The config schema, with a copy-pasteable YAML snippet.
  - A short example showing the button in context.
  - A "See also" link to related addons (e.g., weather → value-display for the formatter chain).
- **10 addons to document**: `core-buttons`, `internal-settings`, `session`, `date-time`, `emoji-selector`, `media-player`, `system-status`, `value-display`, `weather`, `brightness`. (`core-buttons` is internal-only; mark as such in its README.)

### R-dist — Distribution

- **No `pnpm package` script**. (User: "No script needed".)
- **No tarball, no npm publish, no GitHub release**. (User: "Skip" / "Skip distribution for now".)
- **No git tag `v0.1.0`**. (User: "Skip".)
- **Version stays `0.1.0` in `package.json`**. The release is "the docs say v0.1.0 is shipped". Marking it shipped in ROADMAP + STATE is the deliverable ceremony.

### R-cl — CHANGELOG

- **`CHANGELOG.md` at repo root**, Keep-a-Changelog format (Added / Changed / Fixed / Removed sections).
- **v0.1.0 only**. No "Unreleased" section. No backfill of older dev versions.
- **Auto-generate from `git log`** between the start of the project (no prior tag) and HEAD, grouped by Conventional Commit `type:` prefix (`feat` / `fix` / `docs` / `chore` / `refactor` / `test`). Hand-curate the result for clarity (merge small commits, drop noise).
- **No version-compare links** (no GitHub repo URL assumed for v0.1.0).

### Agent's Discretion

- The exact README sections + length (use whatever feels balanced; don't pad).
- Whether to put a "Why sireno-deck?" intro at the top (probably yes, 2-3 sentences).
- Whether to include a small `assets/` directory with a screenshot (skip unless trivial; agent's call).
- The exact date format in CHANGELOG (ISO `YYYY-MM-DD` is conventional).

</decisions>

<specifics>
## Specific Ideas

- The README's copy-pasteable `config.yml` should reflect what real users actually want — a mix of `core:time`, `core:date`, `core:weather`, `core:action`, `core:system-status`, `core:change-deck` — covering most of the README's examples.
- Each per-addon README should be self-contained: someone reading just that one file knows what the addon does and how to configure it.
- The CHANGELOG's "Added" section should be a short list of headline features per phase. The "Changed" / "Fixed" sections can be lighter (mostly infra improvements).

## No specific requirements — open to standard approaches

- The README's exact wording, length, and visual layout.
- The per-addon README template (sections like "Buttons", "Config", "Example", "See also").

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/README.md` — the existing stub. Replace, don't preserve.
- `packages/cli/package.json` — already at `version: "0.1.0"`. Don't change.
- `packages/cli/src/builtin-addons/*/index.ts` and `schemas.ts` — source of truth for each addon's button types + config shape. Read these before writing each per-addon README.
- `packages/cli/src/addon/api.ts` — the addon author API. The `## For addon authors` section of the root README links here.
- `.planning/PROJECT.md` — the original v0.1.0 requirements (R1-R20). The CHANGELOG's "Added" section pulls headlines from here.
- `.planning/ROADMAP.md` — the 11-phase plan. After the docs are written, mark the row for phase 11 as `✅ done`.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`packages/cli/src/addon/api.ts`** — the addon API surface (`AddonButtonTypeDefinition`, `AddonDeckDefinition`, `AddonManifest`). Use as the anchor for the `## For addon authors` section.
- **All 10 builtin addons are implemented and tested (464 tests passing).** Per-addon READMEs document existing behavior — no code changes required.
- **`config2.yml` at the repo root** — a minimal valid config (just one button). Could be used as the README's first example, but the user wants a richer 10-15 line example.

### Established Patterns

- **No `dist/` artifacts in the repo** — the README doesn't need a "Published on npm" section since the package is private.
- **The CLI uses yargs for `--help` output** — the README's `sireno run --help` example can show the actual flags (`--emulator`, `--dev`, `--config`, `--device-model`, `--port`).
- **The daemon's runtime dir is `$XDG_RUNTIME_DIR/sireno-deck/`** — document this in the README's "How it works" section so users can find the pid/token files for debugging.

### Integration Points

- **The root README** is rendered by GitHub / GitLab / package registries on first visit. It should not assume the user has cloned the repo.
- **Each per-addon README** lives next to its source code. Future addon authors reading the source will see the README first.
- **CHANGELOG.md** is rendered by GitHub releases, package registries, and tools like `git-cliff`. Stick to Keep-a-Changelog format for compatibility.

</code_context>

<deferred>
## Deferred Ideas

- **Public npm publish** — explicit "Skip" per user. Future phase (probably v1.0).
- **Tarball release (`pnpm package`)** — explicit "Skip" per user. Future phase.
- **Git tag `v0.1.0`** — explicit "Skip" per user. Future phase (probably with the first tarball/npm release).
- **GitHub Releases with notes** — out of scope; can be done at the repo's discretion.
- **API reference docs (typedoc / api-extractor)** — separate docs phase.
- **Tutorial / cookbook (long-form usage examples)** — separate docs phase.
- **Architecture diagrams** — separate docs phase.

</deferred>

---

_Phase: 11-release_
_Context gathered: 2026-06-27_
