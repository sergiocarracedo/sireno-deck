---
phase: 25
slug: theme-tsx-button-frame-support
areas_discussed:
  - Theme entrypoint scope
  - TSX support scope
  - Export contract strictness
  - Import boundary rules
created: 2026-05-26
---

# Phase 25: Theme TSX Button Frame Support - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-26
**Phase:** 25-theme-tsx-button-frame-support
**Areas discussed:** Theme entrypoint scope, TSX support scope, Export contract strictness, Import boundary rules

---

## Theme entrypoint scope

| Option | Description | Selected |
|--------|-------------|----------|
| Keep `manifest.main` only | Keep one theme runtime entrypoint and allow it to be `.js/.jsx/.ts/.tsx`. | ✓ |
| Add special `buttonFrame` path | Add a second manifest/runtime seam specifically for frame code. | |
| TSX only for built-in themes | Use TSX internally for shipped themes but not as the public custom-theme contract. | |

**User's choice:** `Keep manifest.main only (Recommended)`
**Notes:** The user kept the public contract narrow and rejected a second theme-runtime entrypoint.

---

## TSX support scope

| Option | Description | Selected |
|--------|-------------|----------|
| Built-in and custom themes | One real contract for all manifest-backed themes. | ✓ |
| Custom themes only | External theme authors get TSX support while shipped themes stay on compiled JS. | |
| Built-in themes only | Treat TSX as an internal repo-only implementation detail. | |

**User's choice:** `Builtin and custom themes (Recommended)`
**Notes:** The user explicitly chose one honest contract instead of a split between repo themes and user-authored themes.

---

## Export contract strictness

| Option | Description | Selected |
|--------|-------------|----------|
| Keep tolerant exports | Accept `buttonFrame`, `ButtonFrame`, `default.buttonFrame`, or `default.ButtonFrame`. | ✓ |
| Require `ButtonFrame` export | Standardize on component-style named export only. | |
| Require `buttonFrame` export | Standardize on a single named export only. | |

**User's choice:** `Keep tolerant exports (Recommended)`
**Notes:** The user briefly replied `ButtonFrame`, then clarified via the follow-up question that Phase 25 should preserve the current tolerant export lookup instead of turning TSX support into a compatibility break.

---

## Import boundary rules

| Option | Description | Selected |
|--------|-------------|----------|
| Allow in-root relatives only | Permit relative imports within the theme package root, but not escapes outside it. | ✓ |
| Allow any filesystem-relative imports | Permit theme runtime code to reach outside the theme package. | |
| Single-file only | Require the runtime entry to be self-contained with no relative imports. | |

**User's choice:** `Allow in-root relatives only (Recommended)`
**Notes:** The chosen rule matches the narrow addon raw-source honesty boundary and keeps theme packages portable and self-contained.

---

## Agent's Discretion

- Exact implementation mechanics in the theme resolver, as long as `manifest.main` stays the single public runtime entrypoint and `.tsx` works through it.
- Exact test layout and fixture shape for proving built-in plus custom TSX theme-entry loading.
- Exact error wording for invalid exports or unsupported out-of-root imports.

## Deferred Ideas

- A dedicated manifest field for `buttonFrame` runtime files.
- Broader theme runtime APIs beyond the current `buttonFrame` contract.
- TypeScript path aliases, project references, or other project-aware compilation behavior for themes.
- A separate export-cleanup phase that tightens theme runtime naming conventions.

---

*Phase: 25-theme-tsx-button-frame-support*
*Discussion log generated: 2026-05-26*
