---
phase: 03-deck-runtime
status: ready
generated_for: plan-phase
---

# Phase 03 — CONTEXT

> Context for `/plan-phase 03`. Captures the decisions that constrain planning, the legacy behaviors worth mirroring, and the open questions the planner must resolve.

## Locked constraints (do not re-litigate)

From `.planning/PLAN.md` §20 and §8:

1. **Gesture state machine outputs only `tap | dbl-tap | hold`.** No `press-then-release`. Raw down/up are inferred into gestures by hardware manager or emulator shell; the runtime never sees raw down/up.

2. **Addon lifecycle hooks: only `onTap`, `onDblTap`, `onHold`, `dispose`.** Removed: `onPress`, `onRelease`, `onActivate`, `onDeactivate`, `poll`, `refresh`. Use pub-sub channels for state updates.

3. **Gesture timings** (from legacy):
   - `HOLD_ACTION_DELAY_MS = 600`
   - `DOUBLE_TAP_DELAY_MS = 200`

4. **Slot n-1 reserved**: `main` deck → `core:settings-entry`; regular → `core:back`; overlay → `core:overlay-toggle` (deck's own icon).

5. **Slot n-2 reserved**: only in paginated decks → `core:next-page`.

6. **Paginated decks**: chunks into pages of `keyCount - 2`. Pad with empty slots.

7. **Decks defined programmatically**: `createDecks({ config, deck })` returns `Record<string, AddonGeneratedDeck>`, can include `internal: true` buttons.

8. **Settings deck** is built by `internal-settings` addon via `createDecks`. **Lock deck** is built by `session` addon via `createDecks`.

9. **Two-phase validation**: bootstrap (deck shape + `main` exists + position uniqueness) → full (per-button `configSchema` from registry). Phase 02 has bootstrap. Phase 03 adds full.

10. **`internal: true` buttons in user config are rejected** by full validation.

## Legacy reference

`/works/opensource/sireno-deck` has the prior implementation. Specifically:

- `packages/cli/src/deck/runtime.ts` (~1834 lines, too large — should not copy verbatim; reference for behavior)
- `packages/cli/src/deck/system-back-injection.ts` (slot decision logic)
- `packages/cli/src/deck/gesture-state.ts` (gesture machine with legacy constants)
- `packages/cli/src/deck/system-decks/locked.ts` (current-time buttons across multiple keys)
- `packages/cli/src/deck/system-buttons/OverlayToggleButton.tsx`
- `packages/cli/src/core/pagination.ts`
- `packages/cli/src/action/executor.ts` (execa + `{{ host.* }}` interpolation)

**Do not copy code directly.** Port the algorithms and timings; rewrite to fit sireno-deck-2's shape (smaller files, fewer lines, stricter types).

## Methods surface (for buttons)

Phase 03 implements the runtime side of `methods.*`. The TypeScript types come from Phase 04's `src/api/`. For Phase 03, define a local `Methods` interface in `src/deck/methods.ts` with:

```ts
interface Methods {
  runCommand(command: string, options?: { cwd?: string }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  keyMacro(action: KeyMacroAction): Promise<void>;
  pasteText(text: string): Promise<void>;
  navigateToDeck(args: { id: string; addToHistory?: boolean }): void;
  goBack(): void;
  getActiveDeckId(): string;
  invalidate(): void;
  publish<T>(channel: string, payload: T): void;
  subscribe<T>(channel: string, cb: (payload: T) => void): () => void;
}
```

`KeyMacroAction` is a discriminated union of OS-specific actions; Phase 07 implements the providers. Phase 03 just defines the type and stubs the calls (throw `NotImplementedError`).

## Built-in addon catalog (Phase 03)

| Addon             | Buttons                                                       | Decks (via `createDecks`) |
| ----------------- | ------------------------------------------------------------- | ------------------------- |
| `core-buttons`      | `core:action`, `core:change-deck`, `core:toggle`, `core:media-sample` | —                         |
| `internal-settings` | `core:settings-brightness`, `core:settings-theme`, `core:settings-about` | `settings`                |
| `session`           | `core:session-info`                                             | `session:locked`          |

For Phase 03 the `core:settings-*` buttons can be stubs that only resolve their `configSchema`; the actual OS-backed implementations land in Phase 07.

The `session:locked` deck renders current time on multiple buttons. Implementation: read `new Date()` on render and update via `setInterval`. The locked-deck buttons are `internal: true`.

## Pub-sub design

```ts
// src/core/pub-sub.ts
export interface PubSub {
  publish<T>(channel: string, payload: T): void;
  subscribe<T>(channel: string, cb: (payload: T) => void): () => void;  // returns unsubscribe
  last<T>(channel: string): T | undefined;                              // for new subscribers
  snapshot(): Record<string, unknown>;                                   // for WS bridge
}
```

The bus debounces state emission (100ms) so that a flurry of `publish` calls results in one bridge `state` message.

## Action executor design

```ts
// src/action/executor.ts
export interface ActionExecutor {
  run(command: string, ctx: { host: HostContext; logger: Logger }): Promise<ActionResult>;
}

export interface ActionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
```

The `{{ host.* }}` interpolation reads from `HostContext` (Phase 07's `system/host-context.ts`). For Phase 03, `HostContext` is a stub: `{ hostname: string, platform: NodeJS.Platform, userInfo: { username: string }, arch: string }`.

## Open questions for the planner

These are listed in `03-PHASE.md`; copy them into the plan file and resolve during planning.

## Test design

- **Gesture state machine** — pure function; given a list of `{ down, up, timestamp }` events, output should be deterministic. Test tap, dbl-tap, hold, single press, hold release, dbl-tap missed.
- **Pagination** — given `[15 buttons]` and `keyCount=15`, expect page 1 with 13 buttons + next-page marker at slot 12 + slot 13 reserved. Given `[5 buttons]` and `keyCount=15`, expect single page with 5 buttons and no marker.
- **Pub-sub** — subscribe + publish + unsubscribe + `last()` + debounced snapshot.
- **Store** — addon scope vs button scope isolation; clear; snapshot.
- **Deck runtime** — `navigateToDeck`, `goBack`, overlay activate/dismiss, pagination advance.
- **Action executor** — basic exec + exit code capture + `{{ host.* }}` interpolation.
- **Config full validation** — unknown keys rejected, `internal: true` rejected in user config, addon `configSchema` errors formatted with line numbers.

## Estimated effort

- Medium-large phase. ~1500-2500 lines of code + ~800-1200 lines of tests.
- Should split into 2-4 plans depending on `/plan-phase` granularity settings (current config: `granularity: coarse`).
