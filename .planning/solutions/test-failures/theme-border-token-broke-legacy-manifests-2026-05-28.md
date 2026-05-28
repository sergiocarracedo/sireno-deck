---
title: Theme border token broke legacy manifests
date: 2026-05-28
category: test-failures
module: theme resolver
problem_type: test_failure
severity: medium
tags: [theme-resolver, theme-manifest, border-token, backward-compatibility]
symptoms:
  - resolveTheme tests started failing with ConfigValidationError: Required
  - ship was blocked because theme resolver fixtures and custom theme tests no longer loaded
root_cause: The new border token was made required in ThemeSchema even though existing custom theme manifests and committed fixtures still omitted it.
resolution_type: code_fix
---

# Theme border token broke legacy manifests

## Problem
Adding the new `theme.border` runtime token caused older theme manifests to fail validation before runtime import. That broke `resolveTheme` tests and blocked `/ship` even though the runtime only needed a concrete border value after resolution.

## Symptoms
- `packages/cli/src/config/theme.test.ts` failed with `ConfigValidationError: Required`
- custom theme packages and committed Phase 25 fixtures without `border` no longer resolved
- `/ship` aborted at the test gate because the theme resolver suite was red

## What Didn't Work
- Treating `border` as a required on-disk manifest field immediately. That forced every historical manifest and fixture to migrate at once and turned a runtime token addition into a compatibility break.

## Solution
Make `border` optional while parsing theme manifests, then synthesize the resolved runtime token at the resolver boundary:

```ts
const ThemeSchema = z
  .object({
    name: z.string().min(1),
    background: z.string().min(1),
    border: z.string().min(1).optional(),
    foreground: z.string().min(1),
    primary: z.string().min(1),
    accent: z.string().min(1),
    success: z.string().min(1),
    danger: z.string().min(1),
  })

return {
  accent: manifest.accent,
  background: manifest.background,
  border: manifest.border ?? manifest.accent,
  // ...
}
```

Then lock the behavior with focused resolver tests:
- manifests without `border` fall back to `accent`
- manifests with explicit `border` preserve the override

## Why This Works
The compatibility boundary is the resolver, not the raw YAML. Older manifests can keep loading unchanged, while the rest of the runtime still receives a fully populated `Theme` object with a concrete `border` token.

## Prevention
- When adding a new resolved runtime token, decide separately whether it must be required in on-disk manifests or can be synthesized compatibly.
- Add focused resolver tests for both fallback and explicit override behavior whenever theme schema fields change.

## Related
- `.planning/quick/018-fix-theme-resolver-regressions-blockin/018-SUMMARY.md`
- `.planning/quick/018-fix-theme-resolver-regressions-blockin/018-VERIFICATION.md`
