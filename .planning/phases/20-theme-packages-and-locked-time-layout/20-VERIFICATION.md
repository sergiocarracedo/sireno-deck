---
phase: 20
status: in_progress
verified: 2026-05-23
---

# Phase 20: Theme Packages, Asset Bundling, and Locked Time Layout — Verification

## Must-Have Results

| Plan | Must-Have | Status |
|------|-----------|--------|
| 20-01 | Theme resolution accepts package-or-path strings and loads manifest-backed runtime entries | ✓ |
| 20-01 | Browser host uses the theme-owned `buttonFrame` seam for non-`full_surface` buttons | ✓ |
| 20-02 | Theme and addon assets resolve through one package-root-aware registry path | ✓ |
| 20-02 | Packaged theme CSS/font assets inject into the browser host with rewritten relative `url(...)` paths | ✓ |
| 20-02 | Shared asset proof fixture exists for theme and addon assets on the browser path | pending |
| 20-03 | Centered implicit locked fallback replaces the old single-button lock surface | pending |

## Requirement Coverage

| Req ID | Deliverable | Status |
|--------|-------------|--------|
| SCS-08 | Explicit locked-deck authority preserved while implicit fallback remains core-owned | pending |
| SCS-09 | Tests and fixtures cover the new theme package, asset pipeline, and locked-session behavior | pending |

## Integration Checks

| Import | Export exists | Status |
|--------|--------------|--------|
| `packages/cli/src/cli/commands/start.ts -> resolveTheme` | `packages/cli/src/config/theme.ts` exports `resolveTheme` | ✓ |
| `packages/cli/src/render/dom-host.tsx -> theme.buttonFrame` | resolved theme object exposes `buttonFrame` | ✓ |
| `packages/cli/src/core/schemas.ts -> registry.requireAssetPath` | `packages/cli/src/addon/registry.ts` exposes `requireAssetPath` | ✓ |

## Summary

**Score:** 5/7 must-haves verified

Phase 20 Wave 1 and the first two Wave 2 tasks are implemented and verified. Shared asset proof and locked fallback verification remain pending until the remaining execution tasks land.
