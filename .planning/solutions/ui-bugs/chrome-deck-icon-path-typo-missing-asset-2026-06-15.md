---
title: Chrome overlay deck icon path typo + missing asset
date: 2026-06-15
category: ui-bugs
module: config / chrome overlay deck
problem_type: logic_error
severity: medium
tags: [chrome-deck, overlay, icon, config, asset-paths, phase-68]
applies_when: A user configures an overlay deck (chrome, spotify, etc.) with an `icon:` path that either has a typo or points at a non-committed asset file
---

# Chrome overlay deck icon path typo + missing asset

## Problem

The v1.6 chrome overlay deck in `config.yml` had three related gaps that shipped together:

1. `icon: /works/opensource/sirenodeck/assets/chrome.svg` — typo: `sirenodeck` is missing one `r` (project root is `sireno-deck`). Path does not resolve.
2. `assets/chrome.svg` was never committed. Even with the path fixed, the file does not exist in the repo.
3. The chrome deck was missing `process_names:` and `autoShow: true` from the config block. Without these, the overlay never auto-summons in front of Chrome — the user has to manually navigate to it.

The deck shape was correct (7 buttons with `key_macro:` at positions 0–6, system back at n-1). The deck loaded, the buttons fired, the chrome overlay opened on real hardware. But the icon showed nothing and the deck only appeared if the user explicitly navigated to it.

## Symptoms

- Chrome overlay renders in the Stream Deck display but its icon area is blank
- On the host (when the deck icon is mirrored to the host UI), the icon shows a broken-image indicator
- `process_names` + `autoShow` missing → overlay only appears after manual nav, defeating the whole "autoShow when Chrome is foreground" use case

## What Didn't Work

- The Phase 68 plan + 68-UAT both passed (10/10) without anyone noticing. The loader test asserted deck shape (positions, button count, `key_macro` strings) but never validated the `icon:` path.
- The original Phase 68 config was added with a placeholder icon path that was never corrected, and the SVG file was never created. Two distinct config gaps shipped together.

## Solution

```yaml
# config.yml — chrome deck (corrected)
chrome:
  id: chrome
  icon: /works/opensource/sireno-deck/assets/chrome.svg
  process_names:
    - chrome
  autoShow: true
  buttons:
    - position: 0
      type: action
      label: 'New tab'
      key_macro: 'ctrl+t'
    # ... 6 more buttons
```

Commit the SVG asset (`assets/chrome.svg`, 1.4 KB) alongside the config fix.

## Why This Works

All four pieces are needed for an autoShow overlay deck to actually behave like one:

- `id` — stable identifier used by the deck controller
- `icon` — visual marker in the host UI when the overlay is not currently rendered
- `process_names` — list of OS process names that trigger auto-show when foreground
- `autoShow: true` — enables the auto-show behavior at all (defaults to off)

A loader test that asserts only deck *shape* (button count, positions, types) will pass even when the icon path is broken and the deck never auto-summons. The shape test is necessary but not sufficient.

## Prevention

- **Config integration test**: for any deck with an `icon:` field, assert the file exists at the configured absolute path during `loader.test.ts`. Catches typos and missing assets in the same pass.
- **Overlay-deck wiring checklist**: when adding an overlay deck, all four fields (id, icon, process_names, autoShow) must be present. Make this a loader-time error, not a silent omission.
- **Asset folder convention**: keep overlay icons under a per-project `assets/` directory that's part of the repo (not the user's home dir or a global location). The loader should validate the icon path is inside the project root, not a system path.
- **Hardware UAT should exercise the auto-show path**: the Phase 68 UAT manually opened the chrome deck. A real UAT would also test "launch Chrome, watch the deck auto-summon, dismiss Chrome, watch it disappear."

## Related

- `.planning/phases/68-chrome-overlay-deck-extensions/68-UAT.md` — UAT passed but missed icon resolution
- `config.yml` — fixed at the chrome deck block
- `assets/chrome.svg` — newly committed
- Phase 68 commit `b2b689d` — `fix(68): chrome deck icon path + asset + stub cleanup`
