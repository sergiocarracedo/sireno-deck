# Quick Task 026 Plan

**Task:** Icon component should use lucide icons not svg

## Tasks

<task id="026-01">
<title>Move shared Icon generic and brand rendering onto library-backed icons</title>
<files>
- packages/cli/package.json
- packages/cli/src/ui/Icon.tsx
</files>
<action>
Add the icon library dependency needed for the shared UI surface, then replace the hand-rolled generic and brand SVG registries in `packages/cli/src/ui/Icon.tsx` with a library-backed mapping. Keep the existing `src` asset icon path unchanged, preserve the current `IconProps` union shape and `data-sireno-ui-icon` / `data-sireno-icon-source` markers, and make sure currently used generic names (`warning`, `sparkles`, `play`) plus the exported `github` brand path all still render through the same public component.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/cli/commands/start.test.ts -t "shows a compact button runtime helper and structured diagnostics when a tap handler fails|shows the button runtime helper and structured diagnostics when a polled refresh fails|boots the repo fixture config through the mounted runtime with the shared presentation kit wired through button output"
</verify>
<done>
`Icon.tsx` no longer contains the handwritten SVG registries, the shared `Icon` component renders supported named icons through the library-backed mapping, and the focused runtime/start tests still prove the shipped icon surface is present in rendered HTML.
</done>
</task>

<task id="026-02">
<title>Lock the lucide-backed Icon seam with focused source and render regressions</title>
<files>
- packages/cli/src/ui/Icon.tsx
- packages/cli/src/deck/runtime.test.ts
- packages/cli/src/cli/commands/start.test.ts
</files>
<action>
Add or refresh narrow regression coverage so the shared `Icon` seam is pinned to the new lucide-backed implementation instead of the old handwritten SVG registry. Keep the proof focused on the shipped runtime/render surfaces already exercising `Icon`, and add one source-level assertion if needed to prove the component imports the lucide icons directly.
</action>
<verify>
pnpm --filter sireno-deck-cli exec vitest run src/deck/runtime.test.ts src/cli/commands/start.test.ts -t "shows a compact button runtime helper and structured diagnostics when a tap handler fails|shows the button runtime helper and structured diagnostics when a polled refresh fails|boots the repo fixture config through the mounted runtime with the shared presentation kit wired through button output"
</verify>
<done>
Focused regressions pass while explicitly pinning the shared `Icon` implementation to the lucide-backed seam and preserving the existing runtime HTML markers relied on by shipped tests.
</done>
</task>
