# Quick Task 032 Summary

**Task:** Rename `font-size` to `fontSize` in TypeScript code
**Completed:** 2026-06-03

## What was done
Renamed the theme manifest typography role key from `'font-size'` (kebab-case) to `fontSize` (camelCase) in the Zod schema, and updated the corresponding accessor in `theme-utilities.ts` from `role.font_size` to `role.fontSize`.

## Files changed
- `packages/cli/src/config/theme/schemas.ts` — schema key `'font-size'` → `fontSize`
- `packages/cli/src/render/theme-utilities.ts` — accessor `role.font_size` → `role.fontSize`

## Commit
`004d344`
