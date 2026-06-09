# Quick 005: icon:// protocol for action buttons — Summary

**Task:** `icon` prop in the action buttons should accept `icon://[lucide-icon-name]` to use a lucide icon by name. Keep `addon://...` and file-path behavior unchanged.
**Completed:** 2026-06-09

## What was done

Added a `resolveIconSpec` helper in `packages/cli/src/ui/Icon.tsx` that routes `icon://...` strings to the existing lucide `name` path and keeps every other string (including `addon://...`, absolute paths, and URLs) on the DOM `src` path. The three built-in buttons that take a string `icon` config — `action`, `change-deck`, `toggle` — now spread the resolved spec onto `<Icon>` instead of always passing `src`.

## Files changed

- `packages/cli/src/ui/Icon.tsx` — added `resolveIconSpec` helper and `ResolvedIconSpec` type export
- `packages/cli/src/ui/__tests__/Icon.test.tsx` — 3 new tests covering `icon://`, `addon://`/file path, and undefined/empty
- `packages/cli/src/builtin-addons/core-buttons/buttons/action.tsx` — `IconLabelSurface icon={resolveIconSpec(config.icon)}`
- `packages/cli/src/builtin-addons/core-buttons/buttons/change-deck.tsx` — `renderCenteredButtonContent` resolves the spec
- `packages/cli/src/builtin-addons/core-buttons/buttons/toggle.tsx` — `renderToggleSurface` resolves the spec

## Commit

`3b889df feat(quick-005): icon://[lucide-name] protocol for action/change-deck/toggle buttons`

## Verification

`pnpm --filter sireno-deck-cli exec vitest run --reporter=basic src/ui/__tests__/Icon.test.tsx` → 7 passed (4 existing + 3 new).
