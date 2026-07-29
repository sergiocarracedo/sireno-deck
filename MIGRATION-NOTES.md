# Migration Notes — pre-re-init snapshot (2026-07-13)

The prior `.planning/` tree (now removed) held these locked decisions. They
remain **valid**. If the new project replays them, point at this file.

> Snapshot last reconciled against the source tree on 2026-07-29. Counts
> and module paths below reflect that reconciliation; see
> `__beta-review__/` for the open workstream.

## Frontend / navigation

- **Service-driven nav** — `react-router-dom` (`BrowserRouter` mounted in
  `packages/cli/frontend/src/main.tsx`); the service picks the active deck;
  URL `/decks/:deckId` is the read-only projection. (P1, 2026-07-07;
  confirmed shipped.)
- **`gestureHandlers` default-deny** (P2, 2026-07-07) — declared-or-stripped
  filter. `SIRENO_ADDON_API_VERSION` stays at 1; no compat shim.

## Addon registry

- **`manifest.decks` auto-register** at load time (P4, 2026-07-07). User can
  still reference by `${addonName}:${deckKey}`.
- **`internal?: boolean`** on `AddonDeckDefinition` (P5, 2026-07-07) opts a
  deck out of user-config discovery surfaces.
- **4-tier icon fallback** (Phase 72, 2026-05) — configured → first emoji →
  name initial → `layout-grid`.

## Pipeline (service daemon)

- **`OutputClient` abstraction** (2026-07-08) — `selectOutputClient({emulator,
device, intervalMs?})` wraps `RealOutputClient` / `EmulatorOutputClient`.
- **Wire format is gesture-only** (2026-07-09, later) — `button-action`
  carries `{deckId, position, gesture: 'tap' | 'dbl-tap' | 'hold'}`. No raw
  `key-event`. `PROTOCOL_VERSION = 1`.
- **Per-transport gesture detectors** — emulator SPA owns its own
  `gesture.ts`; real hardware via `device.onKeyEvent`. Constants
  `HOLD_ACTION_DELAY_MS = DOUBLE_TAP_DELAY_MS = 200` shared from
  `core/gesture-state.ts`.

## Naming / terminology

- **`*Backend` → `*Service`** rename shipped (P8, 2026-07-07). `backend.ts`
  file names stay.
- **"service"** = the long-lived Node daemon. **"backend"** = ambiguous; avoid.

## Schemas / first-party addons

- **`system-status-label-values`** metrics capped at 1–2 (Phase 74). 3+
  rejected with hint to use `value-display`.
- **`value-display`** first-party addon (Phase 75), 1–3 values cap, parallel
  `Promise.all` polling.

## Conventions

- YAML config: `snake_case`. Addon manifest: `${addonName}:` namespace.
- Two deck shapes: `AddonDeckFactory` (no config) vs `AddonDeckDefinition`
  (config-aware) — **prefer `AddonDeckDefinition` for new code**.
- Zod: `.min().max("msg")` directly; `.refine()` / `.superRefine()` are
  allowed but discouraged (they wrap in `ZodEffects` and break `.shape`
  consumers).

## Known issues — to be revalidated

The historical entries below reference snapshots that no longer match the
tree. They remain here for traceability but should not be relied on.

- Historical `runtime.test.ts` failure count was 79 (Phase 42/67). Current
  count is 11 (after the P0/P1 batches in `__beta-review__/07-testing-and-quality.md`).
  Remaining 11 are catalogued there.
- Frontend-UI clicks bypass the gesture stream — reaudit.
- Per-addon frontend authoring — was historically only `date-time/frontend.tsx`;
  the modern rewrite now uses `packages/cli/src/builtin-addons/core/buttons/*`
  templates.

## What's NOT in this file

- The architecture itself lives in `ARCHITECTURE.md` (repo root, preserved).
- Active review-driven workstream is tracked in `__beta-review__/*.md`.
- This file is the **legacy decisions index**, not a new plan.
