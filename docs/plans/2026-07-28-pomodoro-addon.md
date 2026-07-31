# Pomodoro addon + core notification provider

- **Date:** 2026-07-28
- **Branch suggestion:** `feat/pomodoro-addon`
- **Product contract source:** ce-plan-bootstrap
- **Plan depth:** Standard
- **Status:** Draft

## 1. Goal

Deliver a Pomodoro timer addon (`packages/addons/pomodoro/` as a third-party workspace package, modeled on `packages/addons/app-shortcuts/`) and the matching core notification infrastructure so any addon can fire OS notifications.

Per button:

- 🍅 emoji centered in a circle, with an SVG arc that fills as time elapses (0 % → 100 %), countdown text inside the circle.
- States: `idle` → tap → `running` → tap → `stopped` (= `idle`) → tap → `idle` (restart). From `finished` → tap → reset and start a new cycle.
- On reaching `finished`: blink red for **10 s** (purely visual, no backend state change), fire one OS notification with bundled bell sound. The button stays in `finished` visually (red text, no animation) after the 10 s window; the next tap starts a fresh cycle.

The work introduces:

1. A core `NotificationProvider` (Linux / macOS / Windows) following the `key-macro` / `clipboard` / `session` / `active-app` factory pattern.
2. A `notify({title, body})` method on `Methods`, exposed to addons as `coreMethods.notify`.
3. A standalone `@sirenodeck/addon-pomodoro` package.

## 2. Settled decisions

| Decision                | Choice                                                                                                                      | Why                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Addon location          | New workspace package `packages/addons/pomodoro/`                                                                           | Third-party addon pattern (matches `app-shortcuts`); keeps `cli` lean    |
| Button type id          | `pomodoro:pomodoro`                                                                                                         | Registry rule: buttonTypes prefixed with `<addonName>:`                  |
| State model             | `idle` \| `running` \| `finished` (no `paused`)                                                                             | Spec call-out — no pause/resume                                          |
| Tap cycle               | `idle→start`, `running→stop` (returns to `idle`), `finished→reset→start`                                                    | Restart from finished is the spec; `stopped` is a true stop, not a reset |
| Blink duration          | 10 s, pure CSS `animation: blink-red 1s 10` (no backend timer, no auto-state-change)                                        | Spec call-out; stateless, zero ticker overhead                           |
| Persistence             | `startTsMs` + `durationSec` per button via `store.buttonScope("pomodoro", buttonId)`                                        | Survives daemon restart and decoder reboot                               |
| Single ticker           | One 1 s global ticker in `globalService.onLoad` publishes `pomodoro:state` for all buttons                                  | Avoids N timers per button; matches `weather` / `media` patterns         |
| Sound                   | OGG bundled with addon at `packages/addons/pomodoro/assets/pomodoro-complete.ogg` (≤ 10 KB)                                 | Addon self-contained; no downloader needed                               |
| Icon source             | `🍅` raw emoji via existing `Icon` component (`EMOJI_RE` path)                                                              | One emoji, no asset id plumbing                                          |
| Notifications API       | `notify({title, body, sound?})` on `Methods`; provider optional (no-op if missing)                                          | Addons stay decoupled from platform shell                                |
| Notification sound      | Provider plays OGG via `ffplay` / `paplay` (Linux), `afplay` (macOS), `Windows.Media.MediaPlayer`; graceful skip if missing | Matches platform-shell pattern; never blocks the toast                   |
| Requirements capability | New `notification` capability in `system/requirements.ts` (`notify-send`, PowerShell toast)                                 | Reuses existing capability-warn UI                                       |

## 3. State + channel specification

### Per-button state

```ts
type PomodoroStatus = "idle" | "running" | "finished"

interface PomodoroButtonState {
  status: PomodoroStatus
  remainingSec: number // 0 when finished or idle
  totalSec: number // configured duration
}
```

`finished` is sticky: it persists indefinitely until the user taps. The 10 s blink is a CSS-only visual cue; the backend state never auto-clears.

### Global channel

`pomodoro:state` — `Record<buttonId, PomodoroButtonState>`. Single publish per tick (1 s) regardless of button count. Frontends subscribe via `useAddonChannel<PomodoroSnapshot>(POMO_CHANNEL)`.

### Methods interface additions

```ts
interface Methods {
  // ...existing
  notify(args: { title: string; body: string; sound?: boolean }): Promise<void>
  setNotificationProvider(provider: NotificationProvider): void
}
```

