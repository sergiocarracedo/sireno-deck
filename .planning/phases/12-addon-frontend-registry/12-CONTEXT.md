# Phase 12: addon-frontend-registry - Context

**Gathered:** 2026-06-27
**Mode:** standard
**Status:** Ready for planning

<domain>
## Phase Boundary

Each built-in addon ships a React `frontend.tsx` (or `frontend.ts`) that renders the addon's button surface inside `<ButtonFrame>`. The vite plugin pre-bundles builtin addon frontends via `virtual:sireno/addons/registry`; npm addons are dynamic-imported at runtime via `frontendEntry` sent in the WS `deck-config`. CLI pushes state data (clock, weather, system metrics, media, brightness) over WS via namespaced channels. Frontend consumes via `useAddonChannel`. The result: emulator/frontend shows live clock, weather, system bars — not just type-name labels.

Closed: the gap between v0.1.0 (typed labels) and v0.2 (real surfaces).

</domain>

<decisions>
## Implementation Decisions

### R-data — State data source (Hybrid C)

- **High-frequency data from CLI via WS**: time/date (1s), system metrics (1s).
- **OS-native state from CLI**: media (playerctl/osascript), brightness (xrandr/brightnessctl/PowerShell), active app (gnome-shell D-Bus).
- **Frontend never calls OS APIs directly.** All OS state goes CLI → WS → frontend.
- **Frontend addon subscribes via `useAddonChannel<T>("<addon>:<key>")`**.
- **Rate-limited per channel**: each addon declares `publishIntervalMs` in its manifest. CLI publishes at that cadence. `hello-ack` includes the global cadence policy so the frontend knows when to expect updates.
- **Channel namespace per addon**: `<addon-name>:<key>`. E.g., `date-time:now`, `weather:current`, `system-status:metrics`, `media-player:state`, `brightness:current`. The addon owns its namespace.
- **Payload shape**: shared zod schema `{ ok: boolean, data?: unknown, error?: string }`. Addons define their own `T` for `data`.
- **OS polls are lazy**: the CLI only polls an addon's OS state when at least one button of that addon exists in the active deck's surfaces. Saves resources; small startup delay is acceptable.

### R-import — Frontend import strategy (Hybrid)

- **Built-in addons (10)** are pre-bundled by the vite plugin via `virtual:sireno/addons/registry`. The vite plugin reads each builtin addon's `frontend: { main: "./frontend.tsx" }` from the addon source and emits an `import` for each.
- **NPM addons** are dynamic-imported at runtime. The backend sends `frontendEntry: <absolute path>` per button in `deck-config`. The frontend `import()`s the path on first render. Resolved via Vite's `server.fs.allow` for dev (only); prod bundles are static.
- **Vite security model**: `server.fs.allow` includes `<addon-cache>` and `<workspace-root>` for dev. The same paths are scanned for addon frontends. In prod (`vite build`), the bundle is fully static — no runtime filesystem access.

### R-contract — Addon `frontend.tsx` API

- **Single default export**: `Component<{ config: TConfig; state: TState | null; onAction?: (action: string) => void }>`.
  - `config` — the button's static config from `config.yml`.
  - `state` — the current payload from the addon's channel, or `null` until the first publish.
  - `onAction` — optional. Invokes a button action; the Deck wraps it in a `button-action` WS message. (For read-only surfaces, omit.)
- **State hook**: addon uses `useAddonChannel<T>("<addon>:<key>")` from `sireno-deck-2/react`. Returns the latest payload.
- **Action handler**: addon uses `useButtonAction(buttonId)` from `sireno-deck-2/react`. Returns `(action: string) => void`.
- **Shared theme tokens**: addon uses the same Tailwind classes (`bg-bar`, `text-fg`, etc.) the theme uses. The theme's CSS variables (`--color-bg`, `--color-fg`, `--color-bar`, `--color-accent`) are available globally.
- **Shared theme components**: addon may import `<Text>`, `<Icon>`, `<Label>` from the active theme's manifest (`virtual:sireno/themes/manifest`). These are the same components the theme's primitives use.
- **Style isolation**: addon styles must not leak outside the button. Use Tailwind utility classes; no global selectors.

### R-scope — Which addons ship a `frontend.tsx`

All 7 user-facing built-in addons ship a `frontend.tsx` in this phase:

1. **`date-time`** — 6 buttons (time, date, clock, analog-clock, date-time, locked-time-tile). Single channel `date-time:now` publishes `{ now: number }` (timestamp). All 6 buttons format it differently.
2. **`emoji-selector`** — category buttons + emoji buttons + page nav. Uses `emoji-selector:copied` channel for the recent-copy indicator.
3. **`media-player`** — split-action button (prev/play-pause/next + volume). Uses `media-player:state` channel.
4. **`system-status`** — text or bars variants. Uses `system-status:metrics` channel.
5. **`value-display`** — list of label + value rows. Uses `value-display:values` channel (one publish per command run).
6. **`weather`** — temperature, wind, description. Uses `weather:current` channel (CLI polls Open-Meteo every 10 min).
7. **`brightness`** — bar + value. Uses `brightness:current` channel.

Skip: `core-buttons`, `internal-settings`, `session` (internal-only, not user-facing).

### Agent's Discretion

- The exact zod schema for the shared channel payload — agent picks `data: z.unknown()` for v0.2; can tighten to specific shapes per channel later.
- Whether to render the addon even when `state === null` (yes, with a "Loading…" placeholder; agent decides the placeholder text per addon).
- The exact `publishIntervalMs` per channel (defaults: time/date/clock/metrics=1000, weather=600000, media=2000, brightness=2000, value-display=5000).

</decisions>

