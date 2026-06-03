# Phase 19 Discussion Log

**Date:** 2026-05-23
**Mode:** standard
**Phase:** 19 - Tailwind Button Theming via Theme CSS Variables

## Areas Discussed

### Theme variable surface
- Options considered:
  - Expose all current theme tokens as CSS variables
  - Expose only color tokens first
  - Expose only `primary` / `accent` / `background`
- Recommended:
  - Expose all current theme tokens as CSS variables
- User choice:
  - `All current theme tokens (Recommended)`
- Captured rationale:
  - The first rollout should avoid a half-theme contract and use the existing theme loader as the single source of truth.

### CSS variable naming
- Options considered:
  - Sireno-namespaced variables such as `--sireno-color-primary`
  - Tailwind-shaped generic variables
  - Both alias layers
- Recommended:
  - Sireno-namespaced variables
- User choice:
  - `sireno namespaced vars (Recommended)`
- Captured rationale:
  - The core theme contract should stay framework-agnostic, with Tailwind as a consumer rather than the source of truth.

### Tailwind utility contract
- Options considered:
  - Ship a core utility/theme layer
  - Only expose CSS variables and let addons wire Tailwind themselves
  - Let each addon define its own utility mapping
- Recommended:
  - Ship a core utility/theme layer
- User choice:
  - `Ship a core utility/theme layer (Recommended)`
- Captured rationale:
  - If `text-primary` is a product promise, core must own the mapping rather than pushing that burden onto addons.

### Utility scope
- Options considered:
  - Theme-token utilities only
  - Broad Tailwind subset
  - Minimal demo-only utilities
- Recommended:
  - Theme-token utilities only
- User choice:
  - `Theme-token utilities only (Recommended)`
- Captured rationale:
  - The phase should stay focused on theme wiring rather than turning into a general styling framework rollout.

### Override boundaries
- Options considered:
  - Existing overrides stay authoritative
  - Theme vars override inline config/runtime overrides
  - Mixed precedence by surface type
- Recommended:
  - Existing overrides stay authoritative
- User choice:
  - `Overrides stay authoritative (Recommended)`
- Captured rationale:
  - The CSS-var layer should reflect resolved values and preserve the earlier precedence decisions instead of inventing a competing system.

### Author ergonomics
- Options considered:
  - Plain `className` first, helpers optional
  - Helpers only
  - Both equal first-class approaches
- Recommended:
  - Plain `className` first, helpers optional
- User choice:
  - `Plain className first, helpers optional (Recommended)`
- Captured rationale:
  - Phase 18 already committed the product to normal React/HTML authoring, so Phase 19 should not drift back toward a helper-only render DSL.

## Agent's Discretion Areas

- Exact CSS injection mechanism inside the browser deck shell
- Exact utility alias list for typography roles
- Exact file split between DOM host, button frame, and helper utilities

## Deferred Ideas

- Full Tailwind utility coverage beyond theme-token-backed classes
- A broader CSS layout/spacing framework in core
- Any new precedence system that would override explicit runtime/config values

## User Verbatim Signals

- "I want to add tailwind for the Burton themimg"
- "We should connect the themes to tailwind vía CSS vars, e.g. text-primary must use the gobal sireno deck themes primary color"
