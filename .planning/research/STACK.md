# Stack — v1.7 (Polish & 3rd-Party Ecosystem)

**Milestone:** v1.7 (planning)
**Researched:** 2026-06-17
**Scope of this file:** Only v1.7-new or v1.7-verify items. Reuse the v1.4/v1.5 stack for everything else (see `.planning/research/v1.4/STACK.md` and the v1.5 `STACK.md` at the repo root).

## TL;DR — what v1.7 actually needs

| v1.7 item | Stack impact |
|-----------|--------------|
| 1. Back button still slow on settings page | No stack change. Profile + fix is in `runtime.ts` / `browser-renderer.ts`. |
| 2. Double-tap fires `onTap` when no `onDblTap` defined | No stack change. Behavioral fix in `runtime.ts` `onKeyEvent` (line ~1739): `if (instance.onDblTap)` branch is what currently decides — needs inverted gating. |
| 3. System buttons don't use `SplitActionSurface` when overlay is present | No stack change. `system-buttons.ts` `getLastPositionSystemButton` already supports `pendingOverlayDeck`; v1.7 fixes the dispatcher to honor it for the **settings** slot too. |
| 4. Overlay-deck icon not used in Toggle / `SplitActionSurface` secondary | No new dep. `DeckConfig` schema needs an optional `icon` field (`core/schemas.ts:75-200` area). The icon path is consumed at `runtime.ts:1058-1102`. |
| 5. Emoji copy works, paste does not | One real fix in `util/clipboard.ts` (and a small wiring change so it can reach `keyMacroProvider`). See §1 below. |
| 6. Macro keystrokes not sent to apps | Same seam as #5 — surface `keyMacroProvider.send` failure through the existing runtime-button-error helper instead of swallowing. |
| 7. `Bars` value text formatter, no decimals by default | Reuse **`numbro` v2.5.0** (already a dep, verified). New `formatter: 'value'` slot. See §2. |
| 8. `system-status-label-values` 2/3-item layout | No stack change. Already supports 1–4 lines via `LabelValueListSurface` (`ui/surfaces/LabelValueListSurface.tsx`); v1.7 fixes the `double`/`stack` sizing only. |
| 9. New `ValueDisplay` builtin addon | Reuse `useButtonActionCommand` + `LabelValueList`. See §3. |
| 10. 3rd-party addon at `/works/test/test-sireno-deck` | Folder-install. **No `pnpm install` step.** See §4. |
| 11. 3rd-party theme at `/works/test/test-sireno-deck-theme` | Folder-install via config `theme: /works/test/test-sireno-deck-theme` (or relative). **No `pnpm install` step.** See §5. |

**No new npm dependencies are required for v1.7.** The only stack action items are:
- A optional `clipboardy` minor-version bump (4.x → 5.x) that buys Wayland clipboard support and a Windows ARM64 fallback binary. Independent of the bug fixes — see §1.4.

## 1. HID/keystroke injection + clipboard — the real v1.7 story

### 1.1 What we already have

The keystroke-injection stack is built around a per-OS shell provider, not an npm package. All three providers live under `packages/cli/src/system/key-macro/` and are wired through `getKeyMacroProvider({ platform, env, executor })` (`index.ts`).

| OS | Backend | Implementation | Limitation |
|----|---------|----------------|------------|
| Linux (X11 + Wl-XWayland) | `xdotool key --clearmodifiers …` (shell) | `linux.ts` builds `xdotool` argv, joins with `+`, runs via `execa('/bin/sh', ['-c', program])` | Requires the `xdotool` system binary. **Fails on pure Wayland** (no `WAYLAND_DISPLAY`); `index.ts:27` (`isPureWayland`) returns `createUnsupportedKeyMacroProvider(deps, 'pure-wayland')` which silently no-ops and logs a warn. |
| macOS | `osascript` AppleScript → System Events `keystroke`/`key code` with `using {… down}` | `darwin.ts` builds `tell application "System Events" …` and shells via `/usr/bin/osascript -e`. | Requires Accessibility permission for the host terminal running Sireno. **Not exercised in CI; the existing test mocks the `executor`.** |
| Windows | PowerShell + `System.Windows.Forms.SendKeys` | `windows.ts` builds a PS script, runs `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -Command …`. | SendKeys cannot type Unicode; non-ASCII characters (e.g. emoji) need to go through clipboard + Ctrl+V (i.e. `pasteText`), not `keyMacro`. This is the intended split. |

