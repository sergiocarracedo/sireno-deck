---
status: complete
phase: 05-addon-system
source:
  - .planning/phases/05-addon-system/05-02-SUMMARY.md
  - .planning/phases/05-addon-system/05-03-SUMMARY.md
  - .planning/phases/05-addon-system/05-04-SUMMARY.md
  - .planning/phases/05-addon-system/05-05-SUMMARY.md
started: 2026-05-13T20:49:12+02:00
updated: 2026-05-13T22:04:23+02:00
---

## Current Test
number: 0
name: complete
expected: |
  UAT session complete.
awaiting: none

## Tests

### 1. Shipped config startup path
expected: Start Sireno with the repo's shipped `config.yml`. Startup should not warn about the illustrative local/npm addon entries, because they are disabled examples. The bundled addon config should still load cleanly.
result: issue
reported: "svg files are not rendered and nothing in the console"
severity: major

### 2. Local addon startup path
expected: Start Sireno with a config that declares a valid local-folder addon. The process should load successfully, and a button type provided by that local addon should be accepted in config instead of failing as an unknown type.
result: pass

### 3. npm addon startup path
expected: Start Sireno with a config that declares a valid npm addon. The process should load successfully, and the addon-provided button type should be available in config.
result: skipped
reason: "user skipped"

### 4. Broken addon warning isolation
expected: Start Sireno with one healthy addon and one addon with a broken manifest or import. Startup should log a warning for the broken addon, but the CLI should still continue loading the healthy addon and the rest of the config.
result: issue
reported: "with this config:\n\naddons:\n  - name: local-clock-addon\n    enabled: false\n    source: local\n    path: addons2/local-clock-addon2\n  - name: \"@sireno-deck/community-addon\"\n    enabled: false\n    source: npm\n\nthe path is incorrect 'addons2/local-clock-addon2' but no warning or output in Called the Read tool with the following input: {\"filePath\":\"/works/opensource/sireno-deck/sireno-deck/community-addon\"}Read tool failed to read /works/opensource/sireno-deck/sireno-deck/community-addon with the following error: File not found: /works/opensource/sireno-deck/sireno-deck/community-addon"
severity: major

### 5. apiVersion mismatch rejection
expected: Start Sireno with an addon declaring an incompatible `apiVersion`. Startup should stop with a clear addon-version error tied to the offending addon.
result: skipped
reason: "user skipped"

### 6. Addon asset reference rendering
expected: Use a config that references addon assets via `addon://...`. The relevant buttons should render with visible addon-provided icons instead of label-only cards or blank icon slots.
result: issue
reported: "- position: 1\n        type: builtin-change-deck\n        label: Emoji\n        icon: addon://emoji-selector/favorites.svg\n        target_deck: emoji\n\nno error and no image"
severity: major

### 7. Emoji selector category navigation
expected: Boot the bundled emoji selector example. The root emoji deck should show category buttons, including Favorites when configured, and tapping a category should navigate into that generated sub-deck.
result: pass

### 8. Emoji selection visuals and behavior
expected: Inside the emoji selector, favorite emojis should appear in the Favorites deck, emoji tiles should render as identifiable visuals, selecting an emoji should run the configured command, and the Back button should return to the previous deck.
result: issue
reported: "emojis are not rendered as images, just a label or unicode code"
severity: major

## Summary

total: 8
passed: 2
issues: 4
pending: 0
skipped: 2

## Gaps

- truth: "Start Sireno with the repo's shipped `config.yml`. Startup should not warn about the illustrative local/npm addon entries, because they are disabled examples. The bundled addon config should still load cleanly."
  status: failed
  reason: "User reported: svg files are not rendered and nothing in the console"
  severity: major
  test: 1
- truth: "Start Sireno with one healthy addon and one addon with a broken manifest or import. Startup should log a warning for the broken addon, but the CLI should still continue loading the healthy addon and the rest of the config."
  status: failed
  reason: "User reported: with this config:\n\naddons:\n  - name: local-clock-addon\n    enabled: false\n    source: local\n    path: addons2/local-clock-addon2\n  - name: \"@sireno-deck/community-addon\"\n    enabled: false\n    source: npm\n\nthe path is incorrect 'addons2/local-clock-addon2' but no warning or output in Called the Read tool with the following input: {\"filePath\":\"/works/opensource/sireno-deck/sireno-deck/community-addon\"}Read tool failed to read /works/opensource/sireno-deck/sireno-deck/community-addon with the following error: File not found: /works/opensource/sireno-deck/sireno-deck/community-addon"
  severity: major
  test: 4
- truth: "Use a config that references addon assets via `addon://...`. The relevant buttons should render with visible addon-provided icons instead of label-only cards or blank icon slots."
  status: failed
  reason: "User reported: - position: 1\n        type: builtin-change-deck\n        label: Emoji\n        icon: addon://emoji-selector/favorites.svg\n        target_deck: emoji\n\nno error and no image"
  severity: major
  test: 6
- truth: "Inside the emoji selector, favorite emojis should appear in the Favorites deck, emoji tiles should render as identifiable visuals, selecting an emoji should run the configured command, and the Back button should return to the previous deck."
  status: failed
  reason: "User reported: emojis are not rendered as images, just a label or unicode code"
  severity: major
  test: 8
