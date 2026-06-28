---
quick_task: 007
description: fix remaining gaps (brightness OS provider + clipboard provider)
autonomous: true
must_haves:
  truths:
    - "The brightness addon's poller reads the real screen brightness via the new OS provider instead of returning 0"
    - 'methods.pasteText writes the given text to the OS clipboard via the new clipboard provider'
    - 'Both providers follow the existing OS provider pattern (createLinux/createDarwin/createWindows + index dispatch)'
    - 'Both providers return null on unsupported platforms instead of throwing'
  artifacts:
    - 'packages/cli/src/system/brightness/{index,linux,darwin,windows}.ts + linux.test.ts'
    - 'packages/cli/src/system/clipboard/{index,linux,darwin,windows}.ts + linux.test.ts'
    - 'packages/cli/src/deck/methods.ts has setClipboardProvider + wired pasteText'
    - 'packages/cli/src/deck/methods.test.ts has pasteText test with a fake provider'
    - 'packages/cli/src/builtin-addons/brightness/poller.ts reads from the new provider'
    - 'packages/cli/src/cli/commands/run.ts wires both providers (setKeyMacroProvider, setClipboardProvider) and passes brightness to the addon poller'
    - '.planning/v0.1.0-MILESTONE-AUDIT.md updated: gaps closed, status: passed'
  key_links:
    - 'AddonPoller deps: extend AddonPollerDependencies with brightnessProvider'
    - 'State-publisher cadence unchanged'
---

# Plan: Quick 007 — fix remaining gaps

## Tasks

### Task 1: Brightness OS provider + addon wiring

- File: `packages/cli/src/system/brightness/linux.ts` — runs `xrandr --query | grep -E 'Brightness' | awk '{print $2}' | cut -d'/' -f1` (or uses `brightnessctl get` if `xrandr` unavailable). Returns `{value, max}` (max=100).
- File: `packages/cli/src/system/brightness/darwin.ts` — runs `osascript -e 'tell application "System Events" to get brightness of (every item of displays)'`. Parses output.
- File: `packages/cli/src/system/brightness/windows.ts` — runs `powershell -NoProfile -Command "(Get-WmiObject -Namespace root/WMI -ClassName WmiMonitorBrightness).CurrentBrightness"` (0-100).
- File: `packages/cli/src/system/brightness/index.ts` — `createBrightnessProvider({ executor, platform, logger })` dispatches to platform-specific providers; returns a `BrightnessProvider` with `getCurrent(): Promise<{value, max}>` + `setBrightness(value)`. `ProviderError("UNSUPPORTED_PLATFORM", ...)` otherwise.
- File: `packages/cli/src/system/brightness/linux.test.ts` — mock executor; assert command + parses sample output.
- File: `packages/cli/src/system/provider.ts` — add `BrightnessProvider` interface.
- File: `packages/cli/src/builtin-addons/brightness/poller.ts` — accept `BrightnessProvider` in deps; call `getCurrent()`; return `{value, max}`.
- File: `packages/cli/src/builtin-addons/brightness/index.ts` — re-export `createPoller` (already done).
- File: `packages/cli/src/cli/commands/addon-registry.ts` — `AddonPollerDependencies.brightnessProvider?: BrightnessProvider`.
- File: `packages/cli/src/cli/commands/run.ts` — instantiate `createBrightnessProvider`, pass to `discoverAddonPollers`.
- Tests: `pnpm test packages/cli/src/system/brightness` (new), `pnpm test` (full suite).
- Verify: emulator test (in-browser): brightness channel publishes real value.

### Task 2: Clipboard provider + methods.pasteText wiring

- File: `packages/cli/src/system/clipboard/linux.ts` — runs `wl-copy` if `WAYLAND_DISPLAY` set; else `xclip -selection clipboard`; else `xsel --clipboard --input`. Returns success/failure.
- File: `packages/cli/src/system/clipboard/darwin.ts` — runs `pbcopy`, pipes stdin.
- File: `packages/cli/src/system/clipboard/windows.ts` — runs `clip.exe` (built into Windows).
- File: `packages/cli/src/system/clipboard/index.ts` — `createClipboardProvider({ executor, platform, logger })` returns `{ writeText(text: string): Promise<void> }`. `ProviderError` otherwise.
- File: `packages/cli/src/system/clipboard/linux.test.ts` — mock executor; assert command + payload piping.
- File: `packages/cli/src/system/provider.ts` — add `ClipboardProvider` interface.
- File: `packages/cli/src/deck/methods.ts`:
  - Add `clipboardProvider?: ClipboardProvider` to `MethodsContext`.
  - Add `setClipboardProvider(provider: ClipboardProvider): void` to `Methods`.
  - Implement `pasteText(text)` — `clipboardProvider.writeText(text)`. Throw `NotImplementedError` if missing (matching existing pattern).
- File: `packages/cli/src/deck/methods.test.ts`:
  - Update `pasteText throws NotImplementedError` → "without a provider".
  - Add new test: `pasteText calls the provider's writeText when wired`.
- File: `packages/cli/src/cli/commands/run.ts` — instantiate `createClipboardProvider`; pass to `createDeckRuntime`; `methods.setClipboardProvider(clipboard)`.
- File: `packages/cli/emulator/src/App.tsx` — no change (we don't expose paste from the frontend).
- Tests: `pnpm test packages/cli/src/system/clipboard` (new), `pnpm test` (full suite).
- Verify: emulator integration test (optional, can skip — manual).

### Task 3: Update audit doc

- File: `.planning/v0.1.0-MILESTONE-AUDIT.md`
- Update `gaps` frontmatter: empty list.
- Update status: `passed`.
- Update summary sections.

## Acceptance

- `pnpm test` passes (483+ tests after adding 8-12 new ones).
- `pnpm --filter sireno-deck-2 lint` clean.
- `pnpm --filter sireno-deck-2 typecheck` clean.
- The brightness addon's poller returns real values (verifiable in the emulator at runtime).
- `methods.pasteText` writes to the OS clipboard (verifiable via a unit test with a mock executor).
- Audit doc updated to `status: passed`.
