---
phase: 12-addon-frontend-registry
status: not-started
depends_on: [08-builtin-themes, 09-builtin-addons]
---

# Phase 12 — Addon Frontend Registry

Goal: each addon ships a React `frontend.tsx` that renders its button surface. The emulator/frontend dynamically imports it and renders the real surface inside `<ButtonFrame>` (clock face, weather widget, system bars, etc.) — not just type-name labels.

## Why this phase exists

Today, addon button types like `core:time` have a `render` function defined in the CLI host (e.g. `builtin-addons/date-time/buttons/index.tsx`). That function is used to compute the key image for the physical Stream Deck, but the emulator and the standalone frontend have **no way to call it** — they only have the theme's generic surfaces (`IconLabel`, `Bars`, `LabelValueList`, `SplitAction`) and a label fallback.

Result: the emulator shows buttons labelled with their type name (`CORE:TIME`, `CORE:WEATHER`) instead of a live clock, current temperature, CPU bars, etc.

## Outcomes

1. **Addon contract extended** (`src/addon/api-types.ts`):
   - `AddonManifest.frontend?: { main: string; styles?: string[] }` already exists in the type, but no addon fills it.
   - Each addon exports a default object that includes `frontend: { main: "./frontend.tsx" }` (path relative to addon root, JSX/TSX).
2. **Builtin addons ship frontend components**:
   - `date-time/frontend.tsx` — `core:time` shows the current time, `core:date` shows the date, `core:clock` shows an analog clock face, `core:date-time` shows the formatted string.
   - `weather/frontend.tsx` — `core:weather` shows the temperature and conditions icon.
   - `system-status/frontend.tsx` — `core:system-status` shows the CPU/RAM/fan bars.
   - `value-display/frontend.tsx` — `core:value-display` shows the resolved value.
   - `media-player/frontend.tsx` — `core:media-player` shows the current track and play/pause state.
   - `brightness/frontend.tsx` — `core:brightness` shows a brightness slider/gauge.
3. **Vite plugin scans addon frontend entries** (`src/vite/virtual-modules.ts`):
   - New virtual module `virtual:sireno/addons/registry` exports `addons: Record<string, { addonName: string; frontendEntry: string; surface: ComponentType<{config, channels}> }>`.
   - Resolved at frontend build time by the `sirenoDeck2` plugin (already used in both `packages/cli/frontend/vite.config.ts` and `packages/cli/frontend-emulator/vite.config.ts`).
4. **Backend sends `addonName` and `frontendEntry` in deck-config** (`src/cli/commands/emulator-mode.ts:buildDeckConfigMessage`):
   - Each button object now carries: `{ id, type, addonName, frontendEntry, config, position }`.
   - `frontendEntry` is the absolute or Vite-resolvable path to the addon's `frontend.tsx` file.
5. **Frontend Deck renders addon surfaces** (`packages/cli/frontend/src/components/Deck.tsx`):
   - For each button, dynamically `import()` the `frontendEntry` from the addon registry.
   - The imported component is rendered **as children** of `<ButtonFrame>`.
   - Components subscribe to state channels via `useAddonChannel` (or `ChannelRegistry`).
6. **Tests**:
   - Vite plugin: registry includes all 6 builtin addons.
   - Backend: `buildDeckConfigMessage` includes `addonName` and `frontendEntry`.
   - Frontend Deck: snapshot that `core:time` button renders the `useNow()` text, not the type label.
   - WS roundtrip with addon frontend metadata.

## Requirements traceability

- R17 (themes + surfaces) — extends
- R7 (builtin addons) — extends

## Key files

```
src/addon/
  api-types.ts            # add frontend field
  registry.ts             # expose addonName + frontendEntry per type

src/vite/
  virtual-modules.ts      # new virtual:sireno/addons/registry

src/cli/commands/
  emulator-mode.ts        # buildDeckConfigMessage includes addonName + frontendEntry
  emulator-mode.test.ts

packages/cli/frontend/
  vite.config.ts          # already uses sirenoDeck2 plugin
  src/
    components/
      Deck.tsx            # dynamic import + render
      ButtonFrame.tsx     # no changes; passes children through
    bridge/
      addon-registry.ts   # client-side registry mirror
      addon-registry.test.ts
    __tests__/
      deck-render.test.tsx

packages/cli/frontend-emulator/
  src/App.tsx             # pass addonName + frontendEntry through (Deck unchanged)

src/builtin-addons/
  date-time/frontend.tsx
  weather/frontend.tsx
  system-status/frontend.tsx
  value-display/frontend.tsx
  media-player/frontend.tsx
  brightness/frontend.tsx
```

## Migration / compatibility

- Existing addons without a `frontend.tsx` fall back to the **theme's default surface + label** (current behavior, kept as graceful fallback).
- The addon manifest's `frontend` field is optional; if missing, the registry entry is `{ addonName, frontendEntry: null }` and Deck falls back.

## Success criteria

- `pnpm dev start --emulator` shows live clocks, weather, system bars, etc. in the emulator.
- A 3rd-party addon can ship a `frontend.tsx` and have it render in the emulator with zero CLI changes.
- 409+ tests still pass; new tests cover the registry, dynamic import, and fallback path.
