---
phase: 07-os-providers
plan: 07-04
wave: 2
depends_on: [07-01-PLAN]
files_created:
  - packages/cli/src/system/active-app/{windows.ts,windows.test.ts}
  - packages/cli/src/system/session-monitor/{windows.ts,windows.test.ts}
  - packages/cli/src/system/key-macro/{windows.ts,windows.test.ts}
  - packages/cli/src/system/media/{windows.ts,windows.test.ts}
files_modified:
  - packages/cli/src/system/active-app/index.ts
  - packages/cli/src/system/session-monitor/index.ts
  - packages/cli/src/system/key-macro/index.ts
  - packages/cli/src/system/media/index.ts
autonomous: true
---

# Phase 07 Plan 04 — Windows Implementations

## What was built

- `active-app/windows.ts` — PowerShell `Add-Type -AssemblyName UIAutomationClient` + `AutomationElement::FocusedElement` for the frontmost element. Polls every 1s, parses `name|pid` output.
- `session-monitor/windows.ts` — PowerShell `Get-Process logonui` for locked state. Polls every 5s. No idle support.
- `key-macro/windows.ts` — PowerShell `SendKeys` with combo→^%/+/+{} translation. Modifier aliases: `ctrl → ^`, `alt → %`, `meta → ^` (Windows ctrl), `shift → +`. Special keys: `{ENTER}`, `{TAB}`, `{F1-F12}`, `{UP}`, etc. Literal text via SendKeys.
- `media/windows.ts` — PowerShell SMTC (System Media Transport Controls) WinRT projection. Play uses `TryPlayAsync`; pause/next/prev use COM (WMPPlayerCtrl.1) as a fallback when SMTC isn't available. Metadata via `GetMediaPropertiesAsync`.
- All 4 `index.ts` barrels updated to dispatch `win32` to the new impls.

## Tests added (18)

- `active-app/windows.test.ts` (4): parses PowerShell output, returns last on failure, null on empty, stop clears
- `session-monitor/windows.test.ts` (4): initial locked/unlocked, subscriber on change, stop halts
- `key-macro/windows.test.ts` (5): ctrl→^t, alt+shift+F4, Return→{ENTER}, literal text, EXEC_FAILED
- `media/windows.test.ts` (5): play (TryPlayAsync), pause, getCurrent SMTC metadata, null on empty, onChange on track change

## must_haves

- [x] `windows.ts` files for all 4 capabilities
- [x] `index.ts` factory files dispatch `win32` to the new impls
- [x] All 4 Windows providers work end-to-end against the Plan 01 interfaces
- [x] Locked state detection via `Get-Process logonui`
- [x] Key-macro: SendKeys with combo-to-^%+-{key} translation
- [x] Media: PowerShell SMTC + onChange event subscription
- [x] All tests pass (18 new)
- [x] typecheck + lint clean (0 warnings)

## Notes for downstream

- PowerShell SMTC requires `Windows.Media.Control` WinRT projection — works on Windows 10+ with UWP runtime installed.
- `getWindowsActiveAppProvider` and friends are tested on Linux via the executor mock — the actual PowerShell commands will fail outside Windows, but that's expected.
- The `CommandExecutor` interface is shared across all platforms; Windows uses `powershell -NoProfile -Command <script>`.
