---
phase: 39
gathered: 2026-06-04
status: completed
---

# Phase 39: Themable Media Player Surface — Research

## Don't Hand-Roll

The theme manifest/runtime loading infrastructure is already mature (Phase 25/26):

- `ThemeManifestSchema` uses `.passthrough()`, so a `mediaPlayer: { surface: './path.tsx' }` entry in `manifest.yml` passes through validation without schema changes
- `importThemeRuntime` uses `tsx` cache-busting import with `parentURL` and `tsconfig` — same pattern can import the surface component
- `ImportedThemeRuntime` already supports tolerant export lookup (`buttonFrame ?? ButtonFrame ?? default?.buttonFrame ?? default?.ButtonFrame`) — same pattern works for `mediaPlayerSurface`
- Theme runtime import boundary check (`isWithinThemeRoot` + `collectThemeRuntimeFilePaths`) restricts relative imports to the theme package root or sibling `utils` — the same boundary applies to the surface component

**Conclusion:** Extend the existing theme runtime pipeline. No new infrastructure needed.

## Common Pitfalls

1. **Per-render resolution** — Resolving the Surface on every render is wasteful and creates a new function identity per render, breaking React reconciliation. The Surface reference must be stable for the lifetime of the theme (resolved once at load time).

2. **Missing fallback to built-in** — If a theme declares `mediaPlayer.surface` but the path is broken or the file doesn't export the Surface, falling back to the built-in silently hides authoring bugs. Hard-fail with a clear error message.

3. **Importing with a non-`tsx` extension** — The theme runtime uses a `TRANSPILED_THEME_RUNTIME_EXTENSIONS` allowlist (`.jsx`, `.ts`, `.tsx`). The surface component file must use one of these extensions or the standard `import()` is used (which only handles `.js`/`.mjs`/`.cjs`). Theme authors need a clear error if they point at a `.tsx` path with the wrong loader.

4. **Surface props drift** — The built-in `Surface.tsx` receives `{ title, artist, source, progress, status, time }`. Theme surfaces must accept the same shape. Document the contract in the manifest schema comment (or the canonical_refs) so theme authors know.

5. **Inline render duplication** — The `media-player-button.tsx` `render` function (lines 174-218) duplicates the built-in `Surface.tsx` layout. The duplication is a pre-existing bug — the render should use the resolved Surface, not inline its own copy. Plan should resolve this.

## Existing Patterns in This Codebase

### Theme runtime loading (`theme.ts:292-359`)

The `importThemeRuntime` function:

```ts
const importedModule = TRANSPILED_THEME_RUNTIME_EXTENSIONS.has(extname(entryPath))
  ? await tsImport(importedEntryUrl, {
      parentURL: importedEntryUrl,
      tsconfig: PACKAGE_TSCONFIG_PATH,
    })
  : await import(importedEntryUrl)
```

The cache-busting `?sireno-theme-runtime=${runtimeCacheKey}` query ensures fresh reloads when files change.

### Tolerant export lookup

```ts
const candidateFrame =
  importedModule.buttonFrame ??
  importedModule.ButtonFrame ??
  importedModule.default?.buttonFrame ??
  importedModule.default?.ButtonFrame
```

This is the pattern to follow for `mediaPlayerSurface`.

### Theme manifest passthrough

`ThemeManifestSchema` uses `.passthrough()`, so the manifest can carry new keys without changing the schema. But the `Theme` interface (`schemas.ts:109-124`) is hand-defined — adding `mediaPlayerSurface` requires updating this interface.

### Media-player button surface contract

The built-in `Surface.tsx` props:

```ts
type SurfaceProps = {
  title: string
  artist: string
  source: string
  progress: number
  status: MediaButtonStatus
  time: string
}
```

This is the contract that both built-in and theme surfaces must match.

### Existing render duplication

`media-player-button.tsx:174-218` has a `render` function that inlines the same layout as `Surface.tsx`. The fix is to:

1. Resolve the Surface (built-in or theme override) at theme load time
2. Pass it to `defineMountedButton` factory closure
3. Use the resolved Surface in the `render` function (replacing the inline copy)

## Recommended Approach

### Schema changes

- `ThemeManifestSchema`: no changes (passthrough handles `mediaPlayer: { surface: '<path>' }`)
- `Theme` interface: add `mediaPlayerSurface?: ThemeMediaPlayerSurface`
- Add new type: `ThemeMediaPlayerSurface = (props: MediaPlayerSurfaceProps) => ReactElement`

### Theme loading changes

- In `importThemeRuntime`, when `manifest.mediaPlayer?.surface` is set, load the surface component file as a separate runtime module (same `tsx` import pattern)
- Use tolerant export lookup: `surface ?? Surface ?? default?.surface ?? default?.Surface`
- Hard-fail if the path is declared but the module is broken or doesn't export the surface
- Return the surface as part of `ImportedThemeRuntime` and surface it on the resolved `Theme`

### Media-player button changes

- The button factory function `defineMountedButton` accepts a `Surface` parameter (or closure)
- The `render` function uses the resolved Surface instead of the inline copy
- Built-in Surface is the default; theme Surface replaces it if the theme provides one

### Theme author migration path

For a theme to override the media-player surface, the author:

1. Adds a `mediaPlayer.surface: './components/MediaPlayerSurface.tsx'` entry to `manifest.yml`
2. Implements the file with the documented prop contract
3. Uses the standard theme runtime import boundary (theme-relative or `../utils`)

### Plan structure

- **Single plan, single wave** (vertical slice): load theme Surface → consume it in media-player render
- Single layer is justified because the change is plumbing-only (no UI redesign, no new test fixtures)
- Includes: theme schema addition, theme runtime loading, media-player button integration, test coverage, fixture theme
