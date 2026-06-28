# Phase 13 — Discussion Log

**Date:** 2026-06-27
**Mode:** standard
**Participants:** user, opencode

## Areas Discussed

### 1. CSS variable approach (R-tokens)

**User chose:** "Replace current values outright" — all `--color-*` tokens replaced with exact legacy hex values from theme.css. Add new `--color-frame`, `--color-primary`, `--color-success`, `--color-danger`. Replace font families with IBM Plex Sans/Mono.

### 2. Component port strategy (R-comp)

**User chose:** "Read legacy, re-implement with Tailwind v4" — not verbatim copy. Rewrite legacy components using our conventions.

### 3. Surface alignment + addon migration (R-surface)

**User confirmed:** All 7 addon frontends should use legacy surfaces/components. Full visual alignment.

## Agent's Discretion

- `--color-muted` and `--color-bar` exact values (no legacy equivalent).
- Font face loading method (`@font-face` vs CDN).
- TapIndicator necessity (CSS class `sireno-tap` already exists).

## Deferred Ideas

- MainLabelSurface (not needed in v2).
- cn/clsx/tailwind-merge utilities.
