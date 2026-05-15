---
title: Theme typography differences can disappear under host font fallback
date: 2026-05-15
category: ui-bugs
module: render/theme-review-path
problem_type: ui_bug
severity: medium
tags: [typography, sharp, librsvg, font-fallback, uat, theme]
symptoms:
  - Changing `themes/light.yml` to a different `font_family` produced no visible difference on-device
  - Phase 7 unit tests passed even though the real dark-vs-light review path failed in UAT
  - Shared text looked theme-driven in code but not observably different in the shipped review fixtures
root_cause: Theme typography relied too heavily on host-resolved `font-family` names in the Sharp/librsvg SVG path, so different configured families could collapse to the same rendered fallback font during real UAT.
resolution_type: code_fix
---

# Theme typography differences can disappear under host font fallback

## Problem
Phase 7 introduced theme-driven typography tokens for shared Stream Deck text, but the first UAT run still failed. Changing the light theme to a different `font_family` did not produce a visible difference on-device, which meant the new typography contract was technically wired but not reliably observable in the real review path.

## Symptoms
- Switching between `packages/cli/fixtures/phase-7/config.shared-dark.yml` and `packages/cli/fixtures/phase-7/config.shared-light.yml` did not clearly change shared text styling.
- Editing `themes/light.yml` to use `DejaVu Sans` still looked the same after restarting the CLI.
- `packages/cli/src/render/text-image.test.ts` passed because it only proved that an arbitrary token mutation changed pixels in-process.

## What Didn't Work
- Relying on `font_family` alone to demonstrate theme-driven typography differences.
- Treating a synthetic renderer test as proof that the shipped dark-vs-light review path was UAT-visible.

## Solution
Keep the Phase 7 contract narrow, but make the shipped light-theme review tokens diverge through attributes that survive host font fallback: size, weight, and letter spacing, not just `font_family`.

Also replace the synthetic typography test with coverage for the real review path:

- `themes/light.yml` now differs from `themes/dark.yml` through visible typography token changes that remain observable even if the host rasterizer resolves both families similarly.
- `packages/cli/fixtures/phase-7/config.shared-dark.yml` and `config.shared-light.yml` stay aligned on the same shared review label so UAT compares the same surface.
- `packages/cli/src/render/text-image.test.ts` now verifies the exact shipped dark-vs-light review scenario that previously failed in UAT.

## Why This Works
`packages/cli/src/render/text-image.ts` passes typography through SVG text attributes, but Sharp/librsvg still depends on fonts installed and resolvable on the host. That makes `font_family` a weak source of visible distinction in UAT unless the environment guarantees both families actually exist and render differently.

Size, weight, and spacing changes survive that environment variability because they affect layout and glyph rendering even when the host falls back to the same underlying font family. By moving the verification target from a synthetic token mutation to the real shipped dark-vs-light review path, the test now protects the behavior the user actually checks.

## Prevention
- When typography is part of a user-visible contract, do not rely on `font_family` alone unless fonts are bundled or otherwise guaranteed in the rasterization environment.
- Add renderer tests for the exact shipped review fixtures, not only synthetic token swaps.
- If UAT expects an obvious visible difference, encode at least one fallback-robust token difference such as size, weight, or spacing.

## Related
- `.planning/phases/07-typography-text-behavior/07-UAT.md`
- `.planning/phases/07-typography-text-behavior/07-03-SUMMARY.md`
- `packages/cli/src/render/text-image.ts`
- `packages/cli/src/render/text-image.test.ts`
- `themes/dark.yml`
- `themes/light.yml`
