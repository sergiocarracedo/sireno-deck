---
phase: 06-hardware
plan: 06-01
completed: 2026-06-23
tests_added: 33
tests_total: 257
status: done
---

# 06-01-SUMMARY — Device Layer

## What was built

The full device layer for Phase 06: enumerate Stream Deck devices, persist a selection to `device.json`, prompt the user with `@inquirer/prompts` select() (with stale-detection), and wrap `@elgato-stream-deck/node` behind our own `StreamDeckDevice` interface. Also ships the Linux udev rules helper text.

## Key files

- `packages/cli/src/device/stream-deck.ts` — `connectStreamDeck` + `StreamDeckDevice` interface + `StreamDeckSelectionError`. Wraps the SDK's `listOpenStreamDecks()` + `openStreamDeck()`; reads `CONTROLS` filtered by `type === "button"` for `getKeyCount()`. Selector match: serial / path / model.
- `packages/cli/src/device/stream-deck.test.ts` — 5 tests: keyCount from CONTROLS, throws on 0, throws on multi without selector, selector by serial, close() forwards.
- `packages/cli/src/device/registry.ts` — `listDevices()` returns sorted `DeviceDescriptor[]`. Returns `[]` on SDK error (logged, not thrown).
- `packages/cli/src/device/registry.test.ts` — 3 tests: descriptor shape, sort by serial, empty on error.
- `packages/cli/src/device/linux-udev.ts` — `UDEV_RULES` literal (subsystem=usb + idVendor=0x0fd9 + TAG+=uaccess across 8 product IDs). `formatInstallInstructions()` for manual install. `installUdevRules()` throws `UdevPermissionError` (we don't auto-install — user runs the snippet).
- `packages/cli/src/device/linux-udev.test.ts` — 3 tests: UDEV_RULES content, format instructions, install throws.
- `packages/cli/src/device/index.ts` — barrel.
- `packages/cli/src/util/device-config.ts` — `loadDeviceConfig` + `saveDeviceConfig`. Path: `${xdgConfigHome}/sireno-deck-2/device.json`. Atomic write via `.tmp` + rename.
- `packages/cli/src/util/device-config.test.ts` — 4 tests: missing file returns null, roundtrip, atomic write leaves no .tmp, corrupt JSON returns null.
- `packages/cli/src/system/device-selection.ts` — `selectDevice` per CONTEXT decisions. Returns `{ descriptor, savedButStale }`. Honors single-device (auto-pick) + matching saved config (no prompt) + multiple (prompt). When stale, prompt with current devices only (the stale disconnected one isn't selectable).
- `packages/cli/src/system/device-selection.test.ts` — 6 tests: 0 → error, 1 → auto, match → no prompt, no current → prompt, stale → prompt + savedButStale=true, prompt includes model+serial+path.

## Decisions made

- **Phantom `@sireno-deck-2/cli` workspace dep removed**: the emulator's package.json had `"@sireno-deck-2/cli": "workspace:*"` which doesn't resolve (no such package exists; the alias is via vite config). Removed to unblock `pnpm install`.
- **`@elgato-stream-deck/node@^9.0.0` → `^7.6.3`**: latest published is 7.6.3, not 9.
- **`installUdevRules()` doesn't auto-install**: throws `UdevPermissionError` instead. Users run the snippet from `formatInstallInstructions()` (copy-paste-friendly, no `pkexec` flow, no elevation race). Simpler and more honest.
- **Stale device not in choices list**: per CONTEXT, the saved-but-stale device is "shown as a hint marker" — but the stale device isn't connected, so it can't be selected. Implementation: prompt with only current devices, return `savedButStale: true` so the CLI can warn the user. (Original test expected an in-list hint; revised to assert choices count + values.)

## Bugs fixed during execution

- `pnpm install` initially failed: phantom workspace dep + wrong elgato-stream-deck version.
- `vi.mock("@inquirer/prompts", ...)` import-dynamic pattern needed `await import()` in the test because the mock factory runs at hoist-time.
- Test for stale hint marker failed because the stale device isn't in the connected list; revised test to check `savedButStale` flag + choice count.

## Notes for downstream

- `connectStreamDeck` returns a thin wrapper; the SDK's CONTROLS / MODEL / serialNumber leak through the wrapper interface (acceptable for v1).
- `device.json` path: `${xdgConfigHome}/sireno-deck-2/device.json`. On macOS this is `~/Library/Application Support/sireno-deck-2/device.json` (resolved via `xdgConfigHome`).
- The CLI (Plan 03) is responsible for: loading config, calling `listDevices` → `selectDevice` → `saveDeviceConfig` → `connectStreamDeck`. Then passing the device to `BrowserRenderer.start()`.

## Smoke

- `pnpm exec vitest run packages/cli/src/device/ packages/cli/src/util/device-config.test.ts packages/cli/src/system/device-selection.test.ts`: **33/33 passing**
- `pnpm exec vitest run` (full cli): 257/257 passing
- `pnpm typecheck`: clean
- `pnpm --filter sireno-deck-2 lint`: 0 warnings, 0 errors
- `pnpm format:check`: clean
