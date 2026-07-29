# docs/solutions — index

Institutional learnings captured after non-trivial fixes. Each entry is a
short, focused Markdown document with a reproducible cause, the chosen
fix, and a citation to the originating commits.

## runtime-errors

- [`session-lock-provider-never-fires`](runtime-errors/session-lock-provider-never-fires.md) —
  `Session.lockProvider` returning `null` because the OS provider
  construction awaited on the wrong promise.

## conventions

- [`stale-addon-dist-causes-lucide-icons-overlay-name-blink`](conventions/stale-addon-dist-causes-lucide-icons-overlay-name-blink.md) —
  why `npm run build` for the addon must clear its `dist/` before re-bundling.
- [`vite-plugin-oxc-requires-quoted-hyphen-keys`](conventions/vite-plugin-oxc-requires-quoted-hyphen-keys.md) —
  `oxlint` plugin configs must quote object keys containing hyphens or the
  loader rejects them with a confusing parse error.

## Adding a new entry

1. Run `/ce-compound` after the fix lands.
2. Keep files short (≤200 LoC). Cross-link to `ARCHITECTURE.md` /
   `__beta-review__/` rather than duplicating context.
3. Use frontmatter `## Status` / `## Date` / `## Module` so future search
   can filter by component.
