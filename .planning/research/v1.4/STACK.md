# Stack Research — v1.4 Build, Bundle & UX Polish

**Domain:** Standalone executable distribution, calendar button, weather addon, media-player mute/volume, emoji-selector multi-page, system-reserved back button
**Researched:** 2026-06-04
**Confidence:** MEDIUM-HIGH (verified current docs) / LOW (code-signing requires hardware not verified)

---

## Recommended Stack

### Keep the existing core stack (verified in `packages/cli/package.json`)

| Technology | Version | Role in v1.4 | Why |
|------------|---------|--------------|-----|
| TypeScript | `~5.7` | type-safe source for bundled output | The bundle is built from the same TS source; the bundle pipeline just changes, not the language. [HIGH: codebase scan] |
| `tsdown` | `^0.22.0` | current ESM bundler for `packages/cli/dist/` | The build still produces an ESM bundle; the SEA/pkg step consumes that bundle, not raw TS. [HIGH: `tsdown.config.ts`] |
| `pnpm` workspaces | `10.0.0` | build orchestration across the `sireno-deck-cli` package | The repo already standardises on pnpm; we keep that and add `sea-config.json`/`pkg` config inside `packages/cli/`. [HIGH: `package.json`, `pnpm-workspace.yaml`] |
| Node.js runtime | `>=20.x` LTS | target runtime that the bundle runs under | Node SEA is officially supported on 20+ (added in 19.7 / 18.16, `--build-sea` CLI added in 25.5). We target `node20` so the same Node can both build and inject. [HIGH: Node SEA docs] |
| `playwright` | `^1.55.0` | browser-renderer for emulator + hardware deck | Already in deps. Keep it; the change is around when/where `chromium` is installed, not whether we depend on Playwright. [HIGH: `browser-renderer.ts:80-83`] |
| `systeminformation` | `^5.31.6` | cross-platform system metrics | Unchanged. The new weather/media-volume work does not need a new OS-detection surface — `HostContext.os.type` already gives `linux|macos|windows|unknown`. [HIGH: `host-context.ts`] |
| `execa` | `^9.5.2` | subprocess for OS audio commands and config commands | Unchanged; this is the same seam media-player already uses for `playerctl`. [HIGH: `linux-media-controller.ts:24-39`] |
| `dayjs` | `^1.11.21` | date tokens for the new calendar button | Already the canonical date formatter in the date-time addon. Reuse, do not re-introduce. [HIGH: `format.ts`] |
| `zod` | `^3.24` | config/manifest validation | Unchanged; used by every new schema in this milestone. [HIGH: `core/schemas.ts`] |

### Add for v1.4

| Technology | Where it lands | Why |
|------------|----------------|-----|
| `node --build-sea` (no new npm dep) | `packages/cli/scripts/build-sea.mjs` | Produces a single-file executable on the *same* Node major as the one shipping to users. The CLI already targets `node20`, so we ship a Node-20-built SEA. [HIGH: Node SEA `--build-sea` docs] |
| `sea-config.json` | `packages/cli/sea-config.json` | SEA config declaring `main`, `output`, `mainFormat: "module"`, `disableExperimentalSEAWarning: true`, `useCodeCache: true` and optional `assets` for `node:sea` lookups. [HIGH: Node SEA docs] |
| GitHub Actions matrix | `.github/workflows/release.yml` | Per-OS build jobs (`ubuntu-latest` for x64 Linux, `macos-13`/`macos-latest` for arm64/x64 Mac) that each invoke the same build script. macOS code-signing/notarization stays on the macOS runner — Windows-signed binaries can be built on Windows runners. [HIGH: GitHub Actions matrix docs] |
| `npx playwright install --with-deps chromium` (no new dep) | first-run guard inside `packages/cli/src/render/browser-renderer.ts` | Chromium is the only Playwright browser the project uses. `install --with-deps` resolves system shared libraries on Linux as well. [HIGH: Playwright browsers docs] |
| `osascript` (no dep) | macOS media-controller in `media-player/domain/macos-media-controller.ts` | Apple-blessed path for system volume; no `sudo` required for the `set volume ...` line itself. [HIGH: `osascript` set-volume examples] |
| `pactl` (no dep, already implied by `playerctl` on Linux) | Linux media-controller | `pactl set-sink-mute @DEFAULT_SINK@ toggle` and `set-sink-volume @DEFAULT_SINK@ +5%` work against both PulseAudio and PipeWire's `pipewire-pulse` shim, which is now the default on Debian, Ubuntu, and Fedora. [HIGH: pactl(1) man page, PulseAudio Wikipedia] |
| `nircmd` or `AudioDeviceCmdlets` (out-of-scope dep) | Windows media-controller | Windows has no first-party `pactl` equivalent. `nircmd` is the closest single-binary option, but adding it is a downstream install concern; the bundled addon should leave the Windows adapter as "unavailable" with a clear message for v1.4 and document the path. [LOW: no clean built-in, requires third-party] |

