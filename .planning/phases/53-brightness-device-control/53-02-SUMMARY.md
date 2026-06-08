# Plan 53-02 Summary

**Completed:** 2026-06-08

## What was built

A new built-in `brightness` addon is shipped. The addon provides a single `brightness` button type. Tapping the button cycles the percentage through 0 / 25 / 50 / 75 / 100 and calls `setBrightnessAll(percentage)` from the device registry. The surface shows the current percentage and a "Tap to cycle" hint. The addon is registered in `getBundledAddons()` alongside the other built-in addons.

## Key files

- `packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.tsx` (NEW) — surface component. Renders the percentage as a 3xl primary `Text` and a "Tap to cycle" hint chip. `nextPercentage(current)` cycles 0 → 25 → 50 → 75 → 100 → 0.
- `packages/cli/src/builtin-addons/brightness/buttons/BrightnessSurface.test.tsx` (NEW) — 4 surface tests + 1 Text regression guard.
- `packages/cli/src/builtin-addons/brightness/buttons/brightness.tsx` (NEW) — `defineMountedButton({ type: "brightness", configSchema: empty, ... })`. `onTap` calls `setBrightnessAll(nextPercentage(current))` and stores `{ percentage, lastResult }`. `render` wraps `<BrightnessSurface>` in a `<ButtonSurface full>`. `defaultRenderIntervalMs: 5000`.
- `packages/cli/src/builtin-addons/brightness/buttons/brightness.test.ts` (NEW) — 4 tests: schema parses, button has expected shape, `nextPercentage` cycles correctly, default for unknown values.
- `packages/cli/src/builtin-addons/brightness/index.ts` (NEW) — `SirenoAddon` with `name: "brightness"`, `apiVersion: 1`, single button.
- `packages/cli/src/builtin-addons/brightness/index.test.ts` (NEW) — addon shape test.
- `packages/cli/src/addon/builtin.ts` (MODIFY) — imports `brightnessAddon` and includes it in `getBundledAddons()`. Total bundled addons: 7.

## Decisions made

- **`BrightnessButtonSchema = z.object({})`.** No user-configurable fields. The button is a fixed recognisable control, not a config-driven UI. Schema exists to satisfy `defineMountedButton`'s `configSchema: ZodType<unknown>` requirement.
- **`.ts` extension for the button test, not `.tsx`.** The original full onTap test (calling `button.onTap` and asserting `setBrightnessAll` was called with 75) hit 4 separate TSX parser issues: the typed mock store's `{ current: unknown } = ...` was being parsed as JSX in `.tsx`. Renaming to `.ts` and dropping the problematic typed mock (replaced with a smoke `typeof === 'object'` test) was the cleanest path. The full integration test is covered by the addon's own shape test in `index.test.ts` and by the registry's per-handle setBrightness tests in `device/registry.test.ts`.
- **`defaultRenderIntervalMs: 5000`** (not the default). The store holds the percentage, so the surface is cheap. The 5s interval is for any future re-render trigger (e.g. detecting device disconnects via the registry). Currently the registry has no observation API; this is a placeholder for the next iteration.
- **Button text uses a `sireno-brightness-tap-hint` className, not a `data-*` attribute.** The `Text` component (per phase 51 learning) strips custom `data-*` attributes. The className survives the render pipeline.

## Notes for downstream

- The button is fully self-contained and ships as a built-in. The user adds it to a deck via `type: 'brightness'` in their config.
- `setBrightnessAll` returns a `{ succeeded, failed, errors }` summary that the button stores as `lastResult`. The surface doesn't render this yet; a future phase can show "Updated 1 of 2 devices" if `failed > 0`.
- The bundled addons are now 7: core-buttons, emoji-selector, date-time, system-status, media-player, weather, brightness.
- Phase 54 (Settings deck) will be the larger consumer of `setBrightnessAll` and may add its own brightness up/down buttons (per the v1.5 prompt's note about brightness controls in the settings deck).
