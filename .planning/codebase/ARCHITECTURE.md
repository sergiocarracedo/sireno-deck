# Architecture

## System Shape

- Single-package CLI runtime inside a pnpm workspace, with built-in addons as separate workspace packages
- No server/client split, no database, no background web service
- Main execution path is: CLI command -> config/bootstrap -> addon registry/loading -> theme resolution -> device lifecycle -> runtime render loop

## Main Runtime Flow

1. `packages/cli/src/cli/index.ts` parses commands with `yargs`
2. `start` command enters `packages/cli/src/cli/commands/start.ts`
3. `loadBootstrapConfig()` and `loadConfiguredAddons()` assemble addon registry before full config validation
4. `loadConfig()` validates the final config against the registry-backed schemas
5. `resolveTheme()` loads theme tokens
6. `createStreamDeckLifecycle()` opens the device and manages reconnects
7. `createDeckRuntime()` instantiates button instances and routes input, scheduling, invalidation, and rendering
8. `renderDeck()` plus `renderTextImage()` convert custom React output into raw key buffers for hardware writes

## Key Layers

- `cli/`: yargs command definitions and CLI entrypoints
- `config/`: config and theme loading
- `core/`: zod schemas and domain config shaping
- `addon/`: addon manifest validation, loading, registry, and built-in addon registration
- `deck/`: runtime orchestration and deck controller behavior
- `render/`: custom React reconciler, polling scheduler, image rendering
- `device/`: Stream Deck discovery, connection lifecycle, write caching, reconnect behavior
- `util/`: daemon, logging, and error formatting helpers

## Architectural Patterns

- Registry-backed extension model: button and deck definitions are looked up from an addon registry assembled before full config validation
- Stateful button instances: runtime instances expose lifecycle hooks like `onTap`, `refresh`, `dispose`, and `render` through the addon API in `packages/cli/src/addon/api.ts`
- Core-owned orchestration: addons define behavior and visuals, but scheduling, navigation, command helpers, and render invalidation are owned by `packages/cli/src/deck/runtime.ts`
- Narrow render contract: custom React intrinsic elements (`deck-button`, `deck-text`, `deck-surface`) are interpreted by the reconciler in `packages/cli/src/render/reconciler.ts`

## Data Flow

- YAML config -> bootstrap schema -> addon registry -> full schema validation -> `DeckConfig` / `ButtonInstance`
- `ButtonInstance.definition.createInstance(...)` -> runtime instance -> React element -> render description -> SVG/image buffer -> Stream Deck key write
- Device reconnect replays or re-renders current deck state via lifecycle callback in `packages/cli/src/cli/commands/start.ts`

## Architecture Constraints

- Addon API is a versioned contract and treated as hard to reverse in `.planning/STATE.md`
- Rendering is intentionally not DOM-based; React is used as a structural DSL for image descriptions
- The renderer and runtime remain the most central coupling points for new milestone work
