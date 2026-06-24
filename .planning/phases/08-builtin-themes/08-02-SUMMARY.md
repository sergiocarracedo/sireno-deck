# Phase 08 Plan 02 — Summary

**Plan:** 08-02 — `light` theme as thin override + WS theme wiring
**Wave:** 2
**Status:** ✅ Complete
**Date:** 2026-06-24

## What shipped

### Built-in light theme (`packages/cli/src/themes/light/`)
- `theme.css` — inverse of the default theme: `:root { @theme { ... light tokens ... } }` as primary, with `@media (prefers-color-scheme: dark) { @theme { ... dark override ... } }`
- Same `@keyframes tap-pulse` (150ms) and `@keyframes hold-fill` as default
- `ButtonFrame.tsx`, `components/Icon.tsx`, `Label.tsx`, `Text.tsx`, `TapIndicator.tsx`, `Chip.tsx`, `surfaces/IconLabel.tsx`, `Bars.tsx`, `LabelValueList.tsx`, `SplitAction.tsx` — all are thin re-exports of the `default` theme's versions
- `index.tsx` — same manifest shape; the only thing that changes is `theme.css`

### WS theme wiring (`packages/cli/src/render/ws-bridge.ts`)
- `WsBridgeOptions` gains `activeTheme?: { name: string; version?: number }`
- The `hello-ack` message now embeds the theme name in `config: { theme: '<name>' }` so the frontend can confirm/override the active theme at connection time
- `packages/cli/src/cli/commands/emulator-mode.ts` accepts an `activeTheme` option and forwards it to the bridge
- `packages/cli/src/cli/commands/run.ts` `preflight` returns the resolved theme; `runEmulatorLifecycle` reads `process.env.SIRENO_THEME_NAME` (set by preflight) and passes it through

### Test coverage
- `packages/cli/src/themes/light/__tests__/light.test.ts` — 4 new tests:
  - `registerBuiltInThemes` registers both `default` and `light`
  - `resolveActiveTheme({ theme: 'light' })` returns the light theme
  - `default` and `light` have distinct CSS paths
  - Unknown theme name throws with both built-ins listed in the error message

## Test results

| Metric              | Before Plan 02 | After Plan 02 |
| ------------------- | -------------- | ------------- |
| Tests passing       | 397            | 401           |
| Test files          | 56             | 57            |
| New tests added     | —              | 4             |
| Lint warnings       | 0              | 0             |
| Typecheck errors    | 0              | 0             |

## Must-haves status

| Requirement                                                           | Status |
| --------------------------------------------------------------------- | ------ |
| `theme: light` resolves to the light theme; CLI does not error        | ✅     |
| `theme: nonexistent` throws a helpful error at startup                | ✅     |
| Switching from `default` to `light` in config re-themes on restart   | ✅     |
| Shared components render correctly under both themes                  | ✅     |
| CLI sends the active theme name via WS                                | ✅     |
| All previous tests still pass                                        | ✅     |

## Decisions made

- **`hello-ack.config.theme`** rather than `deck-config.theme`. `hello-ack` is sent once per connection, making it the natural place for the active theme; `deck-config` is per-deck navigation.
- **Light theme is a thin re-export** of `default`'s ButtonFrame/components/surfaces. This is the user's explicit "thin override" approach: only the tokens differ; visuals and behavior stay identical.
- **Both themes share `@theme` block structure** — Tailwind 4's CSS-first config picks up either set when the Vite plugin serves the right `theme.css`.

## Vertical slice demo

1. `pnpm test` — 401 passing.
2. `pnpm typecheck` — clean.
3. `pnpm --filter sireno-deck-2 lint` — clean.
4. Manual smoke: set `theme: light` in config.yml → CLI starts Vite with `SIRENO_THEME` set to the light theme's CSS path → frontend renders light tokens → `hello-ack` carries `{ theme: 'light' }` for confirmation.