### Milestone-level recommendations

| Recommendation | Use | Why |
|---------------|-----|-----|
| Ship a Node-20 SEA as the primary Linux + macOS distributable | `node --build-sea sea-config.json` | No runtime install, smallest moving parts, and the project already targets Node 20+. Cross-platform build is a CI concern, not a runtime one. [HIGH: Node SEA docs] |
| Keep the existing `pnpm` build and tsdown as the *first* stage of the pipeline, then add a *second* `pnpm cli:build:sea` step that wraps the bundle into a SEA | bundling in two clear stages | This keeps the watch/dev loop and the existing `pnpm cli:dev` working unchanged. The SEA layer is a release-only concern. [HIGH: codebase scan, current scripts] |
| Defer the Mac code-signing problem to the macOS runner; do not run it on the Linux runner | CI matrix | Apple requires ad-hoc signing to happen on a Mac. Trying to sign from Linux breaks the "no ad-hoc on Linux" rule and pulls in cross-compilation toolchains. [HIGH: Node SEA + Apple notarization notes] |
| Use `useCodeCache: true` in the SEA config | faster SEA startup | Code cache is precompiled V8 bytecode embedded in the blob; documented to be safe because we keep the same Node major for build and run. [HIGH: Node SEA `useCodeCache` docs] |
| Disable `useSnapshot` for now | avoid snapshot drift | Snapshots are platform- and V8-version-bound and would need a build host for every target. Code cache is sufficient for our startup-cost concern. [HIGH: Node SEA snapshot caveat] |
| Auto-install Chromium on first run with a single shared helper | `ensureChromiumInstalled()` | Centralise the "is Chromium present? if not, run `npx playwright install --with-deps chromium`" logic. Avoids the existing test surface where `start.test.ts` already pretends Chromium is missing for fault injection. [HIGH: `start.test.ts:911-919`] |

---

## Alternatives Considered

