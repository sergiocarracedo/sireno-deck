# Phase 11 — Discussion Log

**Date:** 2026-06-27
**Mode:** standard
**Participants:** user, opencode

## Areas Discussed

### 1. README + docs structure (R-doc)

**Q1: Where should the primary README live?**
- (A) Repo-root README + CLI-level README (recommended) — chosen.
- (B) Just expand `packages/cli/README.md`.
- (C) Both + a `docs/` folder.

**User chose:** A.

**Q2: Per-addon docs: one file per addon or one consolidated file?**
- (A) One README.md per addon (recommended) — chosen.
- (B) One consolidated `builtin-addons/README.md`.
- (C) No per-addon docs.

**User chose:** A.

**Q3: README sections: which audience + which depth?**
- (A) Users + addon authors (recommended) — chosen.
- (B) Users only.
- (C) Full architecture dump.

**User chose:** A.

**Q4: Real working quickstart or stub only?**
- (A) Yes, real example (recommended) — chosen.
- (B) Stub only.
- (C) Link to examples dir only.

**User chose:** A.

### 2. Distribution + pnpm package (R-dist)

**Q1: Should we ship to npm?**
- (A) Keep private + tarball only (recommended).
- (B) Make public + publish to npm.
- (C) Private + GitHub-only release.

**User chose:** "Skip distribution for now" — none of the above. Phase 11 will NOT include npm publish, tarball, or any release ceremony.

**Q2: What does `pnpm package` do?**
- (A) Typecheck + test + lint + format gate (recommended).
- (B) Typecheck + test only.
- (C) No script needed.

**User chose:** "No script needed" — confirms no script.

**Q3: Without npm/pnpm package, what does the release artifact look like?**
- (A) Git tag + repo state (recommended).
- (B) Tarball + checksum, no script.
- (C) GitHub release only.

**User chose:** "Skip" — confirms no artifact, no tag.

**Q4: What does "release v0.1.0" mean for v0.1?**
- (A) Docs as the release (recommended) — chosen.
- (B) Push a tag anyway.
- (C) Don't bump the version.

**User chose:** A. Phase 11 = documentation release. v0.1.0 is the version in package.json; the deliverable is docs.

### 3. CHANGELOG format (R-cl)

**Q1: Keep a CHANGELOG?**
- (A) Yes, hand-written at v0.1.0.
- (B) Auto-generate from `git log` (recommended) — chosen.
- (C) Skip CHANGELOG.

**User chose:** B.

**Q2: Format & location?**
- (A) Keep a Changelog + hand-curate (recommended) — chosen.
- (B) Raw git log.
- (C) Per-phase grouped (Conventional Commits only).

**User chose:** A.

**Q3: Just v0.1.0, or backfill older versions?**
- (A) v0.1.0 only (recommended) — chosen.
- (B) Unreleased + v0.1.0.
- (C) Backfill phases 01-10.

**User chose:** A.

**Q4: CHANGELOG link references?**
- (A) No version compare links (recommended) — chosen.
- (B) GitHub compare link.

**User chose:** A.

### 4. Version + git tag (R-tag)

User confirmed all decisions in area 2 collapsed to "Docs as the release" (no tag). Single confirmation question answered: "All decisions captured".

## Areas Delegated to Agent's Discretion

- Exact README sections + length (don't pad).
- Whether to include a "Why sireno-deck-2?" intro at the top.
- Whether to include a screenshot (skip unless trivial).
- Exact CHANGELOG date format (ISO `YYYY-MM-DD` is conventional).

## Deferred Ideas (captured in CONTEXT.md)

- Public npm publish.
- Tarball release (`pnpm package`).
- Git tag `v0.1.0`.
- GitHub Releases with notes.
- API reference docs (typedoc / api-extractor).
- Tutorial / cookbook (long-form usage examples).
- Architecture diagrams.
