# Testing

Vitest ^4.1.9. Node default, jsdom for the two Vite SPA projects.

## Configuration

`vitest.config.ts` at repo root:

- `globals: false` — explicit imports of `describe / it / expect / vi`.
- `environment: "node"` default.
- `environmentMatchGlobs: [["packages/cli/frontend/**", "jsdom"], ["packages/cli/emulator/**", "jsdom"]]`.
- `setupFiles: ["./packages/cli/emulator/src/__tests__/setup.ts"]` — imports `@testing-library/jest-dom/vitest` and runs `cleanup()` after each test.
- Coverage via `v8`, scoped to `packages/cli/src/**/*.ts` (excludes `__tests__`).
- Aliases: `@` → `packages/cli/src`, `@sireno-deck/cli` → `packages/cli/src/index.ts`, `sireno-deck/react` → React API. Virtual module mocks for `virtual:sireno/{token,theme,themes/manifest,addons/registry}`.

## Layout

- Tests are **co-located** under `__tests__/` next to the module they cover.
- File pattern: `*.test.ts` or `*.test.tsx`.
- Aliases match the dev aliases (`@/`, `@sireno-deck/cli`, `virtual:sireno/*`).
- 95 test files, ~762 individual tests as of last run.

## Running

```
pnpm test                       # vitest run, all suites
pnpm test:watch                 # vitest watch mode
pnpm --filter sirenodeck test   # scoped
```

## Mock approach

### `vi.fn()` and `vi.spyOn()` (dominant pattern)

Most tests construct inline mocks with `vi.fn()`:

```ts
const silentLogger = () => createLogger({ level: "silent" })

const makeBridge = () => ({
  broadcast: vi.fn(),
  sendToCaller: vi.fn(),
  onMessage: () => () => undefined,
  onConnection: () => () => undefined,
  close: async () => undefined,
})
```

The codebase **does not use MSW or nock** — HTTP calls are either mocked at the module level or the test exercises real I/O (e.g., `executor.test.ts` runs real `echo` commands).

### `vi.mock()` for module-level mocking

Used sparingly, primarily when testing code that imports a module at the top level:

```ts
vi.mock("../provider/fetch", () => ({
  fetchWeather: vi.fn(),
}))
const fetchMod = await import("../provider/fetch")
const fetchWeatherMock = (fetchMod as unknown as { fetchWeather: ReturnType<typeof vi.fn> }).fetchWeather
```

### Fake timers

`vi.useFakeTimers()` / `vi.useRealTimers()` in `beforeEach`/`afterEach` pairs. Standard pattern:

```ts
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
})
afterEach(() => {
  vi.useRealTimers()
})
```

Timer-driven tests use `vi.advanceTimersByTimeAsync(ms)` + a small flush helper.

### Interface-based mocks (manual)

When testing a class or module that accepts a provider interface, tests create minimal fake objects that implement the interface shape:

```ts
const makeFakeProvider = (initial: ActiveAppSnapshot | null): FakeProvider => ({
  snapshot: initial,
  calls: { getActive: 0, stop: 0 },
  async getActive() { ... },
  async stop() { ... },
})
```

### Virtual module mocks (frontend/emulator)

Located in `packages/cli/frontend/src/__mocks__/`:
- `token.ts`, `theme.ts`, `themes-manifest.tsx`, `addons-registry.ts`

These are resolved by the `virtual:sireno/*` aliases in `vitest.config.ts` so frontend tests can render React components without a running daemon.

### System provider overrides

The runtime exposes setter methods that tests use as seams:
- `runtime.setKeyMacroProvider({ sendKey, stop })` 
- `runtime.setClipboardProvider({ writeText, readText, stop })`
- `runtime.setActiveAppProvider(provider)`

### ChannelRegistry reset

React hook tests call `ChannelRegistry.resetForTests()` in `beforeEach`/`afterEach` to prevent cross-test state leakage.

