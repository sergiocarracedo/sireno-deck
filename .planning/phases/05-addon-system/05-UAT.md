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
fixture: `packages/cli/fixtures/phase-5/config.local-addon.yml`
result: pass

### 3. npm addon startup path
expected: Start Sireno with a config that declares a valid npm addon. The process should load successfully, and the addon-provided button type should be available in config.
fixture: `packages/cli/fixtures/phase-5/config.npm-addon.yml`
result: skipped
reason: "user skipped"

### 4. Broken addon warning isolation
expected: Start Sireno with one healthy addon and one addon with a broken manifest or import. Startup should log a warning for the broken addon, but the CLI should still continue loading the healthy addon and the rest of the config.
fixture: `packages/cli/fixtures/phase-5/config.warning-isolation.yml`
result: issue
reported: "with this config:\n\naddons:\n  - name: local-clock-addon\n    enabled: false\n    source: local\n    path: addons2/local-clock-addon2\n  - name: \"@sireno-deck/community-addon\"\n    enabled: false\n    source: npm\n\nthe path is incorrect 'addons2/local-clock-addon2' but no warning or output in Called the Read tool with the following input: {\"filePath\":\"/works/opensource/sireno-deck/sireno-deck/community-addon\"}Read tool failed to read /works/opensource/sireno-deck/sireno-deck/community-addon with the following error: File not found: /works/opensource/sireno-deck/sireno-deck/community-addon"
severity: major

### 5. apiVersion mismatch rejection
expected: Start Sireno with an addon declaring an incompatible `apiVersion`. Startup should stop with a clear addon-version error tied to the offending addon.
fixture: `packages/cli/fixtures/phase-5/config.api-version-mismatch.yml`
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
  root_cause: "The shipped config now starts cleanly with disabled illustrative addons, but its visible proof still depends on addon SVG assets rendering on-device. The current renderer path in `packages/cli/src/render/text-image.ts` treats every asset as a small nested icon (`x=18 y=14 width=36 height=36`) inside a generated card, while the bundled addon assets in `builtin-addons/core-buttons/assets/clock.svg` and `builtin-addons/emoji-selector/assets/favorites.svg` are authored as full 72x72 card graphics with their own background. That asset-contract mismatch leaves startup silent while the user-visible surface still looks like 'SVG files are not rendered', so the shipped-config failure is downstream of the asset rendering path, not addon startup warnings."
  affected_files: ["packages/cli/src/render/text-image.ts", "builtin-addons/core-buttons/assets/clock.svg", "builtin-addons/emoji-selector/assets/favorites.svg", "config.yml"]
- truth: "Start Sireno with one healthy addon and one addon with a broken manifest or import. Startup should log a warning for the broken addon, but the CLI should still continue loading the healthy addon and the rest of the config."
  status: failed
  reason: "User reported: with this config:\n\naddons:\n  - name: local-clock-addon\n    enabled: false\n    source: local\n    path: addons2/local-clock-addon2\n  - name: \"@sireno-deck/community-addon\"\n    enabled: false\n    source: npm\n\nthe path is incorrect 'addons2/local-clock-addon2' but no warning or output in Called the Read tool with the following input: {\"filePath\":\"/works/opensource/sireno-deck/sireno-deck/community-addon\"}Read tool failed to read /works/opensource/sireno-deck/sireno-deck/community-addon with the following error: File not found: /works/opensource/sireno-deck/sireno-deck/community-addon"
  severity: major
  test: 4
  root_cause: "This repro never exercises the warning-isolation path because both addon entries are explicitly marked `enabled: false`. `packages/cli/src/addon/loader.ts` returns early for disabled addons before any path resolution, manifest read, or import attempt, so an invalid local path under a disabled addon is intentionally ignored and produces no startup warning. The observed lack of output matches the current contract; the test setup did not include an actually enabled broken addon."
  affected_files: ["packages/cli/src/addon/loader.ts", "config.yml"]
- truth: "Use a config that references addon assets via `addon://...`. The relevant buttons should render with visible addon-provided icons instead of label-only cards or blank icon slots."
  status: failed
  reason: "User reported: - position: 1\n        type: builtin-change-deck\n        label: Emoji\n        icon: addon://emoji-selector/favorites.svg\n        target_deck: emoji\n\nno error and no image"
  severity: major
  test: 6
  root_cause: "Addon asset paths are resolving, but `packages/cli/src/render/text-image.ts` composes them as small nested 36x36 icons inside another generated card. The shipped addon assets such as `builtin-addons/emoji-selector/assets/favorites.svg` are not icon glyphs; they are already full 72x72 card-sized SVGs with their own background chrome. That means the renderer and asset contract disagree about scale and composition, so the device gets a valid buffer with effectively unusable icon content instead of an obvious failure."
  affected_files: ["packages/cli/src/render/text-image.ts", "builtin-addons/emoji-selector/assets/favorites.svg", "builtin-addons/core-buttons/assets/clock.svg"]
- truth: "Inside the emoji selector, favorite emojis should appear in the Favorites deck, emoji tiles should render as identifiable visuals, selecting an emoji should run the configured command, and the Back button should return to the previous deck."
  status: failed
  reason: "User reported: emojis are not rendered as images, just a label or unicode code"
  severity: major
  test: 8
  root_cause: "`builtin-addons/emoji-selector/src/index.ts` no longer tries to render emoji as image assets at all. The current implementation explicitly maps each emoji to an ASCII label like `GRIN` or falls back to `U+...`, then passes that text into the new `emoji` renderer variant in `packages/cli/src/render/text-image.ts`. The runtime behavior works, but the delivered implementation changed the product contract from 'emoji visuals' to 'text aliases', which is why the user sees labels or codepoints instead of images."
  affected_files: ["builtin-addons/emoji-selector/src/index.ts", "packages/cli/src/render/text-image.ts"]
