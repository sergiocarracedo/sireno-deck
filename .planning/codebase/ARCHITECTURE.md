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
7. `createDeckRuntime()` adapts addon button definitions into runtime instances, owns input/scheduling/navigation/invalidations, and renders the active deck through a mounted React host in Node
8. `renderDomDeck()` plus the browser screenshot/crop path convert mounted deck HTML into raw key buffers for hardware writes

## Key Layers

- `cli/`: yargs command definitions and CLI entrypoints
- `config/`: config and theme loading
- `core/`: zod schemas and domain config shaping
- `addon/`: addon manifest validation, loading, registry, and built-in addon registration
- `deck/`: runtime orchestration and deck controller behavior
- `render/`: mounted DOM host, browser screenshot/crop renderer, and polling scheduler
- `device/`: Stream Deck discovery, connection lifecycle, write caching, reconnect behavior
- `util/`: daemon, logging, and error formatting helpers

## Architectural Patterns

- Registry-backed extension model: button and deck definitions are looked up from an addon registry assembled before full config validation
- Mounted button definitions with adapted runtime instances: addons now author buttons through `render(props)` plus definition-level handlers, while `packages/cli/src/addon/api.ts` adapts that public contract into the runtime's instance seam for compatibility
- Core-owned orchestration: addons define behavior and visuals, but scheduling, navigation, command helpers, and render invalidation are owned by `packages/cli/src/deck/runtime.ts`
- Mounted active-deck host: `packages/cli/src/render/dom-host.tsx` keeps one mounted React tree per active deck in Node, preserves component-local state while that deck stays active, serializes the current host tree to HTML, and unmounts the tree when the deck exits

## Data Flow

- YAML config -> bootstrap schema -> addon registry -> full schema validation -> `DeckConfig` / `ButtonInstance`
- `ButtonInstance.definition.render(props)` / definition-level handlers -> adapted runtime instance -> mounted active-deck React tree in Node -> deck HTML -> browser screenshot/crop -> Stream Deck key write
- Device reconnect replays or re-renders current deck state via lifecycle callback in `packages/cli/src/cli/commands/start.ts`

## Architecture Constraints

- Addon API is a versioned contract and treated as hard to reverse in `.planning/STATE.md`
- Node remains the owner of hardware semantics, navigation, polling, command execution, and addon-store lifetime even though the active deck now mounts as a React tree
- The browser renderer is still an HTML-in screenshot/crop transport seam rather than a separate addon runtime
- The renderer and runtime remain the most central coupling points for new milestone work
