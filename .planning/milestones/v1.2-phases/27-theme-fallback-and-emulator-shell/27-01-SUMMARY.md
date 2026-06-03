# Plan 27-01 Summary

**Completed:** 2026-05-27

## What was built
Removed the last legacy YAML theme seam and made manifest-backed theme packages the only supported theme contract. `packages/cli/src/config/theme.ts` no longer resolves bare YAML files as themes, the shared fallback `buttonFrame` now comes from the built-in default theme package runtime, and the old core-owned fallback module at `packages/cli/src/render/button-frame.tsx` is gone.

This slice also kept the shipped reload graph honest instead of trading one fallback seam for another. Explicit runtime imports like `./ButtonFrame.js` now map back to authored `.ts` / `.tsx` siblings when the loader builds `theme.filePaths`, so built-in theme runtime files such as `themes/default/ButtonFrame.tsx` stay inside the existing watched reload graph even though the public runtime import stays ESM-shaped.

## Key files
- `packages/cli/src/config/theme.ts`: removed `legacy_yaml`, narrowed theme resolution to manifest-backed packages only, moved fallback frame ownership to `../themes/default/index.js`, and taught runtime import collection to resolve authored-source siblings for explicit `.js/.mjs/.cjs` specifiers.
- `packages/cli/src/render/dom-host.tsx`: switched the shared default `buttonFrame` fallback to the built-in default theme package runtime.
- `packages/cli/src/themes/default/index.ts`: remains the built-in fallback frame entrypoint and now uses an explicit `.js` import shape that still maps back to authored source during watch discovery.
- `packages/cli/src/config/theme.test.ts`: replaced the old YAML-theme failure proof with a manifest-backed package validation failure and kept watched-file-path assertions anchored to the real built-in theme runtime graph.
- `packages/cli/src/render/dom-host.test.tsx`: added a focused proof that the shared renderer now falls back to the built-in default theme package `buttonFrame` export.
- `packages/cli/src/render/button-frame.test.tsx`: removed along with the deleted core fallback seam.

## Decisions made
- Deleted the legacy YAML branch outright instead of preserving compatibility code, because Phase 27 explicitly narrowed the supported theme model to manifest-backed packages only.
- Moved fallback-frame ownership to the built-in default theme package instead of creating another shared core frame wrapper, so there is only one truthful fallback contract.
- Fixed watched runtime graph truthfulness in the resolver seam instead of adding a second watcher path for built-in themes.

## Notes for downstream
- The built-in default theme package is now the only fallback frame owner, so changes around default frame behavior must stay synchronized between `packages/cli/src/themes/default/index.ts` and the theme resolver expectations.
- Theme runtime file watching now depends on authored-source sibling resolution for explicit `.js` imports; if theme runtime import rules change later, keep the watched `filePaths` proofs on the real built-in graph.
