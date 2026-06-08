# Phase 55 Discussion Log

**Date:** 2026-06-08
**Mode:** standard

## Gray areas presented

1. Active-app deck state model (auto-dismiss vs stickiness)
2. `active-win` poller placement
3. Settings deck under overlay (layered vs dismiss-first vs blocked)
4. Double-tap gesture target (reserved-slot only vs any back)
5. Process match ordering (load order vs longest substring)
6. `active-win` dep policy (optional vs required)
7. OS abstraction pattern (mirror system-status vs all-on-active-win)
8. Reserved slot in overlay (toggle on every page vs only last page)
9. Back gesture while overlay active (single pop vs dismiss-first vs hold-back to overlay)

## Decisions

### 1. Active-app deck state model → Auto-dismiss + 350ms tap (user picked recommended)
> "Auto-dismiss on process change — when the active process changes to a different declared process, the current overlay is dismissed and the new one is shown. When the active process changes to a non-declared process, the overlay is also dismissed and the base deck is restored."

### 2. `active-win` poller placement → New `system/active-app.ts` module (user picked recommended)
> "New file packages/cli/src/system/active-app.ts with `ActiveAppMonitor` class. Polls every 500ms, emits 'change' events with the new process name."

### 3. Settings deck under overlay → User freeform
> "The overlay has no settings button, has the back button to go to the regular decks, remember, the back button in this case, on hold backs to the overlay"

Interpreted as: settings deck layers on top of the overlay (settings has its own back stack); from settings, single back goes to the overlay, and HOLD-back (long-press) bypasses one level to go back to the overlay. (Effective layering: settings is on top of overlay which is on top of base.)

### 4. Double-tap gesture target → Any back action (user chose option 2)
> "Any tap that would goBack (including user-deck n-2 back buttons, system-back on sub-decks) counts. A single tap on a base deck first time goes back; second tap within 350ms dismisses overlay."

### 5. Process match ordering → Addon load order (user picked recommended)
> "First addon loaded wins (config.yml addons list order, with built-ins first). Startup log warning: 'process X is declared by both addon A and addon B; using A'."

### 6. `active-win` dep policy → User freeform
> "no optional, but remember this must be os independent, we must to abstract the different os as we did with the system status"

Interpreted as: `active-win` is a regular dependency, but the code that USES it must be OS-abstracted (no platform-conditional imports in core code). The abstraction pattern is the same as the system-status addon.

### 7. OS abstraction pattern → Mirror system-status (user picked recommended)
> "Mirror the system-status addon's pattern: `system/active-app/` directory with a `linux.ts`, `darwin.ts`, `windows.ts` provider per platform, selected at runtime via a `getActiveAppProvider()` factory. Each provider implements a common `ActiveAppProvider` interface. `active-win` lives behind the Linux provider (which is the only one that needs a native lib); macOS uses `osascript` or native `NSWorkspace`; Windows uses PowerShell `Get-Process` with the foreground window."

### 8. Reserved slot in overlay → Toggle on every overlay page (user picked recommended)
> "The reserved-slot button on an overlay deck is ALWAYS the 'dismiss overlay' toggle (icon + 'Base' label) on every page of the overlay, per the success criteria. Pagination buttons (n-2, etc.) still work for navigating within the overlay."

### 9. Back gesture while overlay active → Single tap = back-in-base, double-tap = dismiss overlay (user picked recommended)
> "Single back tap on a base deck (no overlay) goes back in the base stack normally. With an active overlay, single back tap ALSO goes back in the base stack, but the overlay is still on top. Double-tap within 350ms dismisses the overlay AND skips the base-stack pop."

## Notes

- The user did not select the "visual feedback on first tap" option — confirming the 350ms window is "blind" (no hint flash).
- The user said the overlay has no settings button. Combined with #8, the reserved-slot on overlay is the dismiss toggle, no settings affordance.
- Hold-back from settings to overlay: the user explicitly mentioned this gesture. The settings deck has its own reserved-slot (system-back with chevron+Back). Hold on that → goes to the overlay (skipping the back-in-base) when an overlay is active. When no overlay is active, hold-back = home (back to main deck), as per existing behavior.
