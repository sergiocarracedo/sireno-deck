# Quick Task 014 Plan

**Task:** fix Phase 18 review findings (P2 media sampling interval aggregation, P3 duplicate UAT awaiting field)

## Task 1

<files>
- packages/cli/src/render/browser-renderer.ts
- packages/cli/src/render/browser-renderer.test.ts
</files>

<action>
Update browser media-sampling interval parsing so a deck with multiple sampled buttons uses the lowest declared `data-sireno-media-sample-interval-ms` value instead of the first one encountered. Add a focused regression test that proves multiple intervals on one deck coalesce to the minimum throttle.
</action>

<verify>
Run `pnpm --filter sireno-deck-cli exec vitest run src/render/browser-renderer.test.ts`.
</verify>

<done>
The browser renderer honors the lowest sampling interval on the active deck, and a regression test proves mixed-interval media buttons do not get sampled too slowly because of key order.
</done>

## Task 2

<files>
- .planning/phases/18-react-dom-based-renderer-with-htmlcss/18-UAT.md
</files>

<action>
Clean the completed Phase 18 UAT artifact so `## Current Test` contains only the final `awaiting: none` state and no duplicate stale key remains from the rerun.
</action>

<verify>
Read `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-UAT.md` and confirm `## Current Test` has a single `awaiting:` line with `none`.
</verify>

<done>
The UAT artifact is internally consistent and no longer contains duplicate `awaiting` fields.
</done>
