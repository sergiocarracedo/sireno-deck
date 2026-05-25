# Phase 23: JSX/TSX Addon Authoring + Startup Placeholder - Context

**Gathered:** 2026-05-25
**Mode:** standard
**Status:** Ready for planning

## Phase Boundary

Let local addons use JSX/TSX-authored button modules without requiring a separate prebuild step, and show a temporary startup image on the physical Stream Deck while the browser renderer boots and before the first real deck surface is captured. This phase clarifies the local addon source-loading boundary and the hardware boot-placeholder behavior; it does not restore the legacy custom intrinsic JSX contract, broaden npm addon loading into raw source mode, or add a new public `./jsx` package entrypoint.

## Implementation Decisions

### Local Raw-Source Addon Loading
- Local addons may point `sirenoAddon.main` at raw `.ts`, `.tsx`, `.js`, or `.jsx` source files.
- Raw-source support stays manifest-driven only. Sireno should not guess addon entrypoints from folder conventions or project structure.
- Runtime source loading should use one Sireno-owned fixed transpile policy instead of honoring arbitrary addon `tsconfig.json` behavior.
- Raw-source local addons may import sibling modules through normal relative imports within the addon folder.
- TypeScript path aliases, project references, and broader project-aware compilation behavior are out of scope for this phase.

### Public Authoring Surface
- The supported addon authoring API stays on the package root export.
- Phase 23 should not restore `./jsx` as an official public entrypoint.
- Any implementation cleanup around the lingering internal `render/jsx` build entry is subordinate to the root-export authoring contract and should not create a second supported surface by accident.

### Hardware Startup Placeholder
- The physical Stream Deck should show a branded/title startup placeholder while browser startup and the first real deck render are still pending.
- The placeholder is explicitly temporary and should disappear as soon as the first successful real deck render is available.
- If browser startup or the first render fails, startup should switch to the existing honest failure path rather than leaving the placeholder image on the device.

### Agent's Discretion
- Exact placeholder visual design, as long as it is clearly branded/title-style and obviously temporary.
- Exact runtime transpile implementation details, as long as they remain manifest-driven, fixed-policy, and limited to relative-import source loading.
- Exact startup wiring seam for when the placeholder is pushed to hardware and when it is replaced by the first real captured deck.

## Specific Ideas

- The raw-source addon feature should stay narrow enough that users do not expect arbitrary TypeScript project behavior such as path aliases or full tsconfig support.
- The placeholder should read as an intentional Sireno boot state, not as fake final content.
- The phase should make the modern React/HTML TSX authoring path work cleanly instead of resurrecting the older custom JSX contract.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/ROADMAP.md`
- `.planning/PROJECT.md`
- `.planning/STATE.md`
- `.planning/phases/18-react-dom-based-renderer-with-htmlcss/18-CONTEXT.md`
- `.planning/phases/22-browser-deck-emulator/22-CONTEXT.md`
- `packages/cli/src/addon/api.ts`
- `packages/cli/src/addon/loader.ts`
- `packages/cli/src/cli/commands/start.ts`
- `packages/cli/src/deck/runtime.ts`
- `packages/cli/src/index.ts`
- `packages/cli/package.json`
- `packages/cli/tsdown.config.ts`

## Existing Code Insights

### Reusable Assets
- `packages/cli/src/addon/api.ts`: already defines the addon button instance contract as `render(): ReactElement`, plus the shared `ButtonSurface` and DOM helpers used by built-in buttons.
- `packages/cli/src/addon/loader.ts`: already loads addons through the manifest-declared `sirenoAddon.main` entry, making it the natural seam for narrow local raw-source support.
- `packages/cli/src/cli/commands/start.ts`: already owns browser-renderer startup, runtime creation, and the first real deck write path, so it is the natural place to inject and clear a temporary startup placeholder.
- `packages/cli/src/deck/runtime.ts`: already normalizes runtime-rendered button content and feeds deck updates through `onRenderDeck`, so the placeholder should stay outside the steady-state runtime render contract.

### Established Patterns
- Phase 18 already locked the supported authoring model to normal React TSX/HTML elements rendered by `react-dom`, not the removed custom intrinsic JSX contract.
- Addon loading is already manifest-driven and explicit; hidden file-discovery magic would cut against the repo's existing startup and validation style.
- Browser-renderer failures are expected to fail honestly rather than degrading silently into fake success.
- The currently shipped public package surface is the root export only; `package.json` does not export `./jsx`.

### Integration Points
- Extend `packages/cli/src/addon/loader.ts` so local manifest entries can load raw source files through a narrow runtime transpile path.
- Keep the public authoring imports flowing through `packages/cli/src/index.ts` and `packages/cli/package.json` root exports.
- Add a startup-placeholder write path in `packages/cli/src/cli/commands/start.ts` before the first successful browser-backed capture reaches hardware.
- Reuse the existing runtime/browser-renderer handoff so the placeholder clears on the first successful real render instead of creating a separate steady-state rendering lane.

## Deferred Ideas

- Restoring `./jsx` as a public opt-in export.
- Supporting raw-source loading for npm-installed addons.
- Honoring addon-local tsconfig path aliases, project references, or broader TypeScript project semantics.
- Convention-based addon entrypoint discovery without `sirenoAddon.main`.

---
*Phase: 23-jsx-tsx-addon-buttons-startup-image*
*Context gathered: 2026-05-25*
