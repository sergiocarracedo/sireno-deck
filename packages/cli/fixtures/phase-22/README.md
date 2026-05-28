# Phase 22 Review Fixtures

## `config.emulator-demo.yml`

Use this config with `sireno emulate --config packages/cli/fixtures/phase-22/config.emulator-demo.yml`.

Wave 1 review:
- Confirm the local emulator page boots without attached hardware.
- Confirm the rendered deck shows the shrink-fit review button, the real `action` button, and the `Emoji` deck navigation button.

Wave 2 review:
- On the main deck, inspect key `0`.
- Confirm the long label stays on a single line by shrinking in the browser/emulator path instead of wrapping.
- Navigate to the `Emoji` deck.
- Confirm key `0` hits the readable minimum floor and then ellipsizes instead of wrapping or overflowing.

Wave 3 review:
- Use the virtual device selector to switch from `Stream Deck MK.2` to `Stream Deck XL`.
- Confirm the emulator restarts cleanly and the shrink-fit review buttons recompute instead of freezing at the previous size.
- Switch to a layout that is too small for the configured deck and confirm the page shows `Emulator Layout Error` instead of clipping or auto-switching.
