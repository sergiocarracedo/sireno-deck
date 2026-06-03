---
phase: 29
slug: built-in-addon-tsx-hard-cut-tailwind-cleanup
areas_discussed:
  - Legacy API removal
  - Built-in file split
  - Styling cleanup boundary
  - Date formatting library
created: 2026-05-27
---

# Phase 29: Built-in Addon TSX Hard Cut + Tailwind Cleanup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-05-27
**Phase:** 29-built-in-addon-tsx-hard-cut-tailwind-cleanup
**Areas discussed:** Legacy API removal, Built-in file split, Styling cleanup boundary, Date formatting library

---

## Legacy API Removal

| Option | Description | Selected |
|--------|-------------|----------|
| Hard cut now | Rename the contract so `AddonButtonDefinition` means the mounted `render(props)` shape directly, remove `LegacyAddonButtonDefinition`, and stop presenting the mounted seam as a legacy adapter. | ✓ |
| Keep adapter internal | Publicly remove the legacy name, but keep the current `defineMountedButton()` compatibility adaptation internally for one more phase. | |
| Defer runtime rename | Remove the legacy naming from exports/docs now, but keep the underlying type alias and adapter shape largely intact until later. | |

**User's choice:** `Hard cut now (Recommended)`
**Notes:** The user wants a real contract cutover rather than another rename-only phase.

### Internal Runtime Bridge Scope

| Option | Description | Selected |
|--------|-------------|----------|
| API hard cut, bridge may stay internal | Public and built-in authoring move fully to the mounted definition contract, but runtime internals may keep a temporary non-public bridge. | |
| Remove internal bridge too | Phase 29 also refactors runtime internals so button definitions are consumed natively without the `createInstance()` adaptation. | ✓ |
| Agent discretion | End with no visible legacy seam and let planning decide whether the internal bridge still fits safely. | |

**User's choice:** `Remove internal bridge too`
**Notes:** The user explicitly chose the broader cleanup so the runtime does not keep thinking in the old instance bridge model.

---

## Built-in File Split

| Option | Description | Selected |
|--------|-------------|----------|
| Strict one button per file | Each exported built-in button definition gets its own file. Shared schemas, assets, and formatting helpers may live in nearby support files. | ✓ |
| One file per addon section | Related buttons may stay grouped in a subfolder file when they share most implementation. | |
| Only split the obvious offenders | Apply the rule only to current offenders like `date-time` and `emoji-selector`. | |

**User's choice:** `Strict one button per file (Recommended)`
**Notes:** The user wants the rule to be real for shipped built-ins, not an ad hoc cleanup of two files.

### Shared Helpers

| Option | Description | Selected |
|--------|-------------|----------|
| Keep shared support files | One definition per file, but shared schemas/helpers/constants can live in support files inside the addon folder. | ✓ |
| Inline per button file | Make each button file self-contained even if that duplicates logic. | |
| Agent discretion | Use shared support files only where duplication would clearly be worse. | |

**User's choice:** `Keep shared support files (Recommended)`
**Notes:** The user wants explicit per-button ownership without duplicating formatter or metadata logic across files.

---

## Styling Cleanup Boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Only for unsupported CSS features | Default to utility classes, allowing inline style only when the current Sireno utility layer cannot express the needed browser CSS feature cleanly. | ✓ |
| Allow layout micro-styles | Keep utilities for most styling, but allow small inline layout details like `gap` or `lineHeight`. | |
| No inline styles in built-ins | Expand the utility layer until every built-in style is expressible as classes. | |

**User's choice:** `Only for unsupported CSS features (Recommended)`
**Notes:** The user wants built-ins to prove the utility-first contract instead of leaving easy inline-style debt in place.

### Utility Growth Preference

| Option | Description | Selected |
|--------|-------------|----------|
| Add the utility anyway | If a simple style matters enough to ship, encode it in the Sireno utility layer even when the usage is currently one-off. | ✓ |
| Allow one-off inline style | Keep the utility layer smaller and accept a rare one-off inline style when reuse is not proven. | |
| Agent discretion | Prefer utilities, but allow an inline one-off if the class addition would be more awkward than the style itself. | |

**User's choice:** `Add the utility anyway (Recommended)`
**Notes:** The user sees shipped built-ins as the reference surface and does not want simple one-off inline styles normalized there.

---

## Date Formatting Library

| Option | Description | Selected |
|--------|-------------|----------|
| dayjs | Smaller, modern, and sufficiently compatible for the current date/time formatting needs. | ✓ |
| momentjs | Familiar token model but heavier and less attractive as a new dependency. | |
| Keep custom formatter | Avoid a dependency and only reorganize files. | |

**User's choice:** `dayjs (Recommended)`
**Notes:** The user chose Day.js as the new built-in date/time formatter.

### Date Token Contract

| Option | Description | Selected |
|--------|-------------|----------|
| Use Day.js tokens directly | Make `date_format` and `time_format` follow Day.js token syntax as the real contract after the migration. | ✓ |
| Preserve current custom tokens | Keep the old custom token semantics and adapt them internally onto Day.js. | |
| Preserve common tokens only | Keep common current cases stable while allowing some edge behavior to align with Day.js. | |

**User's choice:** `Use Day.js tokens directly (Recommended)`
**Notes:** The user accepted a contract normalization to the library syntax instead of preserving the custom formatter tokens.

### Out-of-Scope Feature Request During Discussion

**User's request:** `use dayjs tokens and add elements for new line, color (accent danger, etc, , font size (md, sm, lg, xs), also to define ticking elements for example to make blink every 1s or 500ms`

**Workflow handling:** The discuss-phase scope guardrail classifies newline segments, per-segment color/size controls, and ticking/blinking formatting directives as new date-time capabilities rather than cleanup of the existing Phase 29 surface.

| Option | Description | Selected |
|--------|-------------|----------|
| Defer them and use Day.js tokens | Record the richer formatting ideas as future-phase scope and keep Phase 29 focused on cleanup plus the Day.js token contract. | |
| Drop them for now | Do not carry the richer ideas into Phase 29 artifacts. | |
| Add them to roadmap backlog | Record the ideas as future roadmap backlog while Phase 29 still only switches the existing formatting fields to Day.js tokens. | ✓ |

**User's choice:** `dont defer, i want that in this phase`
**Notes:** The workflow did not allow moving those features into Phase 29 because they expand capability beyond the roadmap boundary. After the scope guardrail was restated, the user chose: `Note for roadmap backlog and continue (Recommended)`.

---

## Agent's Discretion

- Exact TypeScript names and file layout for the post-legacy mounted button contract.
- Exact sequencing for removing the runtime `createInstance()` bridge safely.
- Exact Sireno utility-class additions needed to replace simple built-in inline styles.
- Exact support-file naming and addon-folder structure used to keep one definition per file without duplicating shared logic.

## Deferred Ideas

- Future date-time feature work for newline-aware segments, per-segment color controls, per-segment font sizes, and ticking/blinking display directives.

---

*Phase: 29-built-in-addon-tsx-hard-cut-tailwind-cleanup*
*Discussion log generated: 2026-05-27*
