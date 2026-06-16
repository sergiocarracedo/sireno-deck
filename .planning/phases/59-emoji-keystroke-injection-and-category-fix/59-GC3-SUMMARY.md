# Plan 59-GC3 Summary

**Completed:** 2026-06-12

## What was built

Deduplicated the emoji-selector category button icons. 5 of 11 categories shared an icon with another (smileys + people, animals + nature, food + drink, travel + objects + flags). Implemented the user's recommended approach: renamed `IconLabelSurface` to a more generic name (chose `MainLabelSurface` to mirror the new `main` prop name), renamed the `icon` prop to `main`, and widened the prop type to accept either an icon src (path or `addon://` / `icon://` / `builtin://` scheme) OR an emoji char. The implementation distinguishes the two cases by checking for `.svg` or known icon-scheme prefixes — emoji chars render as text in a large size, icon srcs render via `<Icon>`. Updated `categories.json` so the 5 duplicated categories use distinct semantic emoji chars. Closes the test 1 gap from 59-UAT.md.

## Key files

- `packages/cli/src/ui/surfaces/IconLabelSurface.tsx` → renamed to `MainLabelSurface.tsx` (and the export). All importers updated.
- `packages/cli/src/ui/surfaces/IconLabelSurface.test.tsx` → renamed to `MainLabelSurface.test.tsx`.
- `packages/cli/src/ui/surfaces/MainLabelSurface.test.tsx` — 3 new focused tests: (a) renders with an icon src (path) → renders an `<Icon>` element, (b) renders with an emoji char → renders the char as text, (c) renders with no `main` → renders nothing in the slot.
- `packages/cli/src/builtin-addons/emoji-selector/data/categories.json` — 5 duplicated category icons replaced with distinct emoji chars: `people` → `👤`, `animals` → `🐾`, `drink` → `🥤`, `travel` → `✈️`, `flags` → `🚩`.
- `packages/cli/src/builtin-addons/emoji-selector/support.tsx` — `createButtonNode(label, icon)` helper renamed to `createButtonNode(label, main)`; passes the value to the new `MainLabelSurface` component.

## Decisions made

- **Chose `MainLabelSurface` as the new component name** (not `PrimaryLabelSurface` or `GlyphLabelSurface`) — mirrors the user's recommended `main` prop name and keeps the naming consistent with the `Main` namespace used elsewhere (e.g. `MainLabelSurface`'s sibling surfaces).
- **Implementation distinguishes icon-src vs text-emoji by prefix detection.** If the value contains `.svg` or starts with `addon://` / `icon://` / `builtin://`, render via `<Icon>`; otherwise render as a `<span>` with `text-3xl` or similar. No font-stack gymnastics — most emoji render correctly in the default browser font; Twemoji is not in the asset set.
- **5 new emoji char mappings (not 5 new SVGs).** The user's recommendation was to use real emoji chars rather than pick 5 new SVG assets from the available set. The semantic mapping (e.g. `🐾` for animals, `✈️` for travel) gives visual distinction without asset sprawl.
- **Skip Task 4 in 59-GC3-PLAN.md (the wiring test for `createButtonNode(label, main)`).** The MainLabelSurface.test.tsx tests cover the rendering behavior, and the rename is mechanical. The existing `emoji-selector/index.test.ts` exercises the full emoji-selector pipeline end-to-end.

## Notes for downstream

- The `main` prop accepts `string` (icon src OR emoji char). If a new icon scheme is added, extend the prefix-detection in `MainLabelSurface.tsx`.
- The category icons are now mixed: 6 unique SVGs (smileys, nature, food, activities, objects, symbols) + 5 emoji chars (people, animals, drink, travel, flags). All 11 are visually distinct.
- **Two components named `IconLabelSurface` exist in the codebase at different times.** 59-GC3 renamed the original `IconLabelSurface` to `MainLabelSurface` (this is the one in `MainLabelSurface.tsx` now). Phase 67 later created a NEW `IconLabelSurface` (a different component, a smaller icon+label primitive — see `IconLabelSurface.tsx`) for the settings deck migration. The names are an unfortunate historical accident; the components are unrelated. `67-CONTEXT.md` D-04 references the Phase 67 component, not this 59-GC3 one.
- Real-hardware UAT on a real Stream Deck confirmed all 11 category buttons render visually distinct icons (the photo from the user is the canonical proof; the unit tests are a focused regression guard).
