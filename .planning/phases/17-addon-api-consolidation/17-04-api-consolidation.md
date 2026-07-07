# Plan 17-04 — API Consolidation

## Gap

Two parallel addon backend APIs coexist:
- `AddonButtonTypeBackend` (old, 9 addons use it) — has `configSchema`, `internal`, `defaultRenderIntervalMs`, `full` fields; context is `AddonButtonTypeActionContext` with `pressed`/`frameState`/`hostContext`
- `AddonButtonBackend` (new, only `internal-settings` uses it) — has `configSchema`, `internal`, lifecycle hooks; context is `AddonButtonBackendContext` with `buttonId`/`methods`/`publish`/`executor`/`signal`

The bridge (`addon-handler-bridge.ts:136`) casts everything to `AddonButtonBackend`, so the old type's extra context fields (`pressed`, `frameState`, `hostContext`) are **always undefined** for the 9 old addons.

## Changes

### `addon/api.ts`

**Delete:**
- `AddonButtonTypeBackend` (lines 76–91)
- `AddonButtonTypeActionContext` (lines 20–26) — note: `AddonButtonTypeRenderContext` also unused
- `AddonButtonTypeDef` (lines 93–96)
- `AddonButtonTypeDefAny` (lines 98–101)

**Extend `AddonButtonBackend`** to include all surviving fields:
```ts
export interface AddonButtonBackend<Config = unknown> {
  readonly configSchema?: unknown    // consumed by config/validation.ts
  readonly internal?: boolean          // consumed by config/validation.ts
  readonly onMount?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onTap?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onDblTap?: (ctx: AddonButtonContext<Config>) => void | Promise<void>
  readonly onHold?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly dispose?: () => void | Promise<void>
}
```

**Update `AddonManifestV1.buttonTypes`** to use `AddonButtonBackend` directly:
```ts
readonly buttonTypes: Readonly<Record<string, AddonButtonBackendAny>>
```
where `AddonButtonBackendAny = AddonButtonBackend<unknown>`. Remove `AddonButtonTypeDef` usage from the manifest type.

**Delete `defaultRenderIntervalMs` and `full`** — dead fields confirmed (zero consumers).

### 9 Addon Manifests — change `satisfies AddonButtonTypeBackend` → `satisfies AddonButtonBackend`

Update context destructures to match `AddonButtonBackendContext<Config>`:

```ts
// Before (AddonButtonTypeBackend):
onTap: ({ config, pressed, methods, hostContext }: AddonButtonTypeActionContext & { buttonId: string }) => { ... }

// After (AddonButtonBackend):
onTap: ({ config, buttonId, methods, publish, executor, signal }: AddonButtonBackendContext<Config>) => { ... }
```

**Addons to update:**
1. `builtin-addons/core-buttons/buttons/{action,toggle,change-deck,media-sample}/backend.ts`
2. `builtin-addons/brightness/buttons/brightness/backend.ts`
3. `builtin-addons/date-time/buttons/{date,time,locked-time-tile,analog-clock,custom}/backend.ts`
4. `builtin-addons/emoji-selector/buttons/{launcher,back,category,emoji,page-nav}/backend.ts`
5. `builtin-addons/media/buttons/{media-player,media-mute,media-volume}/backend.ts`
6. `builtin-addons/session/buttons/{session-info,time}/backend.ts`
7. `builtin-addons/weather/buttons/weather/backend.ts`
8. `builtin-addons/value-display/buttons/value-display/backend.ts`
9. `builtin-addons/system-status/buttons/system-status/backend.ts`

### Delete 10 `defaultRenderIntervalMs` declarations

- `builtin-addons/date-time/buttons/date/backend.ts` (line 9)
- `builtin-addons/date-time/buttons/time/backend.ts` (line 9)
- `builtin-addons/date-time/buttons/locked-time-tile/backend.ts` (line 9)
- `builtin-addons/date-time/buttons/analog-clock/backend.ts` (line 9)
- `builtin-addons/date-time/buttons/custom/backend.ts` (line 9)
- `builtin-addons/weather/buttons/weather/backend.ts` (line 9)
- `builtin-addons/brightness/buttons/brightness/backend.ts` (line 12)
- `builtin-addons/emoji-selector/buttons/category/backend.ts` (line 7)
- `builtin-addons/emoji-selector/buttons/page-nav/backend.ts` (line 7)
- `builtin-addons/system-status/buttons/system-status/backend.ts` (line 7)
- `builtin-addons/value-display/buttons/value-display/backend.ts` (line 7)

## Note on `toggle` Backend — `store` Access

After Plan 04, `AddonButtonBackendContext` has no `store`. The toggle backend currently calls `store.buttonScope(...)`. Options:
1. Add `store` to `AddonButtonBackendContext` (requires bridge to pass it — bridge already has `store` from params)
2. Use `ctx.publish("core-buttons:toggle", ...)` and handle in a core global backend

**Decision:** Add `store` to `AddonButtonBackendContext`. Bridge already has it. Simple fix.

## Files

- `packages/cli/src/addon/api.ts` (type definitions)
- 9 addons' button backend files (list above)
- `packages/cli/src/deck/addon-handler-bridge.ts` (add `store` to context if needed)

## Verify

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```
