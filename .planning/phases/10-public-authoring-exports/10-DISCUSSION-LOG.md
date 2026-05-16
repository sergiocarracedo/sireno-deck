---
phase: 10
slug: public-authoring-exports
areas_discussed:
  - Helper import shape
  - Verification shape
  - Build strategy
created: 2026-05-16
---

# Phase 10: Public Authoring Exports - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in `10-CONTEXT.md`.

**Date:** 2026-05-16
**Phase:** 10-public-authoring-exports
**Areas discussed:** Helper import shape, Verification shape, Build strategy

---

## Helper import shape

| Option | Description | Selected |
|--------|-------------|----------|
| Root export | Expose helper constructors from `sireno-deck-cli` | ✓ |
| Dedicated subpath | Expose helper constructors from `sireno-deck-cli/render` | |
| Another custom shape | Invent a different public helper path | |

**User's choice:** `Root export`
**Notes:** This is the smallest public API shape, keeps the docs simpler, and avoids teaching addon authors internal render module structure.

---

## Verification shape

| Option | Description | Selected |
|--------|-------------|----------|
| Built-artifact check plus built-package typecheck example | Verify emitted files and prove example imports resolve against the built package | ✓ |
| Built-artifact check only | Only assert the files exist after build | |
| Docs/example update only | Update prose and example imports without release-facing verification | |

**User's choice:** `Built-artifact check plus built-package typecheck example`
**Notes:** Phase 9 failed because verification proved source-tree paths, not the built package. Phase 10 must verify the release-facing surface directly.

---

## Build strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit public facades | Add narrow public source entrypoints and build those intentionally | ✓ |
| Reuse internal layout | Depend on current `src/render/*` structure leaking into build output | |
| Change exports to match internals | Redefine the package contract around whatever the current build emits | |

**User's choice:** `Explicit public facades`
**Notes:** This keeps internals private, makes the package contract intentional, and reduces the chance of future drift between exports, build output, and docs.

---

## Contradictions And Risks

- No contradiction in the selected set. The decisions are internally consistent and keep Phase 10 scoped to packaging and release-surface alignment.
- The main implementation risk is exposing too much of the current render internals while trying to make helper imports public. Planning should prefer narrow facades over direct re-export of incidental internal modules.
- The main verification risk is repeating the Phase 9 mistake by keeping repo-local `paths` mappings or source imports in the example. Planning should force at least one check through the built package surface.
- The main scope risk is letting this phase drift into a render-contract redesign. The runtime and reconciler behavior are not the problem here.

---

## Agent's Discretion

- Exact public facade file names and whether the root export is backed by a dedicated `src/index.ts` or another equivalent narrow entrypoint.
- Exact verification command shape, as long as it proves both built artifact existence and built-package authoring imports.
- Exact docs/example wording once the public helper import path is real.

---

## Deferred Ideas

- Additional public render-related subpaths beyond the root helper exports and the existing `sireno-deck-cli/jsx` opt-in entrypoint.
- Any redesign of the non-DOM render contract, helper signatures, or JSX intrinsic elements.

---

*Phase: 10-public-authoring-exports*
*Discussion log generated: 2026-05-16*
