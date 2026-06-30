---
phase: 06-hardware
status: complete
depends_on: [04-ws-frontend, 05-emulator]
---

# Phase 06 — Hardware

Goal: enumerate devices, prompt for selection if multiple, drive real hardware via Playwright + sharp + `@elgato-stream-deck/node`.

## Outcomes

1. `src/device/stream-deck.ts` — wrapper around `@elgato-stream-deck/node`. `connectStreamDeck(selector)` → device or `StreamDeckSelectionError`.
2. `src/device/registry.ts` — enumerate connected devices.
3. `src/device/linux-udev.ts` — udev rules helper script + installer command.
4. `src/render/browser-renderer.ts` — Playwright + sharp pipeline. Spawn Playwright → render frontend vite → `page.screenshot()` every 500ms (configurable) → sharp crop per key → `fillKeyBuffer`. Skip when buffer hash unchanged.
5. `src/system/device-selection.ts` — interactive prompt with arrow keys via `@inquirer/prompts`. Save selection to `$XDG_CONFIG_HOME/sireno-deck/device.json`.
6. `src/cli/commands/run.ts` integration — wire device selection + browser renderer in real mode.
7. Tests: device enumeration mock, browser renderer with mocked Playwright, buffer hash skip logic.

## Requirements traceability

- **R13** (Playwright render → screenshot → sharp crop → device write)
- **R14** (multi-device interactive prompt + selection persisted to device.json)

## Key files

```
src/device/
  stream-deck.ts
  registry.ts
  linux-udev.ts
  selection.ts
  index.ts

src/render/
  browser-renderer.ts
  browser-renderer.test.ts (mocked playwright + sharp)

src/system/
  device-selection.ts
  device-selection.test.ts (mocked @inquirer/prompts)
```
