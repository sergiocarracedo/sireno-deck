# Conventions

## Language / Module Style

- TypeScript strict mode is enabled in `packages/cli/tsconfig.json`
- The repo uses ESM throughout (`type: module`), with explicit `.js` import suffixes in TS source
- Functions are generally small and direct; indirection is used more for boundaries than abstraction purity

## Validation And Error Handling

- `zod` is the standard schema/validation layer for config and addon payloads
- Rich config errors are normalized through `ConfigValidationError` in `packages/cli/src/core/schemas.ts`
- Loader and theme code preserve file path, line number, and suggestions rather than throwing raw parser errors
- Addon loader isolates broken addons as warnings, but API version mismatch is treated as fatal in `packages/cli/src/addon/loader.ts`

## Addon Model

- Addons export a default `SirenoAddon` object
- Buttons are stateful runtime instances with hooks like `onTap`, `refresh`, `dispose`, and `render`
- Core owns scheduling, navigation, invalidation, and command execution; addons consume injected methods from `packages/cli/src/addon/api.ts`
- Built-in addons are expected to follow the same registry path as external addons

## Rendering Idioms

- React is used as a custom render description language, not as DOM UI
- The custom intrinsic element set is narrow: `deck-button`, `deck-text`, `deck-surface`
- Render output is flattened into `RenderDescription[]` in `packages/cli/src/render/reconciler.ts`
- Image generation is SVG-string-based, then rasterized through `sharp` in `packages/cli/src/render/text-image.ts`

## Logging / Daemon Style

- Logging is structured through `pino`
- CLI startup and lifecycle code prefer explicit logging for state transitions (connected, rendered, started)
- Foreground daemon behavior is intentionally kept alive with an explicit interval in `packages/cli/src/cli/commands/start.ts`

## What Not To Do

- Do not bypass config validation with ad hoc parsing when a zod schema should own the contract
- Do not add a second scheduling model inside addons; runtime owns polling today
- Do not assume deck render elements are DOM nodes; they are custom reconciler nodes
- Do not special-case built-ins in runtime if the same behavior can live in the addon registry path
