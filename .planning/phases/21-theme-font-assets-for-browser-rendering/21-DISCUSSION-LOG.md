---
phase: 21
slug: theme-font-assets-for-browser-rendering
areas_discussed:
  - Font declaration contract
  - Failure boundary
  - Fallback behavior
  - Verification surface
created: 2026-05-24
---

# Phase 21: Theme Font Assets For Browser Rendering - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 21-theme-font-assets-for-browser-rendering
**Areas discussed:** Font declaration contract, Failure boundary, Fallback behavior, Verification surface

---

## Font declaration contract

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit manifest fonts | Add a narrow manifest-level font declaration that maps shipped files to family metadata | |
| CSS-only `@font-face` | Keep fonts declared only inside theme CSS stylesheets | ✓ |
| Both, with manifest authoritative | Keep CSS support but require matching manifest-level font declarations | |

**User's choice:** `i want to reconsider my decisions, lets use @font-face instead of set the fonts in the manifest`
**Notes:** The discussion initially leaned toward explicit manifest font metadata, then was deliberately revised. The final choice keeps font delivery CSS-native and avoids a separate font DSL.

| Option | Description | Selected |
|--------|-------------|----------|
| Parse `@font-face` families | Inspect theme CSS and require typography roles to reference declared font families | |
| Trust CSS blindly | Only validate stylesheet files and CSS asset paths, not family-to-typography semantic matches | ✓ |
| Warn only | Detect likely mismatches but do not fail load | |

**User's choice:** `Trust CSS blindly`
**Notes:** This keeps authoring friction low, but it means theme typography family typos can degrade into host/browser fallback without load-time rejection.

---

## Failure boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Only missing files/urls | Hard-fail only for missing stylesheet files and broken CSS `url(...)` asset refs | ✓ |
| Also missing `@font-face` family match | Fail when typography names a family not declared in theme CSS | |
| Never hard-fail fonts | Allow missing files to degrade at runtime | |

**User's choice:** `Only missing files/urls (Recommended)`
**Notes:** This preserves the Phase 20 theme asset failure boundary without extending validation into typography semantics.

| Option | Description | Selected |
|--------|-------------|----------|
| Allow it | Theme may omit stylesheet assets even while naming custom typography families | ✓ |
| Reject it | Require stylesheet support when custom families are named | |
| Warn only | Load succeeds but surfaces a warning | |

**User's choice:** `Allow it (Recommended)`
**Notes:** This intentionally keeps the contract permissive. The phase goal is to support packaged fonts when present, not to require them for every non-generic family.

---

## Fallback behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Fall back silently to browser/system resolution | Let normal CSS and browser font fallback behavior apply | ✓ |
| Append explicit generic fallbacks | Add generic fallbacks like `sans-serif` or `monospace` after theme families | |
| Render with a visible fallback marker | Expose a mismatch through debug styling or warnings | |

**User's choice:** `Fall back silently to browser/system resolution (Recommended)`
**Notes:** The browser may use shipped fonts, host-installed fonts, or generic defaults depending on what is available.

| Option | Description | Selected |
|--------|-------------|----------|
| No core-added stack | Keep emitted font-family values exactly theme-authored | ✓ |
| Generic fallback only | Append generic fallback families in core | |
| Curated fallback stacks | Append broader stacks such as `system-ui` or `ui-monospace` | |

**User's choice:** `No core-added stack (Recommended)`
**Notes:** Core stays neutral and does not partially rewrite the theme typography contract.

---

## Verification surface

| Option | Description | Selected |
|--------|-------------|----------|
| Focused tests plus one committed fixture | Automated proof plus one reviewable browser fixture depending on a packaged custom font | ✓ |
| Focused automated tests only | Rely only on automated coverage | |
| Fixture plus manual UAT | Require an explicit browser/device rerun | |

**User's choice:** `Focused tests plus one committed fixture (Recommended)`
**Notes:** The chosen proof balances Phase 20's real-browser lesson against the narrower scope of this phase.

| Option | Description | Selected |
|--------|-------------|----------|
| A packaged custom font visibly affects browser-rendered text | Prove actual visual impact from a bundled font | ✓ |
| Only that `@font-face` CSS is injected | Prove CSS injection without visual dependence | |
| Multiple font weights/styles | Broader proof of variant handling | |

**User's choice:** `A packaged custom font visibly affects browser-rendered text (Recommended)`
**Notes:** The fixture should fail honestly if the packaged font is not actually used on the browser path.

---

## Agent's Discretion

- Exact parser or implementation mechanics used to keep the CSS-first contract while preserving current missing-asset failures.
- Exact fixture design and chosen theme text that best demonstrates visual dependence on a bundled custom font.
- Exact placement of the focused automated tests across theme-loader and browser-host coverage.

## Deferred Ideas

- Local browser deck emulation for users and developers, including device-size emulation, mouse interaction, and hardware-free preview/debugging.
- Any broader browser execution surface that behaves like a hardwareless Stream Deck runtime rather than a narrow font-delivery hardening phase.

---

*Phase: 21-theme-font-assets-for-browser-rendering*
*Discussion log generated: 2026-05-24*
