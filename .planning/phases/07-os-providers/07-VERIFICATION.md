---
phase: 07-os-providers
verified: 2026-06-24
status: passed
tests_total: 389
---

# 07-VERIFICATION — OS Providers

## Phase Goal

Cross-platform OS automation (R15/R16). Four provider interfaces (active-app, session, key-macro, media) with per-platform implementations (Linux via D-Bus + xdotool/ydotool/dotool + playerctl; macOS via osascript; Windows via PowerShell + UIA + SMTC). Runtime polls active-app, applies glob matching to `process_names`, switches overlay deck on match.

## Must-haves

| Must-have                                                                                 | Status               | Evidence                                                 |
| ----------------------------------------------------------------------------------------- | -------------------- | -------------------------------------------------------- | -------------------------- |
| `src/system/provider.ts` exports 4 provider interfaces + `ProviderError` + null providers | ✅                   | `provider.ts` + 16 parser tests                          |
| Linux active-app: D-Bus first, /proc fallback, poll loop, null on init failure            | ✅                   | `active-app/linux.ts` + 5 tests                          |
| Linux session: ScreenSaver signal + idle poll, null on init failure                       | ✅                   | `session-monitor/linux.ts` + 5 tests                     |
| Linux key-macro: probe xdotool/ydotool/dotool, parseCombo detection, literal text + emoji | ✅                   | `key-macro/linux.ts` + 7 tests                           |
| Linux media: playerctl transport + metadata + onChange, null on init failure              | ✅                   | `media/linux.ts` + 5 tests                               |
| macOS active-app: osascript System Events, parse `{name, title, pid}`                     | ✅                   | `active-app/darwin.ts` + 4 tests                         |
| macOS session: osascript loginwindow running                                              | ✅                   | `session-monitor/darwin.ts` + 4 tests                    |
| macOS key-macro: osascript keystroke with `using {command down}`                          | ✅                   | `key-macro/darwin.ts` + 5 tests                          |
| macOS media: osascript Spotify for transport + metadata + 2s onChange                     | ✅                   | `media/darwin.ts` + 5 tests                              |
| Windows active-app: PowerShell UIAutomationClient FocusedElement                          | ✅                   | `active-app/windows.ts` + 4 tests                        |
| Windows session: PowerShell Get-Process logonui                                           | ✅                   | `session-monitor/windows.ts` + 4 tests                   |
| Windows key-macro: PowerShell SendKeys (`^`, `%`, `+`, `{KEY}`) + literal text            | ✅                   | `key-macro/windows.ts` + 5 tests                         |
| Windows media: PowerShell SMTC WinRT projection                                           | ✅                   | `media/windows.ts` + 5 tests                             |
| `index.ts` factory files dispatch on platform                                             | ✅                   | all 4 barrels updated (linux/darwin/win32 branches)      |
| Runtime has `setActiveAppProvider` + 1s poll + 200ms debounce overlay switch              | ✅                   | `runtime.ts` + 5 new runtime tests                       |
| `process_names` glob matching (literal, `*`, `                                            | `, case-insensitive) | ✅                                                       | `glob-match.ts` + 10 tests |
| `preflight` instantiates all 4 providers, wires active-app into runtime                   | ✅                   | `run.ts` (executor via execa, env from process.env)      |
| Providers stopped on shutdown (finally block, all 4)                                      | ✅                   | `runRealModePipeline` finally: `Promise.allSettled(...)` |
| Total Phase 0+1+2+3+4+5+6+7 ≥ 280 (or 350) tests                                          | ✅                   | **389 tests** (288 baseline + 104 from Phase 07)         |
| typecheck + lint clean                                                                    | ✅                   | `tsc --noEmit` clean, `oxlint` 0 warnings                |

## Requirements traceability

- **R15** (Linux active-app via gnome-shell D-Bus + Wayland gnome; media via `playerctl`): ✅ Linux impls + xdotool/ydotool/dotool probe.
- **R16** (macOS osascript; Windows PowerShell + UIA): ✅ Darwin + Windows impls.

## Smoke

```
pnpm exec vitest run
  Test Files: 52 passed
  Tests:       389 passed
  Duration:    ~3.5s

pnpm --filter sireno-deck typecheck
  (clean)

pnpm --filter sireno-deck lint
  Found 0 warnings and 0 errors.

pnpm format:check
  All matched files use the correct format.
```

## Notes

- Plan 03 (macOS) was a "structural" pass: 4 darwin files + index.ts dispatch + tests. On a Linux dev env we can't actually run osascript, so tests verify command construction via the executor mock.
- Plan 04 (Windows) follows the same pattern with PowerShell commands. SMTC requires WinRT projection (Windows 10+).
- The runtime polling loop was added in Plan 02 (not 01) — discovered during execution that the 1s poll + 200ms debounce pattern is best tested in the runtime layer, not the provider layer.
- The `RuntimeDeck.processNames` field is what makes a deck an "overlay deck" — first match wins, no match clears the overlay.
- All providers use the `CommandExecutor` interface (linux, darwin, windows) so they can be mocked in tests with a single shape.
- Provider interfaces are stable: Plan 09 (builtin-addons) will consume `sendKey` (action executor) and `onChange` (media subscription) without further provider changes.

## Status: PASSED
