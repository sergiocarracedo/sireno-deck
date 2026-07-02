# Phase 17 — Addon API Consolidation + Media Migration Cleanup

## Goal

Unify the dual-addon-API mess, fix dead-code paths, finalize the media addon, and close 10 architecture gaps that accumulated across Phases 01–16. After this phase: `pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test` passes cleanly.

## Locked Architecture

```
Hardware press
 └─► SDK key event (handle.on("down"|"up"))
      └─► gesture-state.ts (timer-based detector)
           └─► runtime.dispatchGesture(buttonId, gesture)
                └─► addon-handler-bridge.ts (registered handler)
                     └─► buttonBackend.onTap(ctx)
                          └─► ctx.methods["<addonName>:<name>"]
```

- **Global backend** (`AddonGlobalBackend`): owns provider lifecycle, shared methods, signal-bound resources. Never receives gestures.
- **Per-button backend** (`AddonButtonBackend`): owns tap/dbl-tap/hold handlers. Singleton — one object per button type.
- **Frontend**: passive renderer. `useAddonChannel` for state. No WS dispatch. No action handler.
- **Methods**: namespaced `core:*` (runtime built-ins) or `<addonName>:*` (addon globals).

## Canonical `AddonButtonBackend` Type

```ts
export interface AddonButtonBackend<Config = unknown> {
  readonly configSchema?: unknown      // consumed by config/validation.ts
  readonly internal?: boolean          // consumed by config/validation.ts
  readonly onMount?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onTap?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onDblTap?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly onHold?: (ctx: AddonButtonBackendContext<Config>) => void | Promise<void>
  readonly dispose?: () => void | Promise<void>
}
```

Deleted from old `AddonButtonTypeBackend`: `defaultRenderIntervalMs` (dead — set by 10 buttons, read by zero), `full` (dead — per-instance config field, not a type field).

## 10 Plans

| # | Plan | Status |
|---|------|--------|
| 01 | `17-01-gesture-detector` — timer-based hold detection | pending |
| 02 | `17-02-real-hardware-keys` — SDK key events + key-listener | pending |
| 03 | `17-03-method-namespacing` — core-buttons/emoji-selector prefixes | pending |
| 04 | `17-04-api-consolidation` — delete old type, migrate 9 addons | pending |
| 05 | `17-05-dead-code-removal` — delete pollers/subscriptions from api.ts | pending |
| 06 | `17-06-frontend-dead-code` — App.tsx button-action handler | pending |
| 07 | `17-07-version-constant` — unify SIRENO_ADDON_API_VERSION on 3 | pending |
| 08 | `17-08-media-poller-consolidation` — single `media:state` channel | pending |
| 09 | `17-09-orphaned-files` — delete index.tsx + broken .d.ts files | pending |
| 10 | `17-10-bridge-context-fix` — `core:*` runtime methods + brightness fix | pending |

## Verification

```bash
pnpm typecheck && pnpm --filter sireno-deck lint && pnpm test
```

All plans must pass this before merge.
