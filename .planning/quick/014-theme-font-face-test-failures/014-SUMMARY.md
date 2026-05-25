# Quick Task 014 Summary

**Task:** fix theme/font-face test failures blocking `/ship`
**Completed:** 2026-05-25

## What was done
Restored the built-in default theme stylesheet so the manifest-declared asset now ships real bundled `@font-face` declarations for the IBM Plex Sans and IBM Plex Mono fonts already vendored in the theme package. Added focused assertions in the theme-resolution and DOM-host tests to lock the contract that browser-rendered theme output includes those bundled font declarations.

## Files changed
- `packages/cli/src/themes/default/theme.css`: restored bundled font-face CSS for the default theme package.
- `packages/cli/src/config/theme.test.ts`: asserted the resolved dark theme stylesheet contains the expected IBM Plex bundled font declarations.
- `packages/cli/src/render/dom-host.test.tsx`: asserted rendered deck HTML includes the bundled IBM Plex font declarations from the theme asset stylesheet.

## Commit
`866d442`
