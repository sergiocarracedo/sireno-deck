---
phase: 20
slug: theme-packages-and-locked-time-layout
areas_discussed:
  - Theme package contract
  - Theme-owned buttonFrame
  - Theme asset model
  - Lock layout and image fixes
created: 2026-05-23
---

# Phase 20: Theme Packages, Asset Bundling, and Locked Time Layout - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 20-theme-packages-and-locked-time-layout
**Areas discussed:** Theme package contract, Theme-owned buttonFrame, Theme asset model, Lock layout and image fixes

---

## Theme package contract

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest + JS entry | Theme ships a manifest plus required runtime code exports | ✓ |
| Manifest-only themes | Pure data folders with declarative frame/styling fields | |
| Split manifest + optional plugin | Manifest always required, runtime code only for advanced themes | |

**User's choice:** `Manifest + JS entry (Recommended)`
**Notes:** The theme package must be strong enough to own frame behavior and third-party packaging cleanly.

| Option | Description | Selected |
|--------|-------------|----------|
| Mandatory frame export | Every theme must provide the same frame export contract | ✓ |
| Optional frame export | Themes can omit frame and fall back to core | |
| Manifest-declared capabilities | Capability matrix decides whether frame support exists | |

**User's choice:** `Mandatory frame export (Recommended)`
**Notes:** One contract is preferred over mixed fallback behavior.

| Option | Description | Selected |
|--------|-------------|----------|
| Theme source + theme id | Separate source model and canonical manifest id | |
| Filesystem path only | Local folders only | |
| Package name or path string | One overloaded string for builtin/package/path resolution | ✓ |

**User's choice:** `Package name or path string`
**Notes:** This keeps config shorter, but loader diagnostics must stay explicit about resolution failures.

---

## Theme-owned buttonFrame

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit visual state enum | Narrow enum such as `idle | tap | hold` | ✓ |
| Boolean flags | Booleans like `isPressed` / `isHeld` | |
| Full button/runtime object | Expose internal runtime shape directly | |

**User's choice:** `Explicit visual state enum (Recommended)`
**Notes:** The contract should stay small and stable.

| Option | Description | Selected |
|--------|-------------|----------|
| idle / tap / hold | Clear visual-state naming | ✓ |
| nothing / tap / hold | Matches the first verbal phrasing more literally | |
| idle / pressed / hold | More input-centric naming | |

**User's choice:** `idle / tap / hold (Recommended)`
**Notes:** These names are now treated as contract, not examples.

| Option | Description | Selected |
|--------|-------------|----------|
| Theme owns chrome, core owns slot contract | Theme styles the shell while core keeps host/layout guarantees | ✓ |
| Theme owns full outer layout | Theme controls the entire wrapper layout | |
| Core owns layout and most visuals | Theme only tweaks a mostly-core frame | |

**User's choice:** `Theme owns chrome, core owns slot contract (Recommended)`
**Notes:** This preserves cross-theme host consistency while allowing visible theme differentiation.

---

## Theme asset model

| Option | Description | Selected |
|--------|-------------|----------|
| Manifest-declared asset registry | Manifest lists assets and entry CSS files | ✓ |
| Convention-only file layout | Fixed folders without metadata | |
| Runtime code returns assets | Assets declared programmatically in code | |

**User's choice:** `Manifest-declared asset registry (Recommended)`
**Notes:** Asset discovery and validation should stay explicit.

| Option | Description | Selected |
|--------|-------------|----------|
| Rewrite relative URLs from CSS file location | Resolve `url(...)` relative to the CSS asset file and fail clearly on broken refs | ✓ |
| Only allow manifest-named asset references | CSS may reference only manifest-named assets | |
| Leave CSS URLs untouched | No rewriting/resolution help | |

**User's choice:** `Rewrite relative URLs from CSS file location (Recommended)`
**Notes:** Normal CSS authoring should still work for packaged themes.

| Option | Description | Selected |
|--------|-------------|----------|
| Fonts as manifest assets, consumed through CSS | Manifest registers the files, CSS binds them with `@font-face` | ✓ |
| Dedicated manifest font section | Special font metadata section in manifest | |
| CSS only | Fonts only appear through CSS files | |

**User's choice:** `Fonts as manifest assets, consumed through CSS (Recommended)`
**Notes:** This avoids inventing a separate font DSL before it is needed.

---

## Lock layout and image fixes

| Option | Description | Selected |
|--------|-------------|----------|
| Fix the general external asset pipeline | Solve image rendering for config/authored and addon assets broadly | ✓ |
| Fix only emoji decks/buttons first | Narrow the bugfix to emoji surfaces | |
| Fix user-config images only | Defer addon package asset issues | |

**User's choice:** `Fix the general external asset pipeline (Recommended)`
**Notes:** Emoji may still serve as one proof path, but the bug is treated as systemic rather than widget-local.

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 5-button HH:MM row | Buttons `5..9` always render `[H][H][:][M][M]` | ✓ |
| Centered 5-button row but theme-stylable placement | Keep five buttons but allow placement flexibility | |
| Theme decides locked visual layout | Theme chooses layout entirely | |

**User's choice:** `Fixed 5-button HH:MM row (Recommended)`
**Notes:** The colon occupies its own button in the center row.

| Option | Description | Selected |
|--------|-------------|----------|
| Implicit locked fallback only | Fixed five-button layout applies only to the built-in fallback locked surface | ✓ |
| Always for locked mode | Force the new layout even when a custom locked deck is configured | |
| Default but overridable by theme | Theme may replace the locked fallback layout contract | |

**User's choice:** `Implicit locked fallback only (Recommended)`
**Notes:** Existing `session.locked_deck` authority is preserved.

---

## Agent's Discretion

- Exact manifest field names and runtime export names beyond the mandatory contract points.
- Exact internal resolver order for builtin/package/path theme references, as long as diagnostics remain path-aware.
- Whether emoji proof uses a standard emoji library or another packaged-asset strategy, as long as the general asset pipeline is what gets fixed.
- Exact core implementation shape for the implicit locked five-button fallback.

## Deferred Ideas

- Broader CSS/layout systems beyond the asset registry and theme-owned frame contract.
- Theme-controlled replacement of explicit `session.locked_deck` behavior.
- New lock-mode capabilities beyond the implicit fallback layout refresh.

---

*Phase: 20-theme-packages-and-locked-time-layout*
*Discussion log generated: 2026-05-23*