## 4. Files to change

### Core (`packages/cli/src/`)

- `system/providers/notification.ts` — **NEW.** Exports `NotificationProvider` interface (`notify(args): Promise<void>`), `NotificationProviderFactory`, `createNotificationProvider({platform, executor, env, logger}): Promise<NotificationProvider>`, `createNullNotificationProvider()` (logs + no-ops).
- `system/providers/notification/linux.ts` — **NEW.** `notify-send` via `execa` (2 s timeout). Sound via `ffplay` then `paplay` fallback; skip silently if neither found.
- `system/providers/notification/darwin.ts` — **NEW.** `osascript -e 'display notification ...'`; sound via `afplay` (skip if file missing).
- `system/providers/notification/windows.ts` — **NEW.** PowerShell `Windows.UI.Notifications.ToastNotifier` via `LoadAssembly` + `[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]`; media player via `Windows.Media.MediaPlayer` with `System.Media.SoundPlayer` fallback. Skip if Windows build < 10 1809.
- `system/providers/__tests__/notification.test.ts` — **NEW.** Factory dispatches by platform string; null fallback returns no-op; unknown platform returns null.
- `system/providers/notification/__tests__/linux.test.ts` — **NEW.** `notify-send` called with title + body via mocked executor; missing binary returns no-op without throwing.
- `system/requirements.ts` — add `notification` capability probe (`which notify-send` on Linux; PowerShell toast test on Windows).
- `system/__tests__/requirements.test.ts` — extend capability list to include `notification`.
- `deck/methods.ts` — extend `Methods` interface with `notify` + `setNotificationProvider`. Concrete method delegates to provider (no-op when none set).
- `cli/commands/run.ts` (`run.ts:962-993` block) — add `createNotificationProvider(...)` awaited in the existing parallel providers list; call `methods.setNotificationProvider(provider)` after construction.

### Addon (`packages/addons/pomodoro/` — NEW)

- `package.json` — `{ name: "@sirenodeck/addon-pomodoro", version: "0.1.0", type: "module", main: "dist/index.js", exports: { ".": "./dist/index.js", "./types": "./dist/types.d.ts" }, scripts: { build, typecheck, lint, test } }`. Dev deps aligned with `packages/addons/app-shortcuts/package.json`.
- `sirenodeck.json` — `{ name: "pomodoro", entry: "./dist/index.js", buttonTypes: ["pomodoro:pomodoro"] }`.
- `tsconfig.json` + `tsconfig.build.json` — mirrored from `app-shortcuts`.
- `scripts/post-build.mjs` — copies `sirenodeck.json` **and** `assets/` into `dist/` (asset bundling is new — sibling only copies JSON).
- `src/types.ts` — re-declares `AddonManifestV1`, `AddonDeckEntry`, `AddonGeneratedDeck`, **plus** `CoreMethods` local type that mirrors the addon-visible subset of `Methods`, including `notify({title, body, sound?})`.
- `src/manifest.ts` — exports one button type `pomodoro:pomodoro` with configSchema (`{ durationSec?: number = 1800 }`, zod `.strict()`) and a `decks` entry referencing the per-button frontend + backend.
- `src/index.ts` — `export { manifest } from "./manifest.ts"`.
- `src/shared/pomodoro-state.ts` — types `PomodoroStatus`, `PomodoroButtonState`, `PomodoroSnapshot`; exports `POMO_CHANNEL = "pomodoro:state"`.
- `src/global/timer.ts` — single 1 s ticker; on each tick recomputes each running button's `remainingSec` from `Date.now() - startTsMs`; transitions to `finished` when elapsed; publishes snapshot via the global service's `publish`. Pure module, takes a `now()` injected clock for tests.
- `src/global/backend.ts` — `globalService`: `methods` (`start`, `stop`, `reset`), `onLoad(ctx)` restores running timers from store + starts ticker, `onUnload(ctx)` clears ticker. `start` / `stop` / `reset` mutate per-button state via the addon store.
- `src/buttons/pomodoro/config.ts` — zod schema for button config; reuses addon-store helper.
- `src/buttons/pomodoro/backend.ts` — `onMount`: restore state from `store.buttonScope("pomodoro", button.id)`. `onTap(ctx)`:
  - `idle` → start (set `startTsMs`, persist, publish).
  - `running` → stop (clear `startTsMs`, persist, publish).
  - `finished` → reset → start (set fresh `startTsMs`, persist, fire `notify` once, publish).
  - On transition into `finished` (running → finished during the ticker): `ctx.coreMethods.notify({ title: "Pomodoro", body: "Time's up!", sound: true })`.
