---
task: 011
slug: chrome-shortcuts-overlay-colors
status: ready
---

# Quick Task 011 Plan

## Goal

Make the Chrome overlay configurable by stable shortcut IDs and visually distinguish every overlay branch with an inherited button color.

## Task 1: Configurable Chrome shortcuts

<files>
- /works/opensource/sireno-deck-addons/chrome-overlay/index.js
- /works/opensource/sireno-deck-addons/chrome-overlay/index.test.js
- assets/chrome.svg
</files>

<action>
Convert the static Chrome deck to a dynamic deck. Give each shortcut a stable ID, accept `favorites` to order selected IDs first, accept `shortcuts` to filter and order the deck, preserve default order for unspecified buttons, and use the repository Chrome SVG through an addon asset URI.
</action>

<verify>
Run the addon's Node tests and materialize the addon through existing CLI tests.
</verify>

<done>
Favorites render first followed by the remaining shortcuts; `shortcuts` renders only the configured IDs in configured order; unknown and duplicate IDs do not break generation.
</done>

## Task 2: Inherited overlay color

<files>
- packages/cli/src/addon/api.ts
- packages/cli/src/cli/commands/addon-decks.ts
- packages/cli/src/cli/commands/__tests__/addon-decks.test.ts
- packages/cli/src/deck/runtime.ts
- packages/cli/src/deck/deck-config.ts
- packages/cli/src/api/protocol-internal.ts
- packages/cli/src/ui/ButtonFrame.tsx
- packages/cli/frontend/src/components/Deck.tsx
</files>

<action>
Add an optional overlay button color to addon-generated/runtime/protocol deck data, preserve it on every paginated page, and apply it through ButtonFrame to every normal button in that overlay branch. Keep temporary error red and leave non-overlay decks unchanged. Assign a distinct color in each overlay addon's root definition.
</action>

<verify>
Run targeted tests, full lint, typecheck, and tests.
</verify>

<done>
Each overlay branch has a distinct configured color, all of its paginated/nested runtime pages inherit it, and ButtonFrame renders that color without changing error or regular deck styles.
</done>