The keystroke **token grammar** (`ctrl+shift+t`, `F12`, `wait 200ms`, modifier aliases) is parsed in `parser.ts` and validated against `KNOWN_MODIFIERS`. This surface has not changed since v1.6 and is exercised by the chrome overlay deck fixture (`packages/cli/fixtures/phase-68/config.chrome-overlay-extensions.yml`).

**Confidence:** HIGH — `key-macro/` directory is small and explicit, and the action button already uses it (`core-buttons/buttons/action.tsx:30-58`).

### 1.2 Clipboard

`util/clipboard.ts` is a 14-line file that wraps `clipboardy.write(text)`. No other deps. Used by `runtime.ts:1005-1008` (`methods.pasteText`).

**`clipboardy` version status (HIGH confidence — live fetch this session):**

| | Version | Notes |
|---|---------|-------|
| Installed (`packages/cli/node_modules/clipboardy/package.json`) | **4.0.0** | Requires Node 18+ (we run Node 20+ — fine). |
| Latest stable (npm) | **5.3.1** | 1.3 minor versions ahead. Requires Node 20+ (we already have it). |
| First v5 | **5.0.0** (Sep 2025) | Added **Wayland clipboard support** via bundled `wl-clipboard` binary. Breaking change: bumped Node requirement to 20. |

Verdict: We are 1.3 minor versions behind. **No required bump for v1.7.** The Wayland clipboard support added in v5 would benefit bug #6 (action buttons on Wayland sessions can copy+paste, but xdotool still can't *trigger* the paste), but it is not a v1.7 blocker. Recommend a deferred bump, not in v1.7 scope.

### 1.3 Why the emoji paste is broken (bug #5)

Trace of the call path:

1. `emojiEntryButton.onTap` (`builtin-addons/emoji-selector/buttons/entry.tsx:28-30`) calls `methods.pasteText(config.emoji)`.
2. `methods.pasteText` (`runtime.ts:1005-1008`) is a one-liner: `const { pasteText: doPaste } = await import('../util/clipboard.js'); await doPaste(text);`
3. `util/clipboard.ts:3-5` does only `clipboardy.write(text)`. **No keystroke is sent.**

The keystroke-injection half was supposed to be added in Phase 59-01 per `.planning/phases/59-emoji-keystroke-injection-and-category-fix/59-01-SUMMARY.md`, which describes extending `runtime.ts`'s `pasteText` body to call `keyMacroProvider.send(platformPasteKey)` after `clipboardy.write(text)`. **`git log -- packages/cli/src/deck/runtime.ts` shows no commit implementing that change** (the only `keyMacroProvider.send` addition in that file is `quick-042` for the action button's separate `keyMacro` method). The Phase 59-01 work was either never landed or was reverted during the v1.6 emergency gap-closure (`e5bcbf8` "restore Phase 59-61 implementation" rescue commit, which restored other phase 59 outputs but not the pasteText extension). **Confidence: HIGH** for the missing pasteText extension; the SUMMARY describes intent, the runtime code does not match it.

**v1.7 fix (small, surgical):** Extend `pasteText` in `util/clipboard.ts` (or relocate the seam into `runtime.ts` so it can call the existing `keyMacroProvider`) to:

```
await clipboardy.write(text)
const platformPasteKey = hostContext.os.type === 'darwin' ? 'cmd+v' : 'ctrl+v'
await keyMacroProvider.send(parseKeyMacro(platformPasteKey))
```

The provider, executor, parser, and platform-paste-key selection are all already built — we just need to wire them through the clipboard helper. This is the same `getPlatformPasteKey` helper that 59-01-SUMMARY describes, and the call sites need to grow awareness of the same `pasteKeystrokeEnabled?: boolean` opt-out the SUMMARY mentions.

### 1.4 Why macro keystrokes may look broken to users (bug #6)

Three plausible root causes, all already on disk:

