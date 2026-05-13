---
status: complete
phase: 05-addon-system
source:
  - .planning/phases/05-addon-system/05-01-SUMMARY.md
  - .planning/phases/05-addon-system/05-02-SUMMARY.md
  - .planning/phases/05-addon-system/05-03-SUMMARY.md
started: 2026-05-13T16:43:22+02:00
updated: 2026-05-13T16:53:30+02:00
---

## Current Test
number: 0
name: complete
expected: |
  UAT session complete.
awaiting: none

## Tests

### 1. Local addon startup path
expected: Start sireno with a config that declares a valid local-folder addon. The process should load successfully, and a button type provided by that local addon should be accepted in config instead of failing as an unknown type.
result: issue
reported: "the folder doesn't exist, but startup only warns: local-clock-addon is missing package.json and @sireno-deck/community-addon cannot be found"
severity: major

### 2. npm addon startup path
expected: Start sireno with a config that declares a valid npm addon. The process should load successfully, and the addon-provided button type should be available in config.
result: issue
reported: "startup warns that @sireno-deck/community-addon cannot be found, so the shipped npm example does not load"
severity: major

### 3. Broken addon warning isolation
expected: Start sireno with one healthy addon and one addon with a broken manifest or import. Startup should log a warning for the broken addon, but the CLI should still continue loading the healthy addon and the rest of the config.
result: pass

### 4. apiVersion mismatch rejection
expected: Start sireno with an addon declaring an incompatible `apiVersion`. Startup should stop with a clear addon-version error tied to the offending addon.
result: skipped
reason: "user could not test it right now"

### 5. Addon asset reference rendering
expected: Use a config that references an addon asset via `addon://...`. The button should render with the addon-provided icon instead of failing to resolve the asset.
result: issue
reported: "i can not see the icons, just the labels"
severity: major

### 6. Emoji selector category navigation
expected: Boot the bundled emoji selector example. The root emoji deck should show category buttons, including Favorites when configured, and tapping a category should navigate into that generated sub-deck.
result: pass

### 7. Emoji selection and favorites behavior
expected: Inside the emoji selector, favorite emojis should appear in the Favorites deck, selecting an emoji should run the configured command, and the Back button should return to the previous deck.
result: issue
reported: "selection and Back work, but the emojis are not rendered correctly on-device"
severity: major

## Summary

total: 7
passed: 2
issues: 4
pending: 0
skipped: 1

## Gaps

- truth: "Start sireno with a config that declares a valid local-folder addon. The process should load successfully, and a button type provided by that local addon should be accepted in config instead of failing as an unknown type."
  status: failed
  reason: "User reported: the folder doesn't exist, but startup only warns: local-clock-addon is missing package.json and @sireno-deck/community-addon cannot be found"
  severity: major
  test: 1
  root_cause: "The shipped `config.yml` references `addons/local-clock-addon`, but the repo does not contain an `addons/` fixture or any local example addon package. Startup is behaving as implemented by warning and skipping missing addons, but the example config cannot demonstrate a successful local-addon path."
  affected_files: ["config.yml"]
- truth: "Start sireno with a config that declares a valid npm addon. The process should load successfully, and the addon-provided button type should be available in config."
  status: failed
  reason: "User reported: startup warns that @sireno-deck/community-addon cannot be found, so the shipped npm example does not load"
  severity: major
  test: 2
  root_cause: "The shipped `config.yml` references `@sireno-deck/community-addon`, but no such package exists in the workspace or installed dependencies. As with the local addon example, startup correctly warns and skips the missing addon, but the example config cannot demonstrate a successful npm-addon path."
  affected_files: ["config.yml"]
- truth: "Use a config that references an addon asset via `addon://...`. The button should render with the addon-provided icon instead of failing to resolve the asset."
  status: failed
  reason: "User reported: i can not see the icons, just the labels"
  severity: major
  test: 5
  root_cause: "Addon asset references are resolved to absolute filesystem paths during config validation, but `render/text-image.ts` always runs `resolve(process.cwd(), iconPath)` before reading the file. When `iconPath` is already absolute this is harmless, so the remaining failure is in the SVG image composition itself: the icon path is accepted, but the generated card layout and asset embedding are not producing visible on-device icons. The UAT screenshot shows the card chrome rendering while the icon region is blank, which points at the image embedding/render path rather than config resolution."
  affected_files: ["packages/cli/src/render/text-image.ts", "packages/cli/src/core/schemas.ts"]
- truth: "Inside the emoji selector, favorite emojis should appear in the Favorites deck, selecting an emoji should run the configured command, and the Back button should return to the previous deck."
  status: failed
  reason: "User reported: selection and Back work, but the emojis are not rendered correctly on-device"
  severity: major
  test: 7
  root_cause: "`builtin-addons/emoji-selector/src/index.ts` renders raw emoji glyphs as `label` text, but `render/text-image.ts` hardcodes `IBM Plex Sans, Arial, sans-serif` in the generated SVG and does not use an emoji-capable font or image asset for emoji entries. The navigation/action logic works, but the rendering stack cannot reliably draw color emoji glyphs on-device with the current font setup."
  affected_files: ["builtin-addons/emoji-selector/src/index.ts", "packages/cli/src/render/text-image.ts"]