- `src/buttons/pomodoro/frontend.tsx` — `useAddonChannel<PomodoroSnapshot>(POMO_CHANNEL)`. Renders:
  - `<svg viewBox="0 0 100 100">` with `<circle stroke track>` + `<circle stroke progress strokeDasharray={(remainingSec/totalSec)*circumference} ${circumference}/>`.
  - Centered `<span>` with `🍅` (`Icon` with emoji source, `fontSize: 48`).
  - Countdown text below (`mm:ss`).
  - Wrapper gets `class="blink-red"` when `status === "finished"` (CSS handles the 10 s window, see below).
- `src/buttons/pomodoro/frontend.css` — **NEW** (or co-located string, see code).

  ```css
  @keyframes blink-red {
    50% {
      color: #ef4444;
      opacity: 0.4;
    }
  }
  .blink-red {
    animation: blink-red 1s 10;
    color: #ef4444;
  }
  ```

  10 iterations × 1 s = 10 s total blink; after the animation ends the button stays red (via the static `color` rule) with no further motion until the next tap.

- `src/assets/pomodoro-complete.ogg` — **NEW binary, ≤ 10 KB.** Stub with a tiny synthesized ping in implementation.

### Tests (`packages/addons/pomodoro/src/__tests__/`)

- `manifest.test.ts` — button type prefixed correctly; re-declared types align with `AddonManifestV1` shape; global service methods listed.
- `timer.test.ts` — fake `now()`: ticking emits decreasing `remainingSec`, transitions to `finished` at deadline, publishes once per tick, no publish if no buttons running.
- `backend-global.test.ts` — `onLoad` reads store and registers ticker; methods (`start`/`stop`/`reset`) update store + publish; `onUnload` clears ticker.
- `backend-button.test.ts` — `onTap` from each state produces expected transition; only the `idle|finished → running` start transition fires `coreMethods.notify` (mocked).
- `config.test.ts` — zod schema rejects extra keys, applies default `durationSec`.

### Docs

- `packages/addons/pomodoro/README.md` — **NEW.** Mirror `packages/addons/app-shortcuts/README.md` shape: install snippet for `config.yml`, button config schema, state machine (text), one screenshot each of `idle` / `running` / `finished-blinking`.
- Root `config.yml` — add a `pomodoro-demo` deck with one Pomodoro button (per existing demo convention).

### Workspace plumbing

- `pnpm-workspace.yaml` — `packages/*` + `packages/addons/*` globs pick up the new addon (no edit).
- `.oxlintrc.json` — verified no rule stops addon packages from bundling assets; sibling `app-shortcuts` proves addons don't import `cli/src`.

## 5. Implementation order

1. **Core notification provider** (`notification.ts` + 3 platform files + null), wired from `run.ts` before any addon wiring. Tests first.
2. **`Methods.notify`** + `setNotificationProvider` on the existing `Methods` impl; expose to addons (verify via log of `coreMethods` keys).
3. **Addon skeleton** — `package.json`, `tsconfig*`, `sirenodeck.json`, `scripts/post-build.mjs`, empty manifest.
4. **State + ticker** (`shared/pomodoro-state.ts`, `global/timer.ts`, `global/backend.ts`) with unit tests using injected clock.
5. **Per-button backend + config** + tests.
6. **Per-button frontend** — arc + emoji + countdown + blink CSS. Tests for the hook (snapshot reducer handles missing state).
7. **Sound + notify handoff** — wire OGG asset bundling + `notify({sound:true})` call on `running→finished` transition. Backend test asserts notify is called once per completion.
8. **Demo deck** + `config.yml` entry.
9. **README** for the addon.
10. **Verify.** `pnpm lint && pnpm format && pnpm typecheck && pnpm test`; emulator run.

## 6. Test scenarios

Per implementation unit:

