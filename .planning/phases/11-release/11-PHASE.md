---
phase: 11-release
status: not-started
depends_on: [10-daemon-polish]
---

# Phase 11 — Docs + Release

Goal: ship v0.1.0.

## Outcomes

1. `README.md` at repo root — what it is, install, quick start, config example, addon authoring example.
2. `packages/cli/README.md` — CLI usage, all flags, OS-specific notes.
3. `docs/` — themes, addons, protocol v3, hardware matrix, troubleshooting.
4. `CHANGELOG.md` — v0.1.0 entries.
5. `pnpm package` script — produces a tarball for npm publish (if applicable; may be deferred to v0.2).
6. Tag `v0.1.0` in git.

## Constraints

- No code changes — docs only. Any change request becomes a follow-up phase.
- Validate all code examples in docs against actual CLI behavior (use `agent-browser` or manual smoke test).
