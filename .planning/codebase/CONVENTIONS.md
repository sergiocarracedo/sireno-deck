# Conventions

Sireno Deck has a lean, opinionated style. The architecture is the spec; conventions here make changes cheap.

## Code style

- **Strict TypeScript.** `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables`, `noFallthroughCasesInSwitch`. No `any` outside boundary shims (and when used, `eslint-disable` comment required — see `runtime.test.ts:407`).
- **No comments by default.** Match existing style. If a comment is needed, name the ceiling or the non-obvious invariant — never narrate.
- **oxfmt + oxlint** as the only formatter/linter. No ESLint, no Prettier.
  - Formatter config: `semi: false`, `singleQuote: true`, `trailingComma: "all"`, `printWidth: 80` (`.oxfmtrc.json`), `tabWidth: 2` (`oxfmt.json`).
  - Linter plugins: `import`, `typescript`. Rules enforced: `import/extensions` (no extensions on TS/JS), `no-restricted-imports` (no cross-process imports, no deep relative paths).
- **Import alias `@/*`** for paths 3+ levels up. Enforced by `.oxlintrc.json`. The alias maps to `packages/cli/src/*`.
- **No default exports.** Named exports only — easier to refactor, easier to find with code search.
- **No barrel files** unless the directory is a public API surface (`addon/api.ts`, `addon/index.ts`). Inside `src/`, barrel `index.ts` files exist per domain directory (`core/index.ts`, `deck/index.ts`, etc.) but not deeper.
- **ES modules throughout.** `"type": "module"` in both root and `packages/cli/package.json`. `pnpm-workspace.yaml` defines the monorepo. Node >= 20.
- **2-space indent, no tabs.** Enforced by oxfmt.

## Patterns

- **Factory functions over classes.** `createStore()`, `createPubSub()`, `createRuntime()`, `createLogger()`, `createGestureDetector()`, `createActionExecutor()`. The codebase consistently uses `create*()` factory functions returning plain objects (or minimal closures) — not `new Class()` constructors.
- **Two addon-deck shapes:** `AddonDeckFactory` (no config) vs `AddonDeckDefinition` (config-aware). **Prefer `AddonDeckDefinition` for new code.**
- **Two button-backend contexts:** per-button (`AddonButtonServiceContext`) vs per-addon-global (`AddonGlobalService`). The runtime wires both.
- **Service-driven nav.** Active deck is decided by the runtime; frontend URL is read-only projection. Never let the SPA decide navigation.
- **Gesture-source-agnostic runtime.** Each transport owns detection (real: `device.onKeyEvent`; emulator: `emulator/gesture.ts`); runtime only sees `tap | dbl-tap | hold`.
- **Wire format is gestures.** No raw `key-event` messages. `button-action {deckId, position, gesture}` only.
- **Provider pattern for system services.** Each platform-specific capability (active-app, key-macro, session, media, clipboard, brightness) is an interface with per-platform implementations. Wired during preflight via setter methods on the runtime/methods context. Test seams: `runtime.setKeyMacroProvider()` / `setClipboardProvider()`.
- **Logger injection.** `createLogger({ level: "silent" })` is the standard silent logger for tests. `pino` is the logging library. Logger is always passed as a dependency, never imported as a singleton.
- **`ReadonlyArray` and `readonly` used liberally.** Return types prefer `ReadonlyArray<T>` over `T[]` in public APIs. Interface fields marked `readonly`.

## Naming

- **"Service" = the long-lived Node daemon.** "Backend" is ambiguous (could mean daemon, addon backend, or protocol peer) — avoid in new code. `*Backend` rename to `*Service` is the long-running migration (P8).
- **Addon namespace:** `${addonName}:` prefix on every key in `manifest.buttonTypes` and `manifest.decks`. Enforced by registry.
- **Channel IDs:** `addon:domain:thing` style. Per-button gestures: `runtime:gesture:${buttonId}`.
- **Function naming:** verb-first camelCase for functions (`createStore`, `resolveDaemonPaths`, `compileDeckMatcher`). `get*` for pure getters, `is*` / `has*` for predicates, `resolve*` for computation with potential side effects (like path resolution).
- **Type naming:** PascalCase for interfaces/types (`DaemonPaths`, `RuntimeDeck`, `BootstrapIssue`). Types exported alongside their implementations.
- **File naming:** kebab-case for all source files (`gesture-state.ts`, `ws-bridge.ts`, `browser-renderer.ts`). Test files append `.test.ts` / `.test.tsx`.

