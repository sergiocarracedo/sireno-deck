# Phase 18 Verification

## Must-Have Mapping

- `react-dom` browser authoring contract:
  `packages/cli/src/index.ts` exports DOM helpers and `ButtonSurface`; `sireno-deck-cli/jsx` is gone from `packages/cli/package.json`.
- Legacy renderer removal:
  `packages/cli/src/render/text-image.ts`, `packages/cli/src/render/reconciler.ts`, and the legacy `deck-*` authoring contract were removed in Wave 2 and are not exercised by shipped tests or fixtures.
- Browser renderer seam:
  `packages/cli/src/render/browser-renderer.ts` owns Chromium capture, cropped key buffers, and bounded media sampling.
- Shared framed surface:
  `packages/cli/src/render/button-frame.tsx` and `packages/cli/src/render/dom-host.tsx` provide the browser `buttonFrame` chrome for non-full-surface buttons.
- Runtime-owned browser surfaces:
  `packages/cli/src/deck/runtime.ts` renders locked-session and reload-error surfaces as DOM/browser content only.
- Bounded sampled media review path:
  `packages/cli/src/builtin-addons/core-buttons/buttons/media-sample.ts` and `packages/cli/fixtures/phase-18/config.media-sampling.yml` provide a real-device browser media-sampling review path.

## Evidence

- Browser renderer tests:
  `packages/cli/src/render/browser-renderer.test.ts`
- DOM host tests:
  `packages/cli/src/render/dom-host.test.tsx`
- Builtin browser surface tests:
  `packages/cli/src/builtin-addons/core-buttons/index.test.ts`
- Runtime browser surface tests:
  `packages/cli/src/deck/runtime.test.ts`
- Device review fixtures:
  `packages/cli/fixtures/phase-18/config.browser-rendered-action.yml`
  `packages/cli/fixtures/phase-18/config.live-dom-buttons.yml`
  `packages/cli/fixtures/phase-18/config.media-sampling.yml`

## Honest Conclusion

Phase 18 now ships a browser-only `react-dom` renderer. The old `text-image` path is removed, the legacy render contract is no longer part of shipped authoring, runtime-owned surfaces render through the browser seam, and sampled media is explicitly bounded snapshot capture rather than fake continuous video support.
