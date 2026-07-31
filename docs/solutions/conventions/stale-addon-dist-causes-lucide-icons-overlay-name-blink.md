---
title: "Stale addon dist causes lucide icons; frontend sticky overlay name prevents blink"
date: 2026-07-28
category: docs/solutions/conventions/
module: packages/addons/app-shortcuts/
problem_type: convention
component: development_workflow
severity: medium
applies_when:
  - Editing addon src/decks/*.ts with icon or name changes
  - Broadcasting overlay deck config to frontend
symptoms:
  - Overlay toggle buttons show lucide icons (e.g. `icon://globe`) instead of addon SVG assets
  - `overlayDeckName` flashes empty momentarily during deck navigation while overlay icon stays correct
tags:
  - addon
  - icons
  - overlay
  - dist-staleness
related_components:
  - packages/addons/app-shortcuts/
  - packages/cli/frontend/src/App.tsx
  - packages/cli/src/deck/runtime.ts
  - packages/cli/src/cli/commands/run.ts
---

## Root Cause

**Addon dist stale relative to src.** `packages/addons/app-shortcuts/sirenodeck.json` declares `entry: "dist/index.js"`, so the daemon loads compiled deck definitions from `dist/decks/*.js`. If edits to `src/decks/*.ts` (e.g. changing `icon: "addon://app-shortcuts/assets/chrome.svg"`) are not followed by a rebuild, the daemon uses the stale dist with `icon: "icon://globe"` (lucide fallback).

**Overlay name blink.** During deck navigation, the backend's `scheduleOverlay` (`runtime.ts:730-739`) clears `pendingOverlayDeckId` BEFORE calling `applyOverlay`, and the heartbeat (`run.ts:290-308`) and overlay-available broadcast (`run.ts:256-285`) can pick up an interleaved state where both `availableOverlayDeckId` and `pendingOverlayDeckId` are null. The resulting `deck-config` message has `overlayDeckName: null`, which the frontend wrote to state, causing the label to blink.

## Fix

### 1. Rebuild addon after src changes

```sh
pnpm --filter @sirenodeck/addon-app-shortcuts build
```

Then restart the daemon.

The icon-resolution pipeline after rebuild:

- `registerDeckIcon` (`run.ts:1260`) registers the addon-deck SVG into the asset registry.
- `buildExternalAddonDirs` (`run.ts:1101-1125`) maps the addon dir basename (`app-shortcuts`) to its absolute path.
- `resolveIconSource` (`icon-source-resolver.ts:25-35`) converts `addon://app-shortcuts/assets/chrome.svg` → absolute path.
- `resolveOne` (`deck-config.ts:37-55`) converts to `asset://<id>`.
- Frontend `Icon.tsx:163` renders via `<img>` from asset cache.

### 2. Sticky overlay name in frontend

In `App.tsx:225-254`, changed `setDeck({...})` to `setDeck((previous) => ({...}))` with sticky fallback:

```ts
overlayDeckName:
  (message.overlayDeckName ?? null) ??
  previous.overlayDeckName ??
  null,
```

Same for `overlayDeckIcon`. This keeps the last non-null value when the backend sends a transient null during deck navigation, preventing the label blink.

## Preventive Measures

After editing any addon `src/decks/*.ts`, rebuild before restarting the daemon:

```sh
pnpm --filter @sirenodeck/addon-app-shortcuts build
```

Check dist icon fields to catch staleness:

```sh
grep -c 'icon://globe\|icon://message-square' packages/addons/app-shortcuts/dist/decks/*.js
# → should return zero
```
