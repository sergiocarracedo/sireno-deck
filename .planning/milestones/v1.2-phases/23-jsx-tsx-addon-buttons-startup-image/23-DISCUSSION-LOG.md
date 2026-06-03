---
phase: 23
slug: jsx-tsx-addon-buttons-startup-image
areas_discussed:
  - JSX/TSX authoring boundary
  - Required addon authoring surface
  - Startup placeholder behavior on hardware
created: 2026-05-25
---

# Phase 23: JSX/TSX Addon Authoring + Startup Placeholder - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 23-jsx-tsx-addon-buttons-startup-image
**Areas discussed:** JSX/TSX authoring boundary, Required addon authoring surface, Startup placeholder behavior on hardware

---

## JSX/TSX authoring boundary

### Authoring boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Built addon contract only | Authors may write TSX/JSX in addon source, but they must build to JS and point `sirenoAddon.main` at built output. | |
| Local addons may be raw TSX/JSX source | Sireno transpiles local addon source on load, but npm-installed addons still need built JS. | ✓ |
| Both local and npm addons may be raw TSX/JSX source | Sireno becomes responsible for transpiling addon source broadly. | |

**User's choice:** `Question 1: 2`
**Notes:** The user chose local raw-source addon support instead of keeping a build-only addon contract.

### Source boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest main only | Still require `sirenoAddon.main` in package.json, but allow that local entry to point at a `.ts`/`.tsx`/`.js`/`.jsx` file. | ✓ |
| Convention fallback | If `sirenoAddon.main` is absent or points nowhere, try conventional source files like `src/index.tsx` or `index.tsx`. | |
| Folder-wide source mode | Treat local addon folders as source projects and infer the entrypoint from tsconfig/package structure. | |

**User's choice:** `Manifest main only (Recommended)`
**Notes:** The raw-source feature must stay manifest-driven and should not guess entrypoints.

### Tsconfig scope

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed runtime transpile | Use one Sireno-owned runtime transpile policy for local `.ts/.tsx/.js/.jsx` entries. | ✓ |
| Basic local tsconfig | Read the nearest addon `tsconfig.json` for common JSX/module settings, but avoid advanced project features. | |
| Full project-aware tsconfig | Treat the local addon like a full TypeScript project and honor its tsconfig broadly. | |

**User's choice:** `Fixed runtime transpile (Recommended)`
**Notes:** The user accepted the narrow runtime-owned transpile boundary instead of turning startup into project-aware compilation.

### Import scope

| Option | Description | Selected |
|--------|-------------|----------|
| Relative source imports | Support normal relative imports within the local addon folder, including sibling `.ts/.tsx/.js/.jsx` modules. | ✓ |
| Entry file only | Only transpile the manifest entry file; multi-file source addons must prebuild. | |
| Path aliases too | Also try to honor tsconfig path aliases for local source addons. | |

**User's choice:** `Relative source imports (Recommended)`
**Notes:** Multi-file local source addons should work, but only through normal relative imports.

---

## Required addon authoring surface

| Option | Description | Selected |
|--------|-------------|----------|
| Use root exports only | Make TSX addon button authoring work through `sireno-deck-cli` root exports and normal React typing. | ✓ |
| Restore `./jsx` as an official public entrypoint | Bring back a dedicated JSX opt-in surface and document it as supported API. | |
| Support both root exports and `./jsx` | Keep root imports working, but also preserve a dedicated JSX surface for compatibility or clarity. | |

**User's choice:** `Question 2: 1`
**Notes:** The user chose the current root export surface and explicitly did not choose to restore `./jsx` as public API.

---

## Startup placeholder behavior on hardware

### Placeholder style

| Option | Description | Selected |
|--------|-------------|----------|
| Uniform loading image on every key | Same placeholder visual across the whole device until the first real deck capture lands. | |
| Branded/title placeholder | Same on every key, but explicitly branded with Sireno or startup text/logo styling. | ✓ |
| Per-key shell placeholder | A fake deck layout or framed empty buttons before real content arrives. | |
| Something else | A custom placeholder described by the user. | |

**User's choice:** `Question 3: 2`
**Notes:** The user wants the temporary boot state to read as branded/title content rather than neutral loading art.

### Failure boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Placeholder until first successful render, then honest failure if startup breaks | Temporary branded boot image only while startup is genuinely pending. | ✓ |
| Placeholder with timeout fallback | Show branded image first, but if first render takes too long, switch to an explicit timeout or error surface. | |
| Placeholder stays until full daemon exit on startup failure | Leave the boot image on hardware even if browser startup fails. | |

**User's choice:** `1`
**Notes:** The placeholder is strictly temporary and must not hide real renderer startup failures.

---

## Agent's Discretion

- Exact placeholder visual design, as long as it remains clearly branded/title-style and obviously temporary.
- Exact runtime transpile implementation, as long as it remains manifest-driven, fixed-policy, and limited to relative-import-only source loading.
- Exact startup wiring for when the placeholder is written and when the first successful real deck render replaces it.

## Deferred Ideas

- Restoring `./jsx` as a public entrypoint.
- Raw-source loading for npm-installed addons.
- Tsconfig path aliases, project references, or broader project-aware TypeScript behavior for raw-source addons.
- Convention-based or folder-inferred addon entrypoint discovery.

---

*Phase: 23-jsx-tsx-addon-buttons-startup-image*
*Discussion log generated: 2026-05-25*