- **`createNotificationProvider({platform:'linux'})`** → returns linux impl; mocked executor receives `notify-send` args.
- **`createNotificationProvider({platform:'linux', missingBinaries:true})`** → returns linux impl that no-ops when `notify-send` missing.
- **`createNotificationProvider({platform:'darwin'})`** → osascript command constructed.
- **`createNotificationProvider({platform:'windows'})`** → returns windows impl.
- **`createNotificationProvider({platform:'freebsd'})`** → returns null provider (known unsupported, no-op).
- **`requirements` capability `notification`** — Linux: detected when `notify-send` present; Windows: detected; others: graceful `available:false`.
- **`Methods.notify`** — delegates to provider; returns `undefined` when no provider set (does not throw).
- **Timer (`global/timer.ts`)** — fake clock advances 1 s per tick; `remainingSec` decrements; transition to `finished` when `now - startTsMs >= durationSec*1000`; publish skipped when no running buttons; ticker clears via `onUnload`.
- **Global backend (`onLoad`)** — restores running buttons whose `startTsMs` is in the past as `finished` immediately (covers daemon restart mid-cycle), `running` only if the deadline is still in the future.
- **Button backend `onTap`** — from `idle` writes `startTsMs` and persists; from `running` clears it; from `finished` resets and starts, fires `notify({title:'Pomodoro', body:...})` once via mock.
- **Ticker `running→finished` transition** — fires `notify` exactly once per completion (mocked `coreMethods.notify`).
- **Frontend rendering** — `useAddonChannel` returns latest snapshot per button; arc dasharray = `(remainingSec/totalSec)*circumference`; wrapper gets `blink-red` class only when status `finished`; countdown formats `mm:ss`.
- **Frontend blink animation** — when wrapper is `finished`, jsdom `getAnimations()` returns one animation with `iterationCount === 10` and `duration === "1s"`; after the animation ends (`currentTime === 11000` ms in test) `playState === "finished"`. State in the snapshot remains `finished` (no auto-clear).
- **Asset bundling** — `dist/assets/pomodoro-complete.ogg` exists after `pnpm --filter @sirenodeck/addon-pomodoro build`.
- **Manifest** — `buttonTypes[0].id === "pomodoro:pomodoro"`; `globalService` exposes `methods`, `onLoad`, `onUnload`.

## 7. Assumptions

- One Pomodoro button per declaration; multiple buttons share the global ticker but each has its own state and store entry.
- Default duration is 25 minutes (1500 s) — spec implies 25 min via "pomodoro"; configurable per button via `config.durationSec`.
- A running Pomodoro that survives a daemon restart is **finished immediately** if its deadline is in the past at restore time. (Cheap, correct, matches `weather` / `media` last-known-state pattern; deadline-aware resume would need a scheduler we don't yet support.)
- Sound is best-effort: provider never blocks on missing audio binary; the OS notification still fires.
- Notification provider can be absent in tests (null factory); addons' `notify` calls degrade to a logger warn in the null case.
- The 🍅 emoji renders identically across the supported target OSes (the `Icon` component's `EMOJI_RE` path handles font fallback).
- Addons cannot currently bundle binary assets through the existing `post-build.mjs` (`app-shortcuts` only copies `sirenodeck.json`); extending it to also copy `assets/` is a one-line addition.
- The blink-red animation runs purely in the browser; no JS timer is set for it. We do not need to coordinate blink end with state changes because state never auto-clears.

## 8. Out of scope

- Pause / resume semantics.
- Custom durations per profile or per deck.
- Multiple sequential cycles after completion (auto-restart).
- Action Center-style rich toast XML on Windows (raw template via PowerShell is enough).
- Notification Center-style richer macOS notifications via `terminal-notifier`.
- Per-user notification preferences (Do Not Disturb awareness).
- Vibration / haptic feedback for the Stream Deck device.
- HMR / live-reload of the addon manifest during development.
- Internationalizing the notification title/body.
- Auto-transitioning `finished` → `idle` after the 10 s blink window. (Decided against to keep the backend stateless for the blink cue.)

## 9. Verification

Per `AGENTS.md` recipe:

```sh
pnpm lint && pnpm format && pnpm typecheck && pnpm test
pnpm --filter @sireno-deck/cli run dev -- --emulator
# open http://127.0.0.1:52938/#/device and http://127.0.0.1:5180
# 1. tap the pomodoro button — confirm arc starts emptying and countdown ticks down
# 2. let it finish (or set durationSec:5 in config) — confirm red blink starts, OS toast appears, sound plays
# 3. wait ~10 s after blink starts — confirm blink stops, button stays red (no animation)
# 4. tap after finished — confirm fresh cycle starts (arc full, countdown = duration)
# 5. restart daemon while running — confirm state survives or correctly marks finished
```

Capture a 10-second GIF of the running + blink phases for the PR body.
