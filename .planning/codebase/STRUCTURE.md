# Structure

## Top-Level Layout

- `packages/cli/`: main CLI application package
- `builtin-addons/`: bundled addon packages shipped with the CLI
- `themes/`: built-in theme YAML files
- `.planning/`: roadmap, phase plans, research, quick tasks, and milestone state
- `config.yml`: shipped example/default config surface
- `AGENTS.md`: persistent repo-specific operating instructions

## CLI Source Layout

`packages/cli/src/` currently contains:

- `action/`: command execution helpers
- `addon/`: addon API, loader, manifest, registry, built-in addon wiring
- `cli/`: entrypoint plus `start`, `stop`, `status`
- `config/`: config + theme resolution
- `core/`: schemas and normalized config types
- `deck/`: runtime orchestration and deck controller logic
- `device/`: Stream Deck integration and platform/device concerns
- `render/`: reconciler, scheduler, SVG/image generation
- `system/`: system data helpers
- `util/`: daemon, error formatting, logger

## Built-In Addons

- `builtin-addons/core-buttons/`: display/change-deck style built-ins
- `builtin-addons/emoji-selector/`: addon used as the extension-model proof
- `builtin-addons/date-time/`: new workspace addon package boundary for date/time-related buttons

## Planning Structure

- `.planning/phases/`: per-phase research, context, plans, summaries, verification, UAT
- `.planning/quick/`: quick-task artifacts and summaries
- `.planning/research/`: broader research artifacts for project/milestone scope
- `.planning/codebase/`: codebase map output created by this workflow

## Naming Conventions

- ESM imports generally use `.js` extension in TypeScript source
- Tests live beside source in `src/**/*.test.ts`
- Planning files use numeric prefixes like `05-01-PLAN.md`, `05-VERIFICATION.md`, `011-SUMMARY.md`
- Theme and config user-facing keys are YAML snake_case, e.g. `main_deck`, `select_command`, `interval_ms`

## Where To Find Important Things

- CLI startup path: `packages/cli/src/cli/index.ts` and `packages/cli/src/cli/commands/start.ts`
- Addon extension seam: `packages/cli/src/addon/api.ts`, `packages/cli/src/addon/loader.ts`, `packages/cli/src/addon/registry.ts`
- Runtime behavior: `packages/cli/src/deck/runtime.ts`
- Rendering seam: `packages/cli/src/render/reconciler.ts` and `packages/cli/src/render/text-image.ts`
- Device lifecycle: `packages/cli/src/device/stream-deck.ts`
- Config/theme validation: `packages/cli/src/config/loader.ts`, `packages/cli/src/config/theme.ts`, `packages/cli/src/core/schemas.ts`