- **xdotool not installed** on the host. The `linux.ts` provider shells out to `xdotool`; if the binary is missing, `execa('/bin/sh', ['-c', 'xdotool key …'])` returns `failed: true` and `linux.ts:91-93` currently **swallows the failure with a comment** ("Non-fatal: keep macro playing through unless the program is missing."). The user sees the button react but no keystroke lands. **Fix:** surface the failure through `showRuntimeButtonError` (the existing button-error helper) so the user gets a warning triangle + 4-digit code, matching the pattern Phase 5 established.
- **Pure Wayland session.** The `getKeyMacroProvider` switch at `index.ts:54-58` returns `createUnsupportedKeyMacroProvider` and the action button's `onTap` returns cleanly with no error. **Fix:** the runtime-button-error helper should also fire in this case (treat unsupported as a user-visible failure, not a silent no-op). This aligns with the v1.6 intent ("Errors from `keyMacroProvider.send` propagate") that was never wired.
- **The action button only checks `key_macro` on tap/dbl-tap/hold, not `commands`** — that's by design (per Phase 34), but if the user's chrome deck fixture has `commands:` (Phase 68 does not — it uses `key_macro`), they hit `runCommand` which is unrelated. The phase-68 fixture uses `key_macro` correctly, so this is unlikely the user's actual bug.

**Stack change required:** none. The fix is in `runtime.ts` (`onTap` → `methods.keyMacro` call site must propagate failure) and `linux.ts` (must report failure, not swallow).

## 2. `numbro` for the `Bars` value formatter (bug #7)

`packages/cli/package.json` pins `"numbro": "^2.5.0"`. The installed `node_modules/numbro/package.json` reads version `2.5.0`. **Latest stable on npm is also 2.5.0** — there is no 3.x. Last published 2 years ago. The library is in maintenance mode but the API is frozen and the v2.5.0 release fixed a few rounding issues that are still relevant.

### 2.1 Confirming `mantissa: 0` and `optionalMantissa` work as the v1.7 spec wants

