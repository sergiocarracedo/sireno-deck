# Phase 22 Review Fixtures

## `config.emulator-demo.yml`

Use this config with `sireno emulate --config packages/cli/fixtures/phase-22/config.emulator-demo.yml`.

Wave 1 review:
- Confirm the local emulator page boots without attached hardware.
- Confirm the rendered deck shows the real configured `date-time`, `action`, and `emoji-selector` buttons.

Wave 2 review:
- Press and hold the `Ping` or `Emoji` button in the browser page.
- Confirm the button frame visibly changes while held and returns to idle on release.
- Confirm release still triggers the real runtime behavior rather than a fake click-only preview.
