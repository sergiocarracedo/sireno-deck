# Quick Task 007 Summary

**Task:** fix remaining gaps (brightness OS provider + clipboard provider)
**Completed:** 2026-06-27

## What was done

Created two new OS provider subsystems and wired them into the runtime + addon.

**Brightness provider** (`packages/cli/src/system/brightness/`): cross-platform brightness reading/setting via xrandr (X11), brightnessctl (Wayland), osascript (macOS), PowerShell WMI (Windows). Addon's poller at `packages/cli/src/builtin-addons/brightness/poller.ts` accepts `BrightnessProvider` via deps and returns real `{value, max}`.

**Clipboard provider** (`packages/cli/src/system/clipboard/`): cross-platform `writeText`/`readText` via wl-copy/xclip/xsel (Linux), pbcopy/pbpaste (macOS), Set-Clipboard/Get-Clipboard (Windows). `Methods.setClipboardProvider` on the runtime, wired to `methods.pasteText`.

## Files changed

- `packages/cli/src/system/brightness/{index,linux,darwin,windows}.ts` (new)
- `packages/cli/src/system/brightness/linux.test.ts` (new, 4 tests)
- `packages/cli/src/system/clipboard/{index,linux,darwin,windows}.ts` (new)
- `packages/cli/src/system/provider.ts` — BrightnessProvider, ClipboardProvider interfaces + null providers
- `packages/cli/src/deck/methods.ts` — `setClipboardProvider()` + `pasteText` impl
- `packages/cli/src/deck/methods.test.ts` — clipboard test + pasteText fix
- `packages/cli/src/builtin-addons/brightness/poller.ts` — accepts `BrightnessProvider`
- `packages/cli/src/cli/commands/run.ts` — wires brightness + clipboard providers
- `packages/cli/src/cli/commands/addon-registry.ts` — deps include `brightnessProvider`
- `packages/cli/src/cli/commands/{start,run}.test.ts` — mocks for new providers
- `.planning/v0.1.0-MILESTONE-AUDIT.md` — status: passed, gaps closed

## Commit

`6661f81` — brightness OS provider + wiring
`86990cd` — clipboard OS provider + wiring into methods.pasteText

## Final state

487 tests passing, lint clean, typecheck clean. All v0.1.0 requirements satisfied.
