# Phase 18 UAT — Browser-Backed DOM Deck Rendering

status: pending

## Fixture 1 — Browser-rendered action + change-deck path

1. From `packages/cli`, run the CLI with `fixtures/phase-18/config.browser-rendered-action.yml`.
2. Confirm the main deck renders through the browser-backed path rather than the old SVG-only path.
3. Verify key 0 (`Run Clock`) renders inside the implicit `buttonFrame` chrome.
4. Verify key 1 (`Go Tools`) renders inside the implicit `buttonFrame` chrome.
5. Press key 1 and confirm navigation switches to the `tools` deck without stale content remaining on the device.
6. Verify the `tools` deck also renders through the browser-backed path and that `Back Main` returns to the main deck cleanly.

### Pass criteria

- The fixture uses `config.browser-rendered-action.yml`.
- Both decks are visibly browser-backed DOM surfaces.
- Default framed buttons show implicit shared chrome from `buttonFrame`.
- Navigation updates the active surface correctly after the move to the browser-backed renderer.

### Fail criteria

- Buttons fall back to the old SVG-looking path for this fixture.
- Navigation leaves stale pixels from the previous deck.
- Framed buttons do not visibly show the shared `buttonFrame` treatment.