## Validation

- **Zod for schema validation.** Config schemas (`config/schemas.ts`), WS protocol schemas (`api/protocol-internal.ts`), and per-addon button config schemas all use Zod.
- **Use `.min().max("msg")` directly.** Never `.refine()` / `.superRefine()` — they wrap in `ZodEffects` and break `.shape` consumers.
- **Use `.strict()` on all object schemas.** Prevents unknown keys from slipping through.
- **Use `z.enum()` for string unions, `z.union()` for mixed shapes.** `safeParse()` is preferred over `parse()` for recoverable errors; `parse()` is fine for "this must never fail" paths.
- **Schemas live next to the type they describe.** `addon/api.ts` is the canonical example. `config/schemas.ts` groups the config tree schemas.

## Error handling

- **Per-button ErrorBoundary** in `Deck.tsx` — one broken button doesn't kill the deck.
- **`showRuntimeButtonError`** in the runtime surfaces backend errors back to the UI.
- **Providers throw on failure** (e.g. key-macro). The runtime catches and surfaces.
- **Custom error classes** for domain errors: `ActionError` in `action/executor.ts` with structured fields (`command`, `exitCode`, `stdout`, `stderr`, `durationMs`).
- **Validation returns issue arrays, not throws.** `validateBootstrap()` and `validateFull()` return `{ issues: BootstrapIssue[] }` — callers decide whether to bail.
- **Graceful degradation in pollers.** Weather backend catches fetch errors and returns `{ available: false, description: "..." }` instead of crashing. StatePublisher logs warnings on poll throws (`state-publisher.test.ts:96-115`).
- **try/catch around I/O.** `daemon.ts:readChildren()` wraps `JSON.parse` in try/catch and returns `null` on failure. `daemon.ts:writeToken()` uses `openSync` + `fchmodSync` in a try/finally to ensure fd cleanup.
- **`useUnknownInCatchVariables: true`** in tsconfig — catch variables are `unknown`, requiring explicit narrowing (e.g., `(error as NodeJS.ErrnoException).code`).

## Logging

- **`pino`** is the logging library. `createLogger()` in `util/logger.ts`.
- **Human-readable by default.** `HumanWritable` stream formats JSON lines with ANSI colors. `--json` flag switches to raw JSON.
- **Structured context fields.** Logger calls use pino's object-first API: `logger.info({ pid, pidFile }, "daemon started")`. Standard context fields are whitelisted in `CONTEXT_FIELDS`.
- **Error serialization.** Custom `errorSerializer` captures `name`, `message`, `stack` (only when `SIRENO_LOG_VERBOSE=1`), and attaches `issues` for Zod errors.
- **Redaction.** `err.raw` is redacted in logs by default.

## What NOT to do

- Don't import from `packages/cli/src/` into `packages/cli/frontend/` or `packages/cli/emulator/`. oxlint will block.
- Don't emit `button-action` from the chrome SPA. The chrome SPA is display-only; emulator SPA owns emission.
- Don't use `.refine()` / `.superRefine()` on Zod schemas.
- Don't add barrel re-exports inside `packages/cli/src/` unless it's a public API surface.
- Don't write a new gesture detector — extend `core/gesture-state.ts`.
- Don't push past `EXACT 1 of each concern per commit`. One PR = one concern.
- Don't use classes for new domain logic — prefer factory functions returning plain objects / closures.
- Don't default-export React components — named exports only.
- Don't import `@/` deep from outside the monorepo package boundary — the alias is internal.
