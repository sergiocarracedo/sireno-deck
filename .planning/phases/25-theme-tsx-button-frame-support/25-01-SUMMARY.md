# Plan 25-01 Summary

**Completed:** 2026-05-26

## What was built
Made the shipped default theme contract truthful end to end. `packages/cli/src/config/theme.ts` now loads manifest-backed `.jsx`, `.ts`, and `.tsx` theme runtime entries through the same fixed-policy `tsx` seam already used elsewhere in the repo, while preserving `manifest.main` as the only entrypoint, the tolerant `buttonFrame` export lookup, and the snapshot-based fresh-reload behavior.

This slice also fixed the repo's proof surface so tests and downstream startup mocks stop pretending the built-in default theme is still `.js`-only. Focused coverage now asserts the real shipped `themes/default/index.ts` plus `ButtonFrame.tsx` graph and keeps the existing JS-authored theme path green.

## Key files
- `packages/cli/src/config/theme.ts`: switched theme runtime imports onto `tsx/esm/api` for raw `.jsx/.ts/.tsx` entries and added `index.jsx` / `index.ts` / `index.tsx` import-resolution fallbacks.
- `packages/cli/src/config/theme.test.ts`: updated the built-in theme assertions to require the real `index.ts` and `ButtonFrame.tsx` runtime graph while preserving reload coverage.
- `packages/cli/src/cli/commands/start.test.ts`: updated the `resolveTheme()`-driven watched file-path expectations from stale `.js` paths to the real built-in `index.ts` path.

## Decisions made
- Reused the existing temp-snapshot import strategy instead of inventing a second cache-busting path, because reload freshness was already a locked behavior in `theme.test.ts`.
- Kept the public theme runtime contract narrow: `manifest.main` only, tolerant `buttonFrame` export lookup, and no tsconfig-aware project loading.
- Treated test-path truthfulness as product work, not cleanup, because the repo already ships the default theme in TypeScript/TSX.

## Notes for downstream
- The built-in default theme is now an honest proof of the public TSX theme contract rather than a hidden internal-only path.
- The next slice can harden custom-theme import boundaries on top of this same loader seam without creating a separate custom-theme-only path.
