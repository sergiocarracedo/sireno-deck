# Quick Task 005 — Plan

**Slug:** overlay-icons-back-cli
**Status:** Ready for execution

## Bug summary

1. Bitmap icons (chrome button on main deck, chrome deck icon) disappear when
   the available overlay changes. Manifests as `error` fallback icon.
2. N-1 button on the root of an overlay deck shows `back` instead of an
   overlay-toggle. Tap is a no-op there.
3. CLI says `ydotool` / `wtype` are missing even when installed (PATH-stripped
   parent process); once detected, the user's `chrome` deck buttons use raw
   `xdotool key …` instead of `type://` macros and don't fire.

## Task 1 — Icon resolution in overlay-change broadcasts (Bug 1)

**Root cause:** In `setupAddonServices` (`packages/cli/src/cli/commands/run.ts`),
the `runtime:activeDeck` and `runtime:overlay-available` subscribers pass `{}`
as `resolverOptions` to `buildDeckConfigMessage`. The config-change handler
and `bridge.onConnection` already pass the populated `resolverOptions`. Empty
options make `resolveIconSource` throw for relative paths, and
`resolveOne` silently returns the raw source string — the frontend gets
`./assets/chrome.svg` (path it can't render) and falls back to the error icon.

<files>
- `packages/cli/src/cli/commands/run.ts`
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts` (no change;
  reference only)
</files>

<action>
- Add `resolverOptions: ResolveIconPathOptions` to `SetupAddonServicesOptions`.
- Destructure it in `setupAddonServices`.
- Replace `{}` (lines 217 and 239) with `resolverOptions` in the two
  `buildDeckConfigMessage` calls.
- Pass `resolverOptions` when calling `setupAddonServices` in `run.ts` (the
  call already happens with `resolverOptions` in scope at line 864).
- Export `SetupAddonServicesOptions` is already exported; no API change
  beyond the new field.
</action>

<verify>
- `pnpm -C packages/cli typecheck` — no new errors.
- `pnpm -C packages/cli test` — pre-existing failures unchanged; no new
  failures introduced.
</verify>

<done>
- `grep -n 'resolverOptions' packages/cli/src/cli/commands/run.ts` shows
  the field on `SetupAddonServicesOptions` and its use at lines 217/239.
- Manual: change overlay-available status and confirm chrome button on
  main deck retains its bitmap (no error icon).
</done>

## Task 2 — N-1 toggle on overlay root (Bug 2)

**Root cause:** `computeSystemButtonForSlotN1` injects `core:back` for any
non-main deck, including the root of an overlay (e.g. `chrome-overlay:shortcuts`).
At the root there's nowhere to back to, so tap is a no-op. The user wants the
n-1 slot to be a single overlay-toggle on overlay roots (and the existing
split mode on main deck remains `core:settings-entry`).

<files>
- `packages/cli/src/deck/system-back-injection.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/deck/__tests__/system-back-injection.test.ts`
</files>

<action>
- In `system-back-injection.ts`, change the return order:
  `if (deck.isOverlay) return "core:overlay-toggle"` BEFORE the
  `core:back` fallback. Lock still short-circuits to `null`.
- In `runtime.ts` `handleSystemButton`, make `core:overlay-toggle` handle
  the `tap` gesture the same way `dbl-tap` already toggles (set overlay to
  `availableOverlayDeckId` when none, `null` when an overlay is active).
  Refactor the toggle block so both gestures reuse the same helper inline
  (one-liner ternary is enough — no new function).
- Update `system-back-injection.test.ts`:
  - Test "overlay deck returns back (so SplitSurface renders with overlay-toggle secondary)"
    → rename and assert `core:overlay-toggle`.
  - Test "overlay deck with navStackDepth=3 returns back" → assert
    `core:overlay-toggle` (overlay flag takes precedence).
  - Add `injectSystemButtons` test asserting `core:overlay-toggle` at n-1
    on an overlay deck.
- Frontend (`Deck.tsx:275-278`) needs no change: `core:overlay-toggle` is
  not in the split-mode list, so it renders as a single icon. Tap fires
  through `invokeAction` → `handleSystemButton` → toggle.
</action>

<verify>
- `pnpm -C packages/cli test src/deck/__tests__/system-back-injection.test.ts`
  passes (new assertions hold).
- `pnpm -C packages/cli typecheck` — no new errors.
- Manual: with chrome-overlay addon present, open chrome; n-1 button is
  the toggle (no split). Tap toggles overlay off/on; dbl-tap also toggles.
</verify>

<done>
- `grep -n "core:overlay-toggle" packages/cli/src/deck/system-back-injection.ts`
  shows the new branch.
- All `system-back-injection.test.ts` cases pass.
</done>

## Task 3 — Requirements PATH fallback + chrome-deck macros (Bug 3+4)

**Root cause:** `probeCommand` only runs `which`, which inherits PATH from
the spawning process. systemd/launchd/IDE-launched CLIs strip PATH, so
`which ydotool` returns non-zero even when ydotool sits at
`/usr/local/bin/ydotool`. The user's own `chrome` deck in `config.yml`
also uses raw `xdotool key ctrl+t` (not `type://`), so even after fixing
detection the chrome deck's buttons won't fire the typed-macro path.

<files>
- `packages/cli/src/system/requirements.ts`
- `packages/cli/src/system/__tests__/requirements.test.ts`
- `packages/cli/src/cli/commands/run.ts` (wire `extraFsProbe`)
- `config.yml`
</files>

<action>
- In `requirements.ts`:
  - Add optional `extraFsProbe?: (command: string) => boolean` to
    `RequirementsCheckDeps` (keep all existing fields).
  - In `probeCommand`, after `which` returns nothing, fall back to
    `extraFsProbe?.(command) === true`. Don't change the `which` happy
    path.
- In `run.ts` (~line 719, where `checkRequirements` is called), pass an
  `extraFsProbe` that probes `/usr/local/bin`, `/usr/bin`,
  `${homedir()}/.local/bin`, `/snap/bin`, `/opt/homebrew/bin` (the
  common install dirs we miss when PATH is stripped). Use `statSync`
  with a `try/catch` per dir; return true on the first hit.
- In `requirements.test.ts`, keep the existing 11 tests passing (no
  change to those — they don't pass `extraFsProbe`, which is optional).
  Add two tests:
  1. `extraFsProbe` returning true marks the command available even
     when `which` fails.
  2. Without `extraFsProbe`, behavior matches today (which is the
     existing test surface).
- In `config.yml`, convert the `chrome:` deck's seven `xdotool key X`
  actions to `type://X` (one per button, listed below). `type://` is the
  typed-macro syntax used elsewhere (test-deck position 1/2 in this
  same file). Don't change label names, icons, or positions.
  - `xdotool key ctrl+t` → `type://ctrl+t`
  - `xdotool key ctrl+w` → `type://ctrl+w`
  - `xdotool key ctrl+shift+t` → `type://ctrl+shift+t`
  - `xdotool key ctrl+shift+n` → `type://ctrl+shift+n`
  - `xdotool key ctrl+r` → `type://ctrl+r`
  - `xdotool key ctrl+shift+r` → `type://ctrl+shift+r`
  - `xdotool key F12` → `type://F12`
</action>

<verify>
- `pnpm -C packages/cli test src/system/__tests__/requirements.test.ts`
  passes (11 existing + 2 new).
- `pnpm -C packages/cli typecheck` — no new errors.
- Manual: launch the CLI from a stripped-PATH env (`env -i PATH=/usr/bin
  ./packages/cli/dist/index.js run`); the requirements check reports
  keyMacro available.
</verify>

<done>
- `grep -n extraFsProbe packages/cli/src/system/requirements.ts` shows
  the new optional dep.
- All `requirements.test.ts` cases pass.
- `grep -n 'xdotool key' config.yml` returns nothing inside the `chrome:`
  deck (the deck still has icons / labels / positions intact).
</done>

## Commit cadence

After each task:
```
git add [files]
git commit -m "feat(quick-005): [task description]"
```

## Out of scope

- Pre-existing test failures (weather frontend, emoji selector, run.test
  mock) — noted in STATE.md, not addressed.
- Refactoring `injectSystemButtons` to take runtime state per-call — the
  static startup-time injection is enough for the overlay-root case; full
  runtime-state injection would be a separate task.