# Testing

## Framework

- Test runner: `vitest`
- Config: `packages/cli/vitest.config.ts`
- Environment: `node`
- Pattern: `src/**/*.test.ts`

## Test Style

- Tests live adjacent to source modules
- Most tests are unit/integration-style module tests rather than end-to-end hardware tests
- The suite uses `vi.fn()`, `vi.waitFor()`, temp directories, and direct dependency injection instead of a heavyweight mocking framework

## Representative Coverage

- Config parsing and validation: `packages/cli/src/config/loader.test.ts`
- Theme resolution: `packages/cli/src/config/theme.test.ts`
- Runtime behavior and addon invalidation/navigation: `packages/cli/src/deck/runtime.test.ts`
- Render contract: `packages/cli/src/render/reconciler.test.ts`
- Scheduler behavior: `packages/cli/src/render/scheduler.test.ts`
- Built-in addon behavior: tests under `builtin-addons/*/src/*.test.ts`

## Testing Patterns

- Temporary filesystem setup is common for config loader and theme tests
- Runtime tests simulate key events by injecting `subscribeKeyEvents`
- Addon-backed config validation is tested through registry injection
- Visual rendering behavior is largely asserted at the render-description or buffer-generation layer, not through screenshot fixtures

## Coverage State

- There is strong coverage for config validation, runtime orchestration, addon loading, and render description shaping
- There is less evidence of broad integration or manual-hardware automation; real hardware validation still matters and is explicitly referenced in planning/UAT artifacts

## How To Run Tests

- Workspace: `pnpm test`
- CLI package only: `pnpm --filter sireno-deck-cli test`
- Focused module slices are commonly run with `pnpm --filter sireno-deck-cli test -- <pattern>`
