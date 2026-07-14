# Testing

Vitest ^4.1.9. Node default, jsdom for the two Vite SPA projects.

## Configuration

`vitest.config.ts` at repo root:

- `globals: false` — explicit imports of `describe / it / expect`.
- `environment: "node"` default.
- `environmentMatchGlobs: [["packages/cli/frontend/**", "jsdom"], ["packages/cli/emulator/**", "jsdom"]]`.
- `setupFiles: ["./packages/cli/emulator/src/__tests__/setup.ts"]` — emulator-specific.
- Coverage via `v8`, scoped to `packages/cli/src/**/*.ts` (excludes `__tests__`).

## Layout

- Tests are **co-located** under `__tests__/` next to the module they cover.
- File pattern: `*.test.ts` or `*.test.tsx`.
- Aliases match the dev aliases (`@/`, `@sireno-deck/cli`, `virtual:sireno/*`).

## Mock approach

- **WS bridge mock** lives in `packages/cli/frontend/src/__mocks__/` — provides stubs for `virtual:sireno/{token,theme,themes/manifest,addons/registry}` so component tests don't need a running daemon.
- **System provider overrides** via `runtime.setKeyMacroProvider` / `setClipboardProvider` (test seams).
- **Addon tests** use real manifests and let the registry validate them.

## Running

```
pnpm test                       # vitest run, all suites
pnpm test:watch                 # vitest watch mode
pnpm --filter sirenodeck test   # scoped
```

## Known state (do not touch without forensics)

- **79 pre-existing failures in `packages/cli/src/deck/runtime.test.ts`** — Phase 42/67 system-back-injection firing in test contexts. Flagged for future forensics. Do NOT attempt drive-by fixes; they tend to mask issues in adjacent suites.
- Several test files were added with the v1.7 tail (gesture migration): `packages/cli/emulator/src/__tests__/gesture.test.ts`, `packages/cli/src/builtin-addons/core/__tests__/index.test.ts`, `packages/cli/src/builtin-addons/core/__tests__/page-nav.test.ts`, `packages/cli/src/builtin-addons/emoji-selector/__tests__/{decks,emoji}.test.ts`, `packages/cli/src/deck/__tests__/paginate-deck.test.ts`, `packages/cli/frontend/src/__tests__/{deck-render,system-buttons-render}.test.tsx`.

## What coverage looks like

- Service-side: addon registry, runtime, gesture state, addon-handler-bridge, system providers.
- Frontend: Deck render, system-buttons render (P5/P6 wiring).
- Emulator: per-transport gesture detector.
- Per-addon: `emoji-selector` (decks + emoji), `core` (action + change-deck + index).

## Conventions

- New test files go under co-located `__tests__/` dirs.
- Tests should fail meaningfully — `expect(x).toBe(y)`, not `expect(x).toBeTruthy()`.
- Use `// arrange / act / assert` is OK in tests where the test body is non-trivial. Do not over-comment.
- TDD is **not** the project default. Write tests alongside implementation, not before.