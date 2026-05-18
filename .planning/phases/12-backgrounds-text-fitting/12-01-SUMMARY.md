# 12-01 Summary

## What Shipped

- Added core-owned `background` config fields for decks and buttons without leaking those fields into strict addon config schemas.
- Resolved explicit background precedence as `button -> deck -> theme` before image generation on the live runtime path.
- Threaded the resolved background through the render contract and applied it to the shared/default card tint path only.
- Added a committed manual review fixture and UAT instructions for button override, deck fallback, and theme fallback.

## Verification

- `pnpm --filter sireno-deck-cli exec vitest run src/config/loader.test.ts src/render/reconciler.test.tsx src/deck/runtime.test.ts src/render/text-image.test.ts`
- `grep -n "background" packages/cli/fixtures/phase-12/config.background-precedence.yml .planning/phases/12-backgrounds-text-fitting/12-UAT.md`

## Learnings

- `background` had to stay a core-owned field outside addon schemas; otherwise strict addon validation would reject perfectly valid Phase 12 config.
- The real precedence seam was runtime/start, not the renderer alone. `renderTextImage()` only sees one button at a time, so deck fallback had to be materialized before pixel generation.
- The default-card path already derived multiple colors from `theme.background`, so making configured backgrounds work meant changing the base tint source, not layering a separate overlay on top.
