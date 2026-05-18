# 12-02 Summary

## What Shipped

- Replaced the old public `overflow` seam with explicit `fit` modes: default `shrink` and opt-in `wrap`.
- Updated the live render path to pass `fit` through instead of forwarding the retired `overflow` field.
- Implemented `shrink` and `wrap` on the primary shared/default label slot only, with a renderer-owned minimum shrink scale.
- Decoupled shared wrapper visuals from the removed `overflow` field so wrapper chrome still depends only on `wrapper: "shared"`.
- Added a committed text-fit review fixture and extended the Phase 12 UAT to cover both background precedence and shrink-vs-wrap review.

## Verification

- `pnpm --filter sireno-deck-cli exec vitest run src/render/reconciler.test.tsx src/render/text-image.test.ts`

## Learnings

- The safe first rollout point was the main shared label slot only. Trying to migrate subtitle/detail/value slots in the same step would have mixed layout changes and made failures ambiguous.
- Wrapper chrome and text fitting were coupled accidentally through `overflow`. Removing that hidden dependency was necessary before the new fit contract could mean one thing clearly.
- For this phase, approximate text measurement is good enough because the goal is an explicit and reviewable contract, not pixel-perfect typographic shaping.
