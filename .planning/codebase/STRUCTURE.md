# Structure

Repo is a **pnpm workspace** with a single package (`@sireno-deck/cli`) and three Vite projects bundled inside it.

```
sireno-deck/
├── ARCHITECTURE.md          ← architectural source of truth
├── MIGRATION-NOTES.md       ← legacy decisions index (post-nuke)
├── README.md                ← quick start + CLI reference
├── CHANGELOG.md
├── config.yml               ← example/dev config
├── package.json             ← workspace root (scripts: dev/build/test/lint)
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── tsconfig.base.json       ← strict TS shared config
├── vitest.config.ts         ← jsdom for frontend/emulator, node elsewhere
├── oxfmt.json, .oxfmtrc.json
├── .oxlintrc.json           ← import boundary enforcement
├── assets/                  ← icons referenced by config.yml
├── docs/
│   └── architecture.mmd     ← mermaid diagram of the system
├── packages/
│   └── cli/
│       ├── package.json
│       ├── bin/             ← CLI shim
│       ├── src/             ← Node service
│       │   ├── index.ts     ← daemon entry
│       │   ├── addon/       ← api.ts (AddonManifestV1) + registry
│       │   ├── api/         ← protocol zod schemas + react adapter
│       │   ├── action/      ← executor (execa wrapper)
│       │   ├── builtin-addons/  ← 11 first-party addons (TS source)
│       │   │   ├── core/           — core:action/change-deck/toggle/...
│       │   │   ├── internal-settings/
│       │   │   ├── session/
│       │   │   ├── date-time/
│       │   │   ├── emoji-selector/ — emoji-selector:launcher/category/emoji/...
│       │   │   ├── media/
│       │   │   ├── system-status/
│       │   │   ├── value-display/
│       │   │   ├── weather/
│       │   │   ├── brightness/
│       │   │   ├── test-buildin/
│       │   │   ├── index.ts        ← manifest aggregator
│       │   │   └── register-builtins.ts
│       │   ├── cli/         ← yargs command tree (run, start, stop, status)
│       │   ├── config/      ← loader + zod schemas for config.yml
│       │   ├── core/        ← pub-sub, store, pagination, gesture-state
│       │   ├── deck/        ← runtime, addon-handler-bridge, system-back-injection
│       │   ├── device/      ← Stream Deck connection + per-model handlers
│       │   ├── outputClient/  ← OutputClient abstraction (real + emulator)
│       │   ├── render/      ← WS bridge + protocol
│       │   ├── system/      ← per-platform providers
│       │   ├── themes/      ← theme loader
│       │   ├── ui/          ← React primitives + surfaces (theme-driven)
│       │   ├── util/
│       │   ├── version.ts
│       │   └── __tests__/   ← co-located test files
│       ├── themes/          ← built-in theme YAML files
│       ├── fixtures/        ← schema + config fixtures
│       ├── frontend/        ← Vite SPA — renders the active deck
│       │   └── src/
│       │       ├── App.tsx, main.tsx
│       │       ├── components/ (Deck, ButtonFrame, ErrorBoundary)
│       │       ├── bridge/   (typed WS client)
│       │       └── __mocks__/ (virtual module stubs for tests)
│       ├── emulator/        ← Vite SPA — embeds frontend + click overlay
│       │   └── src/
│       │       ├── App.tsx, main.tsx
│       │       ├── gesture.ts  (own gesture detector)
│       │       └── DeckFrame.tsx
│       └── README.md
└── .planning/               ← learnship artifacts (just re-scaffolded)
```

## Naming conventions

- **Files:** lowercase, kebab-case for multi-word (`addon-handler-bridge.ts`).
- **Classes/types:** PascalCase.
- **Functions/vars:** camelCase.
- **Constants:** SCREAMING_SNAKE (`HOLD_ACTION_DELAY_MS`, `PROTOCOL_VERSION`).
- **Addon manifests:** `${addonName}:` namespace prefix (enforced by registry).
- **YAML config:** `snake_case` keys.
- **Test files:** `*.test.ts` / `*.test.tsx` in co-located `__tests__/` dirs.

## Where to find things

- "What does a button type look like?" → `packages/cli/src/builtin-addons/core/buttons/{action,change-deck,...}/`.
- "How does the runtime navigate?" → `packages/cli/src/deck/runtime.ts`.
- "What's the WS protocol?" → `packages/cli/src/api/protocol-internal.ts` + `render/protocol.ts`.
- "Where does gesture detection live?" → `packages/cli/src/core/gesture-state.ts` (shared) + `packages/cli/emulator/src/gesture.ts` (emulator only).
- "How do I write a 3rd-party addon?" → `ARCHITECTURE.md §3.5` + `packages/cli/src/addon/api.ts` + any builtin's README.