| Recommended | Alternative | Why not preferred |
|-------------|--------------|-------------------|
| Node SEA (`--build-sea`) | `@yao-pkg/pkg` | pkg is a stronger feature surface (cross-compile, native addons) but pulls a heavy native dependency, has its own precompiled runtime snapshot, and historically struggles with modern ESM. The Node SEA path is smaller, officially supported, and good enough for a CLI that has no native addons. [HIGH: Node SEA + yao-pkg/pkg docs] |
| Node SEA (`--build-sea`) | `nexe` | nexe's last published release is v3.3.3 (2017) and the active `master` branch is a rewrite in TypeScript. Project is a much riskier bet for a release blocker. [HIGH: nexe repo] |
| Node SEA (`--build-sea`) | `bun build --compile` | Bun would force a runtime swap from Node to Bun. Our dependency on `dbus-next` and `node-elgato-stream-deck` is Node-specific; switching the runtime is a v2 decision, not a v1.4 decision. [HIGH: bun docs, `dbus-next` in deps] |
| Node SEA | `electron-builder` | Electron is a desktop app framework; we ship a CLI daemon, not a packaged app. Overkill. |
| Node SEA | `vite ssr build` for the bundle | Vite SSR is intended for app servers, not for producing a single-file CLI. tsdown already does the ESM bundling and is the project's existing tool. |
| First-run Playwright install | bundle Chromium with the SEA | Bundling Chromium into the SEA would bloat the binary by ~280 MB and pull Playwright's CDP into a license-sensitive asset. `install --with-deps` keeps the binary small and keeps the install licensing aligned with Playwright's permissive license. [HIGH: Playwright browsers docs, `du -hs` sample in docs] |
| `pactl` (Linux audio) | `amixer` | `amixer` is ALSA-direct, which fails on PulseAudio/PipeWire systems that don't expose ALSA controls (most modern desktops). `pactl` is the right modern choice — it talks to both PulseAudio and PipeWire's PulseAudio shim. [HIGH: pactl(1), PulseAudio Wikipedia] |
| `osascript` (macOS audio) | a Node native addon wrapping `AudioToolbox` | Adds native compilation to the build matrix for marginal value. `osascript` is already on every macOS install and supports the exact set-volume commands we need. [HIGH: SS64 osascript] |
| Hard-reserve `keyCount - 1` for the system back button | make back an addon button | The current reserved back-key computation is a number nobody enforces (`runtime.ts:277, 1219`). Promoting it to a true core-owned position is the only way to guarantee a back affordance on every subdeck. [HIGH: `runtime.ts:1219`, `controller.ts`] |

---

## What NOT to Use

| Avoid | Why | Use instead |
|-------|-----|-------------|
| `@yao-pkg/pkg` for the *first* distribution | Heavy, opinionated, has its own prebuilt Node snapshot that lags the official Node release by weeks. It works but is more tool than we need. | `node --build-sea` and treat any pkg migration as a v2 conversation. |
| `nexe` for the first distribution | Last release 2017; the v4 rewrite is in `master` but unversioned. | `node --build-sea`; if we hit a wall, evaluate `@yao-pkg/pkg`. |
| `bun build --compile` | Forcing a runtime swap in a milestone that ships a CLI would muddy "what runs this" for every addon. | Stay on Node 20+, even if Bun's `--compile` ergonomics are nicer. |
| Bundling Chromium into the SEA | Adds ~280 MB to the binary, complicates the license story, and is unnecessary when `playwright install --with-deps` already handles the common cases. | First-run guard: detect Chromium, install if missing. |
| `amixer` as the primary Linux volume control | ALSA-direct; on PulseAudio/PipeWire systems it either fails or hits a different control. | `pactl` against `@DEFAULT_SINK@`. |
| `nircmd` as a hard dependency for Windows volume | Single third-party binary in the SEA complicates licensing, and we still need a code-signing story for it. | Keep the Windows media adapter "unavailable" for v1.4; document the workaround in the README. |
| Snapshots (`useSnapshot: true`) in `sea-config.json` | Platform- and V8-version-bound; cross-compiled builds crash on startup if the snapshot was built on a different platform. | Use `useCodeCache: true` only. |
| Code-signing/notarization from a Linux runner | Apple tools and Apple notarization require macOS; trying to do this from Linux pulls a toolchain we don't need. | Per-OS matrix: code-signing only on the macOS runner. |
| Letting addons own the last button position | Breaks the system-reserved affordance and creates back-button drift across decks. | Core owns the last position; addon buttons get a max-position of `keyCount - 2` enforced at config validation. |

---

## Versions

### Existing dependency baseline (must stay compatible)

