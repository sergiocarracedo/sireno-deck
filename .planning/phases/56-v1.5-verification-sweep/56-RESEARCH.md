---
phase: 56
name: v1.5 verification sweep
date: 2026-06-10
confidence: HIGH
sources: [codebase-scan]
---

# Phase 56: v1.5 verification sweep — Research

## Don't Hand-Roll

**What to use:** File-relative fixture paths (never cwd-relative). Prior test-failure solutions document this pattern explicitly — see `.planning/solutions/test-failures/cwd-relative-fixture-tests-break-workspace-runs-2026-05-24.md`.

**What to use:** `beforeEach` cleanup in test files that share module-level state. When adding tests to existing files, wrap new tests in separate `describe` blocks with clean `beforeEach` to avoid pre-existing state pollution — see `.planning/solutions/workflow-issues/new-tests-pass-in-isolation-fail-in-full-file-2026-06-04.md`.

**What to use:** The existing VERIFICATION.md pattern from prior phases (55, 54, etc.) — a success-criteria table with evidence paths. Don't create a new format.

## Common Pitfalls

1. **Adding tests to files with pre-existing failures** — New tests that pass in isolation will count toward the failure total if the file already has failing tests. Before adding tests to any file with pre-existing failures, fix the baseline first or isolate new tests in separate files.

2. **Fixture path resolution** — All test fixtures must use source-file-relative paths via `new URL(..., import.meta.url)`, not cwd-relative paths.

3. **Overlay integration tests are the biggest gap** — The Phase 55 verification was manual/code-review based. The runtime overlay lifecycle (processNamesMatch → overlay activation → toggle injection → double-tap dismiss → navigation isolation) has no end-to-end test. This is the highest-risk gap to close.

4. **Stale UAT metadata misrouting** — After gap-closure, all workflow artifacts (UAT.md, VERIFICATION.md, STATE.md, AGENTS.md) must stay consistent. See `.planning/solutions/workflow-issues/stale-uat-gap-metadata-can-misroute-next-after-successful-reruns-2026-05-20.md`.

## Existing Patterns in This Codebase

- **Per-phase VERIFICATION.md** — Success criteria table + requirement coverage + integration checks + gap closure notes. See `55-VERIFICATION.md`, `54-VERIFICATION.md`.
- **Test files colocated with source** — `*.test.ts` alongside implementation files.
- **Domain subdirectories** — Weather tests in `weather/domain/`, button tests in `weather/buttons/`.
- **Device tests** — `device/registry.test.ts`, `device/stream-deck.test.ts`.
- **System tests** — `system/active-app/` directory with its own test files.
- **Runtime tests** — `deck/__tests__/runtime.test.ts` (large file, pre-existing failures).

## Recommended Approach

### Plan Structure (2 plans)

**Plan 56-01: High-priority overlay lifecycle tests (Wave 1)**
Focus on the biggest verification gap: the runtime overlay integration path.
- `processNamesMatch` unit test (currently untested core function in runtime.ts)
- Overlay lifecycle integration test: process name match → overlay activation → toggle button injection → overlay local history isolation → double-tap back dismiss within 350ms
- Multi-addon process_name collision warning test
- All tests in `deck/__tests__/runtime.test.ts` or a new `deck/__tests__/overlay-lifecycle.test.ts`

**Plan 56-02: Medium-priority coverage gaps + sweep document (Wave 1, independent)**
Close the remaining medium-priority gaps across all other areas:
- Weather daily forecast WMO icon rendering test
- Weather imperial unit rendering test
- Bars label_color test and near-gray DOM path test
- Brightness addon button rendering (BrightnessSurface) test
- Generate per-requirement VERIFICATION.md sweep document mapping VERIFY-01 criteria to test evidence

These two plans are independent (Wave 1) — they don't share files or conflict.