<specifics>
## Specific Ideas

- The addon frontend files live alongside the addon's source: `packages/cli/src/builtin-addons/date-time/frontend.tsx`, etc. Co-locating makes it easy to update the addon and its render together.
- The vite plugin's `addons` option now receives the list of built-in addons from the CLI at startup. The CLI scans `packages/cli/src/builtin-addons/*/index.ts` to build the list automatically (no hardcoded list).
- The `runtime:button-tap` / `runtime:button-dblTap` / `runtime:button-hold` channels (used by the existing frontend `App.tsx`) are unchanged. The new addon frontends use the existing `useButtonAction` hook.
- The OS poll lazy-init means the CLI doesn't start polling `playerctl` until a `core:media-player` button is rendered. Saves a bit of battery / CPU.

## No specific requirements — open to standard approaches

- Whether the addon frontend files are `.tsx` or `.ts` (use `.tsx` since they're React components).
- Whether each addon gets its own channel per button type or shares one (date-time uses one shared `date-time:now`; per the discussion, the simpler default).
- Whether the WS payload is delivered as a single big object or per-channel — per-channel is what `ChannelRegistry` already supports.

</specifics>

<canonical_refs>

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `packages/cli/src/vite/virtual-modules.ts` — already has the `addons` plugin option that emits `virtual:sireno/addons`. Currently unused. Extend it to also emit `virtual:sireno/addons/registry` with `{ type → { addonName, Component } }`.
- `packages/cli/src/react/index.ts` — exports `useAddonChannel`, `useButtonAction`, `useDeck`, `ChannelRegistry`. The addon frontend imports these.
- `packages/cli/src/react/use-addon-channel.ts` — `useAddonChannel<T>(channel)`. Already tested.
- `packages/cli/src/cli/commands/emulator-mode.ts:buildDeckConfigMessage` — extend each button with `addonName` and `frontendEntry`.
- `packages/cli/src/cli/commands/run.ts:runEmulatorPipeline` — pass the addon list to the vite plugin's spawnFrontendVite call.
- `packages/cli/frontend/src/components/Deck.tsx` — read from `virtual:sireno/addons/registry`, render each button's addon component inside `<ButtonFrame>`.
- `packages/cli/src/api/protocol-internal.ts:stateMessageSchema` — the existing `state` channel WS message. Extend to support per-channel namespaced publishes.
- All 7 builtin addons' `index.ts` + `buttons/*.tsx` — source of truth for config schema. The new `frontend.tsx` files reuse the same addon's channel namespace and state types.
- `packages/cli/src/addon/api.ts:AddonManifest` — extend with `publishIntervalMs?: number` for rate-limited channel cadence.

</canonical_refs>

<code_context>

## Existing Code Insights

### Reusable Assets

- **`virtual:sireno/addons` virtual module** — already emitted by the vite plugin with `addons: [{ name, main, styles }]`. Currently no frontend imports it. Extend it to emit `virtual:sireno/addons/registry` with `{ type → { addonName, Component } }` (the addon imports per type, mapped from each builtin's `buttons/index.tsx`).
- **`useAddonChannel<T>(channel)`** — already exists, already tested. Returns the latest payload from `ChannelRegistry`.
- **`useButtonAction(buttonId)`** — already exists. Returns `(action: string) => void` that publishes to `runtime:button-tap`.
- **ChannelRegistry** — pub-sub bus in the frontend; subscribes from `WS state` messages, publishes from anywhere. Already used by `frontend/src/App.tsx` and `emulator/src/App.tsx`.
- **`buildAddonsImports`** in `virtual-modules.ts` — already builds the JS that imports each addon's frontend. Reuse for the registry.

### Established Patterns

- **WS protocol v3** — `state` message carries `channels: Record<string, unknown>`. Currently the frontend publishes `state` from the WS bridge; reverse it so the CLI publishes `state` to the frontend (which already subscribes via `ChannelRegistry`).
- **Theme tokens via Tailwind v4 `@theme`** — addon frontends use the same `bg-bar`, `text-fg`, `text-muted` classes the theme uses. No CSS-in-JS.
- **Addon manifest contract** — already includes `frontend?: { main: string; styles?: string[] }`. Extend with `publishIntervalMs?: number` (per-channel cadence).

### Integration Points

- **CLI startup** (`run.ts:runEmulatorLifecycle`) — collects the list of built-in addons (scan `packages/cli/src/builtin-addons/*/index.ts` for `frontend: { main: "..." }`) and passes them to `spawnFrontendVite({ addons: [...] })`.
- **OS poll lifecycle** — `runtime:deck-active` channel fires when the active deck changes. CLI tracks which addon types are visible in the current deck; starts/stops OS polls accordingly.
- **Vite plugin emits the addon registry** at config-time, picking up each builtin's `frontend: { main }`. The registry is consumed by the frontend's `Deck.tsx`.

</code_context>

<deferred>
## Deferred Ideas

- **Bundle npm addons at build time** (via the same vite plugin pre-bundling used for built-ins) — would let npm addons ship a true cross-platform build. Out of scope: requires npm addons to publish a TS source that the consumer's vite plugin can compile. Defer to a future phase.
- **Live state editor in dev** — a small overlay on the emulator showing which channels are currently publishing and their last values. Debug tool. Out of scope.
- **Animations between state updates** — e.g., a flash when the clock ticks, a pulse when the weather updates. Theme concern, not addon. Defer.
- **Custom theme components per addon** — letting addons ship their own theme components. Would conflict with the theme's `components` export. Skip unless a real use case arises.

</deferred>

---

_Phase: 12-addon-frontend-registry_
_Context gathered: 2026-06-27_
