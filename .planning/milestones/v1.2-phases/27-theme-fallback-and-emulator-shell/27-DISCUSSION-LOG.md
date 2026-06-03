---
phase: 27
slug: theme-fallback-and-emulator-shell
areas_discussed: []
created: 2026-05-27
---

# Phase 27: Theme Fallback And Emulator Shell Boundaries - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 27-theme-fallback-and-emulator-shell
**Areas discussed:** none

---

## Gray Areas Presented

The following phase-specific gray areas were identified from the roadmap entry, prior phase decisions, and a lightweight code scan:

| Area | Why it was identified |
|------|------------------------|
| Theme fallback contract | `packages/cli/src/config/theme.ts` still supports `legacy_yaml` themes and still imports the parallel core fallback frame from `packages/cli/src/render/button-frame.tsx`. |
| TSX runtime policy | Prior runtime regressions showed `.tsx` execution can still fail with `React is not defined` on the real `tsx` seam even when focused tests pass. |
| Theme reload coverage | `start.ts` watches `filePaths`, so Phase 27 must clarify whether `themes/default/ButtonFrame.tsx` is part of that truthful watched graph. |
| Emulator-only shell chrome | `packages/cli/src/render/dom-host.tsx` currently applies shell glass/bezel styling unconditionally on the shared deck document. |

## User Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Discuss selected gray areas | Walk through one or more implementation choices before writing context. | |
| All clear - skip discussion | Accept the identified scope as already clear and write `CONTEXT.md` from the roadmap, prior decisions, and code context. | ✓ |

**User's choice:** `nothing all clear`
**Notes:** The user indicated there were no remaining gray areas worth discussing. Context was written directly from the roadmap goal, prior locked decisions, and the confirmed code seams.

## Agent's Discretion

- Exact implementation split for fallback removal, runtime alignment, watched-file truthfulness, and emulator-only chrome gating.
- Exact plan decomposition for `plan-phase 27`.

## Deferred Ideas

- None - discussion stayed within phase scope and the user chose to skip further clarification.

---

*Phase: 27-theme-fallback-and-emulator-shell*
*Discussion log generated: 2026-05-27*