| Package | Current version | SEA compatibility |
|---------|-----------------|-------------------|
| `tsdown` | `^0.22.0` | Unchanged; produces `dist/cli.js` as a single ESM entrypoint. The SEA step then consumes that file as its `main`. [HIGH: `tsdown.config.ts`] |
| `@elgato-stream-deck/node` | `^7.6.0` | Native addon, but the binary is distributed via prebuilt platform packages. It is **not** bundled into a SEA — the SEA wrapper calls `dlopen` from a temp path or requires a user-installed `node_modules`. Document this explicitly so users on a v1.4 SEA install know to run `npm i @elgato-stream-deck/node` once, or extend the SEA `assets` map to include the `.node` file and `getRawAsset` it. [MEDIUM: `addon/api.ts:393-407` uses raw paths, repo has no native-bundling test] |
| `playwright` | `^1.55.0` | Pulled in as a runtime dep for the browser-renderer. The new first-run helper runs `npx playwright install --with-deps chromium`, not `npm i playwright`. The dependency itself is unchanged. [HIGH: `browser-renderer.ts:80-83`] |
| `dbus-next` | `^0.10.2` | Used by `@elgato-stream-deck/node` indirectly; no version action needed. |

### New SEA config (no new packages required)

```jsonc
// packages/cli/sea-config.json (proposed)
{
  "main": "./dist/cli.js",
  "mainFormat": "module",
  "output": "./dist/sireno-deck",
  "disableExperimentalSEAWarning": true,
  "useCodeCache": true,
  "execArgv": ["--no-warnings"]
}
```

For Windows, `output` would be `./dist/sireno-deck.exe`. macOS users would still call the resulting binary `./sireno-deck`. [HIGH: Node SEA config fields]

### New first-run helper (no new packages required)

The existing `ensureBrowserRenderer` flow at `start.ts:319-349` is the natural place. Extend it to call `playwright.chromium.executablePath()` first; if that throws, run `execa('npx', ['playwright', 'install', '--with-deps', 'chromium'])` once and cache the result under `~/.cache/sireno-deck/chromium-installed.txt`. [HIGH: Playwright browsers docs, `execa` already in deps]

---

## Cross-platform build matrix (proposal, not yet built)

| Runner | Target | Produces | Notes |
|--------|--------|----------|-------|
| `ubuntu-latest` | linux-x64 SEA | `sireno-deck-linux-x64` | Trivial — `node --build-sea` on the same host as the same Node major. [HIGH: Node SEA] |
| `macos-13` | darwin-arm64 SEA | `sireno-deck-macos-arm64` | macOS arm64 is the test host. ad-hoc codesign after build. [HIGH: Node SEA, Apple notarization flow] |
| `macos-13` | darwin-x64 SEA | `sireno-deck-macos-x64` | Node SEA macOS-x64 support is *not* in CI per the official Node docs ("arm64 only; x64 is not currently supported and is skipped in the tests") — flag this as a v1.4 limitation and ship arm64 first. [HIGH: Node SEA platform support] |
| `windows-latest` | win32-x64 SEA | `sireno-deck-windows-x64.exe` | Windows SEA needs `.exe` suffix in `output`. [HIGH: Node SEA, `signtool` available on windows-latest] |

**Cross-compile is not recommended** — Node SEA explicitly warns: "When generating cross-platform SEAs (e.g., generating a SEA for `linux-x64` on `darwin-arm64`), `useCodeCache` and `useSnapshot` must be set to false." Since we want `useCodeCache: true`, we must build each target on a host of that target's platform. [HIGH: Node SEA cross-platform docs]

---

*Stack research for: v1.4 standalone distribution + bundled addons + system-reserved back button*
*Researched: 2026-06-04*
*Sources: Node.js SEA docs, yao-pkg/pkg README, nexe README, Bun compile docs, Playwright browsers docs, pactl(1) Debian manpage, PulseAudio Wikipedia, osascript SS64 reference, GitHub Actions matrix strategy docs, codebase scan of `packages/cli/src/{cli,deck,addon,render,builtin-addons}/`*
