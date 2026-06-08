# Quick Task 041 Summary

**Task:** Remove .js compiled files and prevent recurrence
**Completed:** 2026-06-08

## What was done

**Root cause:** Root `tsconfig.json` lacked `noEmit` so running `tsc` at workspace root emitted `.js` alongside every `.ts` file. `.gitignore` had no `*.js` pattern — these files were untracked but visible.

**Fix:**
1. Added `"noEmit": true` to root `tsconfig.json` — prevents `tsc` from emitting `.js` (primary fix)
2. Added `*.js` to `.gitignore` with exceptions for 7 hand-written fixture/theme `.js` files that have no `.ts` counterpart — safety net
3. Removed ~170 compiled `.js` files from disk across `src/`, `fixtures/`, and config files

## Files changed

- `tsconfig.json`: added `"noEmit": true` to `compilerOptions`
- `.gitignore`: added `*.js` with exceptions for 7 hand-written fixture/theme files

## Commit

`cb7b884` — feat(quick-041): prevent accidental tsc .js emissions — noEmit + gitignore *.js
`9826feb` — fix(quick-041): remove stale gitignore exceptions for compiled fixture .js files
