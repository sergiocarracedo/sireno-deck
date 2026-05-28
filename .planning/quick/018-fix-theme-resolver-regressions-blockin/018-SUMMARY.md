# Quick Task 018 Summary

**Task:** Fix theme resolver regressions blocking ship
**Completed:** 2026-05-28

## What was done
Restored theme resolver compatibility for older theme manifests after the new `border` token was introduced. Theme manifests may now omit `border`, but resolved themes still expose a concrete `border` value by falling back to `accent` unless a manifest overrides it explicitly.

## Files changed
- `packages/cli/src/config/theme.ts`: made manifest `border` optional during parsing and synthesized a resolved fallback from `accent`
- `packages/cli/src/config/theme.test.ts`: added focused assertions covering border fallback and explicit border override on the real resolver path

## Commit
`d6a6a73`
