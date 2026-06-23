---
phase: 02-config-addons
status: done
completed: 2026-06-23
---

# Phase 02 — Config + Addon Loader

Goal: `config.yml` schema, loader with line-aware errors, `@file.yml` inline imports, icon resolver, addon loader + registry, hot-reload watcher.

## Files created

### packages/cli/src/config/
- `schemas.ts` — zod schemas (`.strict()` everywhere): `TriggerSchema`, `ButtonDefSchema`, `ButtonEntrySchema`, `DeckDefSchema`, `AddonEntrySchema`, `LoggingSchema`, `SessionSchema`, `RawConfigSchema`
- `icon-resolver.ts` — `resolveIconRef(ref, ctx)` → `IconSource` union (path | cli-builtin | builtin-addon | addon). Schemes: `icon://`, `builtin://`, `addon://`, relative
- `builtin-icons.ts` — `BUILTIN_CLI_ICONS: ReadonlySet<string>` (45 ids) + `defaultResolveHome`
- `loader.ts` — `loadConfigFile`, `loadConfig`; YAML via `yaml.parseDocument` w/ `keepSourceTokens`; `ConfigLoadError` with `ConfigError[]` formatted via `formatLineCol`
- `reference-expander.ts` — `expandButtonReferences(raw, configDir)`: walks `decks.*.buttons`, expands `^@(.+)$` entries recursively
- `discovery.ts` — `findConfigPath`: `--config > $SIRENO_CONFIG > cwd/config.yml > $XDG_CONFIG_HOME/sireno-deck-2/config.yml`
- `validation.ts` — `validateBootstrap(config)`: checks `decks.main` exists + scans duplicate positions. `BootstrapIssue[]` with `level: 'error' | 'warning'`
- `index.ts` — barrel

### packages/cli/src/addon/
- `api-types.ts` — `SIRENO_ADDON_API_VERSION = 3`, `SirenoAddon` type, `isSirenoAddon` type guard
- `api.ts` — runtime types: `AddonButtonTypeDefinition`, `AddonDeckDefinition`, `AddonGeneratedDeck`, `AddonManifest`, `ResolvedSirenoAddon`, `AddonRegistry`, `AddonLoadIssue`
- `manifest.ts` — `readManifest({addonRoot})` reads `package.json`, validates `sirenoAddon.{apiVersion, main, frontend?}`
- `spec.ts` — `isLocalAddonSpec` (rules: starts with `@` for npm scoped; starts with `./`, `../`, `/`, `~/`, or contains `/`/`\` for local), `normalizeAddonEntry`, `resolveLocalAddonRoot`
- `loader.ts` — `loadAddons({entries, configDir, homeDir, currentApiVersion})`: local via `pathToFileURL` + dynamic `import()`; npm logs "not yet implemented" error
- `registry.ts` — `AddonRegistry` class: indexes by name, button type, deck type; throws on duplicates
- `index.ts` — barrel

### packages/cli/src/core/
- `watcher.ts` — `ConfigWatcher` wrapping chokidar v5. `start`, `setHandlers`, `close`

### packages/cli/src/__tests__/
- `config.test.ts` — 38 tests (builtin icons, home expansion, isLocalIconPath, resolveIconRef (4 schemes + errors + roundtrip via iconSourceToString), expandButtonReferences (single + recursive), loadConfig (valid + rejects main_deck/keyCount/paste + accepts both addon entry shapes + line-info errors), findConfigPath (--config > cwd > xdg > null), validateBootstrap (missing main + dup positions + skip @file.yml + clean config))
- `addon.test.ts` — 23 tests (isLocalAddonSpec incl @scope exclusion, normalizeAddonEntry, resolveLocalAddonRoot, readManifest valid + 3 errors, loadAddons (local loaded + disabled info + missing path + invalid module + npm not-implemented), AddonRegistry (indexes + dup name + dup type + reset))

## Decisions locked this phase

See `.planning/PLAN.md` §20 (locked decisions 1-25, 28-43).

Key:
- No `main_deck` property. `decks.main` is required.
- No `keyCount` in config.
- `paginated: true|false` optional, default false.
- No `paste` block.
- No `allow_reserved_slot_override`.
- Addons: string-or-`{ source, enabled? }`. No `name` in config — id/name from manifest.
- Icon refs: relative path, `icon://<id>` (CLI builtin), `builtin://<addon>/<path>`, `addon://<addon>/<path>`.
- Two-phase validation: bootstrap (deck shape + main exists + position uniqueness) → full (per-button configSchema, Phase 03).

## Smoke

- `pnpm typecheck` → clean
- `pnpm exec vitest run` → **69/69 passing** (8 cli + 38 config + 23 addon)
- `pnpm --filter sireno-deck-2 lint` → 0 warnings, 0 errors
- `pnpm format:check` → all 41 files conform

## Bugs fixed during build

- `addon/loader.ts` initially imported non-existent `isLocalAddonPath` → switched to `isLocalAddonSpec`.
- `reference-expander.ts` missing `dirname` import.
- Zod schemas needed `.strict()` on every level to reject unknown keys (config validation tests required this).
- Loader `validateModule` needed to unwrap `moduleValue.default ?? moduleValue` for `export default {...}` ESM addons.
- `isLocalAddonSpec` initially treated `@scope/pkg` as local (contains `/`) → added early `@` check that only allows `@/` or `@\`.
- Test `falls back to $XDG_CONFIG_HOME` needed `mkdirSync(join(xdg, "sireno-deck-2"), {recursive: true})` before writing config.

## Traceability

Requirements satisfied:
- **R1** (config.yml drives decks/buttons/themes/addons): ✓ via `RawConfigSchema`
- **R4** (addons string-or-`{ source, enabled? }`): ✓ via `AddonEntrySchema` + `normalizeAddonEntry`
- **R5** (icon resolution via common function): ✓ via `resolveIconRef` (4 schemes)

Deferred to Phase 03:
- **R6** (decks defined programmatically via `createDecks`)
- **R8** (gesture state machine)
- Per-button `configSchema` validation
- Reject `internal: true` buttons in user config
