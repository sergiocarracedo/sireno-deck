# Plan 30-03 Summary

**Completed:** 2026-05-30

## What was built
Phase 30's final slice shipped the bundled `media-player` addon on top of one explicit media-controller seam. Linux now has a real `playerctl`-backed polling adapter that reports truthful `play|pause|stop` state plus best-effort metadata and progress, while macOS and Windows stay explicitly unsupported until their deeper adapters are verified. On top of that seam, the bundled `media-player` button renders shared-helper progress, shared marquee text overflow, fixed tap-to-play/pause behavior, and optional hold behavior through the same button-local timer pattern already proven in `system-status`.

## Key files
- `packages/cli/src/system/media-controller.ts`: owns the shared controller contract and normalized host-context adapter selection.
- `packages/cli/src/system/linux-media-controller.ts`: implements the Linux adapter on the documented `playerctl` path with honest metadata/progress parsing.
- `packages/cli/src/system/macos-media-controller.ts`: keeps the macOS entry point explicit while degrading honestly to unsupported.
- `packages/cli/src/system/windows-media-controller.ts`: keeps the Windows entry point explicit while degrading honestly to unsupported.
- `packages/cli/src/builtin-addons/media-player/button.tsx`: renders the real bundled button with shared `Bars`, shared `Text` marquee, fixed tap play/pause, and optional hold behavior.
- `packages/cli/src/builtin-addons/media-player/schemas.ts`: validates the bounded config surface for the built-in button.
- `packages/cli/src/builtin-addons/media-player/index.ts`: registers the bundled addon through the shipped addon path.
- `packages/cli/src/builtin-addons/media-player/index.test.ts`: proves registry/config/runtime integration, truthful status rendering, honest unsupported degradation, and distinct tap-vs-hold behavior.
- `packages/cli/src/addon/builtin.ts`: includes `media-player` in the bundled addon registry.

## Decisions made
- Kept Linux on a documented `playerctl` subprocess seam instead of widening the renderer or hard-coding raw DBus details into the button path.
- Left macOS and Windows explicitly unsupported rather than fabricating parity from unverified adapter code.
- Drew the media status glyph inline inside the button module instead of widening the shared `Icon` contract with one-off playback symbols.
- Reused the same local `onPress` / `onRelease` / `onTap` hold-timer pattern as `system-status` so tap stays fixed to play/pause without changing runtime semantics.

## Deviations
- The plan listed `packages/cli/src/core/schemas.ts`, but no core-schema edit was needed because bundled button configs already flow through the existing core envelope plus addon `configSchema` path. The real registry/config tests prove that bounded path remains truthful without widening core validation.
- As with `30-02`, the broader `src/deck/runtime.test.ts` suite still has unrelated pre-existing failures in the locked-time fallback and get-set toggle seams, so focused media/addon checks were used as the truthful gate for this slice.

## Notes for downstream
- A future macOS or Windows media follow-up should deepen only the adapter implementations; the public bundled addon and controller seam are already in place.
- Full-phase verification should continue to treat the locked-time fallback and get-set toggle failures as separate drift unless this phase explicitly takes them on.