From the live numbro format docs (http://numbrojs.com/format.html — verified this session, HIGH confidence):

- `mantissa: 0` is valid (the default is 0 — the table example "10000 → 10000" with `{ thousandSeparated: true }` alone proves it).
- `optionalMantissa: true` makes the configured mantissa a *cap*, not a floor. Confirmed by the docs example: `1234.5` with `{ average: true, mantissa: 2, optionalMantissa: true, … }` → `1k` (trims the fraction because the abbreviated form is shorter). This is the "no decimals by default, but keep precision when the number is short" semantic the v1.7 spec asks for.

**Recommended format for bug #7 (Bars value, no decimals by default):**

```ts
numbro(value).format({ average: true, mantissa: 0, optionalMantissa: true, thousandSeparated: true })
```

This gives:
- `1500` → `2k` (abbreviated, no decimals)
- `999` → `999` (under the `k` threshold, no decimals)
- `12.345` → `12` (no decimals)

If the user wants *all* values rendered as plain integers with no abbreviation (e.g. raw bar counts under 100), drop `average: true` and keep `mantissa: 0` only. The formatter slot in `BarsItem` is the right place to expose both — see the `Bars` PR for `numbro` in v1.5 (`builtin-addons/system-status/domain/display-metrics.ts:55-79`) for the existing pattern.

### 2.2 Reuse the v1.5 numbro display mapper, don't reinvent

`builtin-addons/system-status/domain/display-metrics.ts` already wraps numbro with a `SystemStatusFormatter` union (`'bytes' | 'count' | 'frequency-ghz' | 'percent' | 'uptime'`). **The v1.7 `Bars` formatter should follow the same shape** — add `'value'` to the formatter union, default to `'value'`, and route through `numbro(value).format({ average: true, mantissa: 0, optionalMantissa: true, thousandSeparated: true })`. Reuses the same surface, no new pattern, easy to test, easy for the future `ValueDisplay` addon (item #9) to borrow.

**Confidence: HIGH.** The numbro API is stable and the display-mapper pattern is already in the repo.

## 3. `ValueDisplay` addon (item #9)

Stack needs: **nothing new.** Verified patterns already in repo:

- `useButtonActionCommand(({ config }) => config.commands)` — `addon/api.ts:127-168`. Already consumed by `system-status-label-values` (`label-values.tsx:70`), `system-status-bars` (`bars.tsx:88`), `date-time-date-time` (`date-time.tsx:38,49`), and `date-time-analog-clock` (`analog-clock.tsx:89`).
- `<LabelValueList lines={…} />` — `ui/surfaces/LabelValueListSurface.tsx`. Already 1–4-line aware (`lines` is a tuple of length 1–4). For v1.7's "max 3 values" we cap at 3 in the zod schema, not in the component.
- The `refreshMetrics` pattern (`label-values.tsx:37-43`) plus `getCanonicalSystemMetrics` is a template the new addon will need to copy or extract, because `getCanonicalSystemMetrics` is a system-status-specific adapter. **Open question:** should `ValueDisplay` go through the system-status metric catalog, or should it execute per-value `command`s directly? The user spec ("per value: command returning the value, label, optional icon, formatter, units") strongly suggests per-value `command` (consistent with the existing `useButtonActionCommand` tap/hold/dbl-tap shape) — i.e. parallel to the chrome deck's `key_macro` field on `action` buttons, not parallel to the system-status metric catalog. **Recommend:** `ValueDisplay` runs a per-value `display_command` (mirroring `date-time` and `action` button shapes) and formats the result with the numbro mapper from §2.

**Confidence: HIGH** for "no new stack"; **MEDIUM** for "uses per-value command vs. metric catalog" — depends on user intent (see Open Questions).

## 4. 3rd-party addon loader (item #10)

### 4.1 The path `/works/test/test-sireno-deck` does **not** exist on disk

I checked: `ls /works/test/test-sireno-deck` and `ls /works/test/test-sireno-deck-theme` both return "No such file or directory" as of this session (2026-06-17). The user has not yet created either repo. **The v1.7 phase that uses them must include a setup step that creates the directory tree** (package.json with `sirenoAddon` manifest, `src/index.tsx` exporting a `SirenoAddon` default, and a config snippet that points to it). This is not a stack issue but a planning artifact the user should be aware of.

### 4.2 What the loader needs once the addon is on disk

**No `pnpm install` step is required** for a local-folder addon. The mechanism is:

1. User creates a directory with `package.json` declaring:
   ```json
   {
     "name": "test-sireno-deck",
     "type": "module",
     "sirenoAddon": {
       "apiVersion": 1,
       "main": "./src/index.tsx"
     }
   }
   ```
2. The Sireno `config.yml` declares the addon with `source: local`:
   ```yaml
   addons:
     - name: test-sireno-deck
       enabled: true
       source: local
       path: /works/test/test-sireno-deck
   ```
3. `addon/loader.ts:55-76` (`getAddonRootPath`) resolves `path` to an absolute path and skips the npm `require.resolve` fallback.
4. `addon/loader.ts:89-105` (`importAddon`) detects `.tsx` extension and routes through `importRawSourceAddon` → `tsx/esm/api` `tsImport` with a synthetic `tsconfig.json` (or the addon's own if it ships one).
5. The addon must `import { defineMountedButton, … } from 'sireno-deck-cli'` — the loader synthesizes a `paths` mapping from the `sireno-deck-cli` package name to the local `packages/cli/src/index.ts` (`loader.ts:212-218`). The same trick is used in the committed fixture `packages/cli/fixtures/phase-23/local-raw-addon/` and works.

**Existing proof:** `packages/cli/fixtures/phase-23/local-raw-addon/` is a working 3rd-party-style raw-source addon (just with `enabled: true` flipped in the fixture). The phase-23 fixture has a `tsconfig.json` already; the loader handles both cases (with and without).

**Stack verdict:** No new package, no new code path. **Confidence: HIGH.**

### 4.3 Addon API stability — can a 3rd-party addon be authored against the current public API?

The exported surface used by 3rd-party addons is the package `index.ts` barrel (`defineMountedButton`, `useButtonActionCommand`, `AddonButtonMethods`, `AddonButtonActionCommandsSchema`, `AddonButtonKeyMacroSchema`, `AddonButtonActionConfigSchema`, `ButtonSurface`, `SIRENO_ADDON_API_VERSION = 1`). All of these have been stable since Phase 34 (action button `commands.tap | hold | double-tap` shape) and Phase 49 (post-ship amendments) — no breaking changes through v1.5 or v1.6. The "Bumping `SIRENO_ADDON_API_VERSION`" item is explicitly carried as out-of-scope in the v1.6 roadmap. **Confidence: HIGH** that a 3rd-party addon authored against the current API will work without any core changes.

The one forward-compatibility risk: if the 3rd-party addon uses an addon-defined **`type` prefix** that collides with a builtin (`action`, `toggle`, `emoji-emoji-button`, `system-status-bars`, `system-status-label-values`, `locked-time-tile`, etc.), the registry will reject the duplicate type. The Phase 23 fixture's `phase-23-local-raw-button` and the new test-sireno-deck addon should pick a unique `type` (e.g. `test-sireno-deck-clock-cycle-button`).

## 5. 3rd-party theme loader (item #11)

### 5.1 The path `/works/test/test-sireno-deck-theme` does **not** exist on disk

Same as §4.1 — confirmed `ls` returns "No such file or directory". The user has to create the directory with a `manifest.yml` (theme manifest schema in `config/theme/schemas.ts:53-61`).

### 5.2 No `pnpm install` step required

The theme loader (`config/theme/theme.ts`) resolves themes by:

1. **Builtin first** (`getBuiltinThemeTarget`, `theme.ts:153-183`): walks up from `MODULE_DIRECTORY` looking for `themes/<name>/manifest.yml`. If matched, the builtin wins. If the user names their custom theme `dark` or `light`, it would shadow the builtin — but they would have to put it under `themes/<name>/` *inside the package*, which is awkward. Better: use a unique name.
2. **Local fallback** (`getLocalThemeTarget`, `theme.ts:185-215`): if the `theme` config field is an absolute path or a path that resolves relative to the cwd, the loader looks for `<path>/manifest.yml` (or treats the path itself as the manifest if the user pointed directly at `manifest.yml`).
3. **Runtime import** (`importThemeRuntime`, `theme.ts:360-441`): if the theme's `main` is `.ts/.tsx/.jsx`, it goes through `tsx/esm/api` `tsImport` with `PACKAGE_TSCONFIG_PATH`. If `.js`, plain `import()`. The runtime is expected to export `buttonFrame` (and optionally `mediaPlayer.surface`, `ui`).

**Usage in config.yml:**

```yaml
theme: /works/test/test-sireno-deck-theme
# or relative to cwd:
theme: ../test/test-sireno-deck-theme
```

**Stack verdict:** No new package, no new code path. **Confidence: HIGH.** The committed fixture `packages/cli/fixtures/phase-25/custom-tsx-theme/` is the existing proof, and the same `importThemeRuntime` path serves it.

### 5.3 Theme API surface the 3rd-party theme will need

- `manifest.yml` with `name`, `main`, `colorTokens`, `typography`, optional `tailwind.safelist`, optional `mediaPlayer.surface` — schema at `config/theme/schemas.ts:53-61`.
- `index.tsx` (or `.ts`/`.js`/`.jsx`) exporting `buttonFrame(state, children)`. May also export `ui` (an object of `icon`, `chip`, `text`, `label`, `tapIndicator`, `surfaces.{iconLabel,bars,splitAction}` presenters — see `config/theme/schemas.ts:86-97`) to override Sireno's bundled surfaces.
- CSS asset rewriting happens automatically for any `assets.styles` listed in the manifest (`theme.ts:443-487`).

**"Yellow-based colors, replaces all UI components with own alternatives"** (per user spec) maps directly to: `colorTokens: { primary: '#facc15', … }` for the yellow, plus a `ui: { text, chip, label, icon, tapIndicator, surfaces: { iconLabel, bars, splitAction } }` block where every entry is a custom component. No new contract, no core change needed. **Confidence: HIGH.**

## 6. Version audit

Installed vs. latest stable, for everything that v1.7 might consider touching:

| Package | Installed | Latest stable | Gap | v1.7 action |
|---------|-----------|---------------|-----|-------------|
| `numbro` | 2.5.0 | 2.5.0 | none | Reuse. Add `'value'` formatter per §2. |
| `clipboardy` | 4.0.0 | 5.3.1 | 1.3 minor behind (5.0.0 added Wayland clipboard; 5.3.0 added Windows ARM64 fallback) | **Optional** bump — bug #5/6 fix doesn't need it. Defer to v1.8 or v2. |
| `lucide-react` | 0.552.0 | not checked this session (low relevance to v1.7) | — | None |
| `react` / `react-dom` | 19.2.x | not checked (low relevance) | — | None |
| `react-reconciler` | 0.33.0 | not checked | — | None |
| `@elgato-stream-deck/node` | 7.6.0 | not checked | — | None — no HID/device work in v1.7 scope. |
| `zod` | 3.24.0 | not checked | — | None — zod is the schema backbone; no version bump. |
| `pino` | 9.0.0 | not checked | — | None. |
| `tailwindcss` | 4.1.0 | not checked | — | None — themes can ship their own safelist. |
| `systeminformation` | 5.31.6 | not checked | — | None. |
| `execa` | 9.5.2 | not checked | — | None — used by `keyMacroProvider` and `executeCommand`. |
| `dbus-next` | 0.10.2 | not checked | — | None. |
| `get-windows` | 9.3.0 | not checked | — | None. |
| `playwright` | 1.55.0 | not checked | — | None. |
| `sharp` | 0.34.5 | not checked | — | None. |
| `dayjs` | 1.11.21 | not checked | — | None. |
| `js-yaml` | 4.1.0 | not checked | — | None. |
| `yargs` | 18.0.0 | not checked | — | None. |
| `clsx` | 2.1.1 | not checked | — | None. |
| `tailwind-merge` | 3.6.0 | not checked | — | None. |

**HID/keystroke injection is not an npm dep.** It's a system binary on Linux (`xdotool`) and a built-in tool on macOS (`osascript`) / Windows (`powershell` + `System.Windows.Forms`). No package to audit.

**Confidence: HIGH** for `numbro` (live npm + live docs), **HIGH** for `clipboardy` (live npm + live GitHub releases), **MEDIUM** for the rest (sourced from `packages/cli/package.json` + `node_modules` snapshot — not freshly fetched this session because the v1.7 scope doesn't touch them).

## 7. What NOT to use for v1.7

- **A new HID library** (e.g. `node-hid`, `@nut-tree/nut-js`, `iohook`) — the existing `keyMacroProvider` covers our needs and we already have the cross-platform shim. Adding a second keystroke path invites two sources of truth.
- **A second formatter library** (`numeral.js`, `d3-format`, `intl-numberformat` polyfill) — `numbro` v2.5.0 already provides `mantissa: 0` and `optionalMantissa: true`, and is already a dep. Bumping to `numbro` 3.x is not an option (3.x doesn't exist).
- **An addon-bundled dependency-installer** — addons are in-process; the loader's `importRawSourceAddon` path is the only entry, and it deliberately does not run `pnpm install` (security, determinism). If a 3rd-party addon needs an external package, it must be a peer of the Sireno CLI (i.e. a dep of `sireno-deck-cli`).
- **A real-time keyboard hook** (e.g. `node-global-key-listener`) — the `keyMacroProvider` only *sends* keystrokes, never reads. Adding a read path is a feature, not a v1.7 stack addition.
- **A new clipboard library** (`electron`'s `clipboard` module, native `pasteboard`) — `clipboardy` works across X11/Wayland/macOS/Windows. The 4.x → 5.x bump is a separate deferred cleanup.

## Open Questions

These need the user to decide before planning can lock the v1.7 phase plan:

1. **What is the test addon's addon name and button type names?** The user said "a new button type whose surface is a plain color that changes every second" — needs a unique `type` string that doesn't collide with builtins (e.g. `test-sireno-deck-color-cycle-button`). The user should pick, or I will propose a default and let the user override.
2. **Should `ValueDisplay` execute per-value `display_command`s (parallel to `action` button `key_macro`), or should it share the system-status metric catalog via `getCanonicalSystemMetrics`?** The user's spec ("per value: command returning the value, label, optional icon, formatter, units") reads more like the former, but the ValueDisplay's analogy to `system-status-label-values` reads more like the latter. Need explicit pick.
3. **Bug #1 (back button still slow on settings page) — is this the same render path as the v1.6 PERF-01 fix, or a different code path?** The Phase 58 PERF-01 fix profiled `handleTap → onTap → navigateToDeck → goBack → activateDeckSurface` and brought in-process back-button latency to 12.35ms; the hardware caveat is documented. If "settings page" back is still slow, the user needs to specify the trigger (settings → main, main → settings, sub-deck → settings, settings → sub-deck, or "the runtime-injected back button on the settings deck itself") so we can profile the right branch. **This affects scoping of bug #1.**
4. **Bug #2 (double-tap fires `onTap` when no `onDblTap`):** confirm the desired behavior is "if a button has no `onDblTap` and the user double-taps it, **nothing happens** (no `onTap` either)". This is a real behavior change from current (current: second tap fires `onTap` after the 400ms double-tap window). Some users may prefer the current behavior. Need explicit confirmation before locking the fix.
5. **`/works/test/test-sireno-deck` and `/works/test/test-sireno-deck-theme` do not exist on disk** (verified this session). Should v1.7 include a setup phase to create them as part of the plan, or does the user pre-create them and just need a verification/registration phase? Affects how the first plan is scoped.
6. **clipboardy 4.x → 5.x bump**: keep it out of v1.7 (recommended), or include it as a v1.7 prep-task so future Wayland testing works? Not blocking any v1.7 bug, but worth deciding.
7. **Will the 3rd-party theme need to override `ui.surfaces.splitAction`?** The user said "replaces all UI components with own alternatives" — that reads like yes. If yes, the test theme needs to provide a custom splitAction presenter (per `config/theme/schemas.ts:95`). No blocker; just a contract clarification.
