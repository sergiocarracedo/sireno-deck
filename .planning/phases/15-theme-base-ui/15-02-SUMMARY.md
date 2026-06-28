# 15-02 SUMMARY: Base Surfaces + Theme Integration

## Status: ✅ Complete

## Commits
- `47b0d58` — port 4 surfaces from legacy (Bars, IconLabel, LabelValueList, SplitAction)
- `289dbe1` — surfaces barrel + main barrel exports
- `0e76a99` — rewrite default/light theme indexes to import from `@/ui/`
- `c55a348` — delete old theme component/surface dirs + update stale imports
- `6ab4fc2` — fix cn.ts falsy values, remove non-exported types

## Verification
- `tsc --noEmit`: 112 pre-existing errors (0 new)
- Tests: same 3 pre-existing failures (cli.test, deck-render, ws-integration)
- Both themes now import components/surfaces from `@/ui/`
- Theme directories reduced to: ButtonFrame.tsx + index.tsx + theme.css + __tests__/
- All 7 stale imports updated to `@/ui/` across button definition files
