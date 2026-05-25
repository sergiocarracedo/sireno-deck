---
phase: 23
status: passed
verified: 2026-05-25
---

# Phase 23: JSX/TSX Addon Authoring + Startup Placeholder — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 23-01 | `packages/cli/src/addon/loader.ts` accepts local manifest entries through the new local raw-source path while preserving the existing non-local/built-JS path | ✓ |
| 23-01 | A committed Phase 23 fixture points `sirenoAddon.main` at raw `.tsx` source with sibling relative imports and root-export-only authoring helpers | ✓ |
| 23-01 | `rtk vitest run src/addon/loader.test.ts src/cli/commands/start.test.ts` passes from `packages/cli` with raw-source startup coverage | ✓ |
| 23-02 | `packages/cli/src/render/startup-placeholder.ts` exists and exports the startup placeholder buffer helper | ✓ |
| 23-02 | `packages/cli/src/cli/commands/start.ts` writes the placeholder before the first real browser-backed deck capture and stops using it after the first real render succeeds | ✓ |
| 23-02 | `rtk vitest run src/cli/commands/start.test.ts` behavior is covered inside the focused phase verification run, including placeholder write-order and failure-boundary tests | ✓ |
| 23-03 | `packages/cli/fixtures/phase-23/config.yml` now references the raw addon's real registered button definition id instead of `phase-23-local-raw-addon` | ✓ |
| 23-03 | Focused startup/config coverage proves the shipped Phase 23 sample config loads the raw addon fixture through the normal startup path with the corrected button type | ✓ |
| 23-03 | UAT and verification artifacts preserve the original failed evidence and point rerun work at `23-03-PLAN.md` | ✓ |
| 23-04 | `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx` routes rendered output through the helper-based root-export contract again instead of raw JSX that depends on ambient React | ✓ |
| 23-04 | Focused startup/runtime coverage proves the shipped Phase 23 sample config reaches valid renderable button output without `React is not defined` | ✓ |
| 23-04 | UAT and verification artifacts preserve the rerun failure evidence and point the next rerun at `23-04-PLAN.md` | ✓ |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| Post-roadmap scope | Local raw-source addon startup via `sirenoAddon.main`, root-export-only TSX authoring, and branded hardware startup placeholder | ✓ |

Phase 23 is post-roadmap follow-on work, so no new `SCS-*` requirement IDs were assigned in `REQUIREMENTS.md`.

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/addon/loader.ts` → `tsx/esm/api#tsImport` | `tsImport` is imported and used for local transpiled-source addon loading | ✓ |
| `packages/cli/src/cli/commands/start.ts` → `../../render/startup-placeholder.js#createStartupPlaceholderBuffers` | `createStartupPlaceholderBuffers` is exported and consumed by the startup path | ✓ |
| `packages/cli/src/cli/commands/start.test.ts` → raw-source addon fixture / placeholder lifecycle assertions | Focused startup and loader tests exist for both integration links | ✓ |
| `packages/cli/fixtures/phase-23/config.yml` → `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx` | The shipped sample config now uses the addon's real registered button definition id and is pinned by startup/config regression coverage | ✓ |

## Verification Evidence

Focused Phase 23 verification passed after the gap-closure rerun:

```bash
rtk vitest run src/addon/loader.test.ts src/cli/commands/start.test.ts
```

Result: `PASS (27) FAIL (0)`

Gap follow-up after manual UAT:
- Manual UAT exposed one shipped-fixture regression: `packages/cli/fixtures/phase-23/config.yml` used addon package name `phase-23-local-raw-addon` where config validation requires the registered button id `phase-23-local-raw-button`.
- Root cause and failed evidence are preserved in `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-UAT.md`.
- Gap-closure rerun path: `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-03-PLAN.md`.
- The shipped fixture config has now been corrected, and `23-03-PLAN.md` adds focused regression coverage so config-to-registry drift cannot silently recur.
- The rerun verification now passes with the corrected shipped fixture config and startup/config regression coverage in place.
- A later rerun exposed fixture render-contract drift: `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx` had fallen back to raw JSX (`<span>🍕</span>`), which caused `ReferenceError: React is not defined` during runtime render.
- That rerun evidence remains preserved in `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-UAT.md`, and the current gap-closure rerun path is `.planning/phases/23-jsx-tsx-addon-buttons-startup-image/23-04-PLAN.md`.
- The fixture entrypoint is now restored to the helper-based root-export contract and covered by a runtime-level regression test that would fail on ambient-React JSX drift.

Artifact checks passed:
- `packages/cli/fixtures/phase-23/local-raw-addon/package.json`
- `packages/cli/fixtures/phase-23/local-raw-addon/src/index.tsx`
- `packages/cli/fixtures/phase-23/local-raw-addon/src/content.tsx`
- `packages/cli/fixtures/phase-23/README.md`
- `packages/cli/fixtures/phase-23/config.yml`

## Summary

**Score:** 12/12 must-haves verified

All automated checks passed. Phase goal achieved.