## Test patterns

### Pure unit tests (majority)

Import the function under test, call it with known inputs, assert outputs. No setup/teardown:

```ts
import { describe, expect, it } from "vitest"
import { paginate } from "../pagination"

describe("paginate", () => {
  it("empty list returns 0 pages", () => {
    const result = paginate([], { keyCount: 15 })
    expect(result.pages).toHaveLength(0)
  })
})
```

### Setup-function tests (runtime, methods, etc.)

A `setup()` helper wires the full dependency graph with fakes:

```ts
const setup = (decks: ReadonlyArray<RuntimeDeck>) => {
  const pubSub = createPubSub()
  const store = createStore()
  const executor = createActionExecutor({ host: getHostContext() })
  const runtime = createRuntime({ decks, pubSub, store, logger: silentLogger(), ... })
  const methods = createMethods({ runtime, pubSub, store, executor, logger: silentLogger() })
  return { runtime, pubSub, store, methods }
}
```

### Factory/override helpers

Tests define `make*` helpers for common fixtures:

- `makeDeck(overrides)` — partial overrides on a default `RuntimeDeck`
- `makeFakeProvider(initial)` — mock `ActiveAppProvider`
- `makeCtx()` — mock `AddonServiceContext` with `AbortController`
- `makeMockPlaywright()` — mock Playwright browser/context/page chain
- `baseConfig(overrides)` — partial overrides on a default `RawConfig`

### WebSocket integration tests

Real WS server + client tests (not mocked):

```ts
bridge = await startWsBridge()
const socket = await openClient(bridge.port)
// send/receive messages, assert protocol behavior
```

These are genuine integration tests — they start a real WS server on a random port.

### React component tests

Use `@testing-library/react` with `render()`, `renderHook()`, `fireEvent.click()`, `act()`. The `/** @vitest-environment jsdom */` directive marks `.tsx` test files that need DOM.

## Known state

- **~8 test failures in 4 files** as of last run (754 passed / 762 total, 91/95 files passing). Failures are in:
  - `packages/cli/src/builtin-addons/weather/__tests__/frontend.test.tsx` — `getByRole("button")` not finding element (layout change).
  - A few others in the weather/media addon tests. These are pre-existing, not regressions from new work.
- Do NOT attempt drive-by fixes; they tend to mask issues in adjacent suites.

## What coverage looks like

- **Service-side:** addon registry, runtime, gesture state, addon-handler-bridge, system providers, config validation/schemas, WS bridge, state publisher, browser renderer, action executor, daemon utils, pagination, pub/sub, store, protocol.
- **Frontend:** Deck render, system-buttons render, app navigation, WS integration, React hooks (`useAddonChannel`, `useDeck`).
- **Emulator:** gesture detection, bridge, DeckFrame, shell render.
- **Per-addon:** `emoji-selector` (decks + emoji + launcher), `core` (action + change-deck + page-nav + index), `weather` (backend + frontend), `media` (backend + progress), `brightness` (linux provider), `date-time` (format), `session`, `internal-settings`.
- **System providers:** per-platform tests for `active-app`, `key-macro`, `session` (darwin/linux/windows variants).

## Conventions

- New test files go under co-located `__tests__/` dirs.
- Tests should fail meaningfully — `expect(x).toBe(y)`, not `expect(x).toBeTruthy()`.
- Use `// arrange / act / assert` is OK in tests where the test body is non-trivial. Do not over-comment.
- TDD is **not** the project default. Write tests alongside implementation, not before.
- Use `silentLogger()` (from `createLogger({ level: "silent" })`) for all test loggers — never real logging in tests.
- Clean up after tests: `bridge.close()`, `vi.useRealTimers()`, `vi.restoreAllMocks()`.
- One `describe` block per module/function being tested. Nested `describe` for logical grouping (e.g., `describe("invokeAction guard — inactive deck")`).
