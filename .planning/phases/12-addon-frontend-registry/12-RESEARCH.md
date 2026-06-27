---
phase: 12-addon-frontend-registry
status: researched
date: 2026-06-27
---

# Phase 12 — Research

## Vite plugin addon registry

**Decision:** Extend the existing `virtual:sireno/addons` virtual module to ALSO emit a `virtual:sireno/addons/registry` module that maps `type → { addonName, Component }` for all built-in addons. Each builtin's `frontend.tsx` default export is imported and registered under every `core:type` it provides.

**Confidence: HIGH** — the plugin already builds `buildAddonsImports`; we extend it.

**Shape:**
```ts
// virtual:sireno/addons/registry (generated)
import * as _dateTimeAddon from "@/builtin-addons/date-time/frontend.tsx";
import * as _weatherAddon from "@/builtin-addons/weather/frontend.tsx";
// ... per builtin

export const addonRegistry = {
  "core:time": { addonName: "date-time", Component: _dateTimeAddon.default },
  "core:date": { addonName: "date-time", Component: _dateTimeAddon.default },
  // ... per (addon, type)
};
```

**CLI plumbing:** the CLI scans `packages/cli/src/builtin-addons/*/` at startup, picks up each addon's `frontend: { main: "./frontend.tsx" }` from its manifest (already in the type), and passes the list to `spawnFrontendVite({ addons: [...] })`. The vite plugin uses the list to generate the registry.

## Lazy OS state polling

**Decision:** The CLI's runtime already has hooks for `deck-active` and `deck-inactive` (see `packages/cli/src/deck/runtime.ts`). Add a `mountedAddonTypes` set on the runtime; on `deck-active`, diff against the new deck's surfaces to compute `add → start polling` and `remove → stop polling`.

**Confidence: HIGH** — the runtime already tracks active deck transitions.

**Polling cadence:** each addon declares `publishIntervalMs` in its addon manifest. The CLI starts a `setInterval` per addon channel. On deck change, intervals are restarted only if the addon's button-set changed.

## Frontend addon render

**Decision:** Frontend's `Deck.tsx` reads `addonRegistry` from `virtual:sireno/addons/registry`. For each button, look up the registry by `button.type` and render `<RegistryEntry.Component config={button.config} state={state} />` as the children of `<ButtonFrame>`. If no entry, fall back to the type-name label (current behavior).

**Confidence: HIGH** — minor extension to existing `Deck.tsx`.

## NPM addon dynamic import

**Decision:** The frontend's `Deck.tsx` receives `frontendEntry: string` per button (already in the deck-config from Phase 10). Use Vite's `import(/* @vite-ignore */ frontendEntry)` for the dynamic path. Add a vite plugin `resolveId` hook that returns `frontendEntry` as a resolved id (whitelist check: must start with `<addon-cache>` or `<workspace-root>`). Vite then bundles the addon as a separate chunk.

**Confidence: MEDIUM** — Vite's dynamic import with absolute paths needs the right setup. May require server.fs.allow + a custom resolver.

## File layout

```
src/vite/virtual-modules.ts                       # new virtual:sireno/addons/registry
src/addon/api.ts                                   # AddonManifest.publishIntervalMs
src/cli/commands/emulator-mode.ts                 # buildDeckConfigMessage adds addonName + frontendEntry
src/cli/commands/run.ts                           # passes addons list to vite plugin
src/render/state-publisher.ts                     # NEW: polls OS state, publishes to WS state channels
src/render/state-publisher.test.ts                # NEW: tests
src/builtin-addons/date-time/frontend.tsx          # NEW
src/builtin-addons/emoji-selector/frontend.tsx     # NEW
src/builtin-addons/media-player/frontend.tsx       # NEW
src/builtin-addons/system-status/frontend.tsx      # NEW
src/builtin-addons/value-display/frontend.tsx      # NEW
src/builtin-addons/weather/frontend.tsx            # NEW
src/builtin-addons/brightness/frontend.tsx         # NEW
src/builtin-addons/<addon>/index.ts                # each addon adds publishIntervalMs + frontend field
packages/cli/frontend/src/components/Deck.tsx     # reads addonRegistry, renders addon components
packages/cli/frontend/src/components/ButtonFrame.tsx  # no change (passes children through)
```

## Tests

- Vite plugin: registry includes all 7 user-facing addon types. Each entry has a `Component` that is a function.
- Backend: `buildDeckConfigMessage` includes `addonName` and `frontendEntry` for each button.
- Frontend Deck: snapshot that a `core:time` button renders the formatted time string (not the type-name label).
- State publisher: lazy poll lifecycle (starts when button exists, stops when none exist).

## Risks

1. **Vite dynamic-import with absolute paths** — Vite normally resolves through the module graph. May need a `resolveId` hook that whitelists paths under `<addon-cache>`. **Mitigation:** test with a small npm-addon mock before committing.
2. **CLI publishes to WS → frontend `ChannelRegistry`** — currently the CLI doesn't push state; the bridge publishes what the frontend sends. **Mitigation:** invert the flow in `ws-bridge.ts` so the CLI can push state via `bridge.broadcast({type: 'state', channels: {...}})`. Add `broadcast` already exists.
3. **Addon frontend component re-renders on state change** — `useAddonChannel` already returns the latest value, so components re-render automatically. Test with a 100ms-cadence mock.
4. **Tailwind class detection for addon frontends** — Tailwind needs to scan addon `frontend.tsx` files for class names. The theme's existing `configResolved` writes a `@source` directive pointing at `themes/<theme>/**/*.{ts,tsx}`. Extend to also include `<addon-cache>/**/*.{ts,tsx}` when an addon has a frontend.
