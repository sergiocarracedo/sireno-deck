# packages/web

Marketing site + documentation for Sireno Deck, plus the Remotion compositions used as the hero/feature videos.

A self-contained pnpm workspace nested inside the Sireno Deck monorepo. Two members:

- `astro/` — Astro 5 site with `@astrojs/starlight` for docs. Tailwind 4. Hosts the landing page and `/docs/*`.
- `videos/` — Remotion compositions that render the deck UI as MP4. Consumes the real `ButtonFrame` + surface components from `packages/cli/src/ui/`.

## Why a nested workspace

Keeps the marketing-site dependency tree (Astro, Starlight, Tailwind, Remotion, `@remotion/*`) out of the daemon's workspace. The root monorepo's `pnpm-workspace.yaml` does not register `astro/` or `videos/` — only the nested declaration does. Install:

```bash
cd packages/web
pnpm install
```

## Layout

```
packages/web/
├── astro/                   # Landing + docs (Astro)
├── videos/                  # Remotion compositions
├── scripts/sync-tokens.mjs  # Pulls design tokens from packages/cli/src/themes/default/sirenodeck.json
├── pnpm-workspace.yaml
└── README.md
```

## Token sync

`scripts/sync-tokens.mjs` reads `packages/cli/src/themes/default/sirenodeck.json` (read-only) and regenerates `astro/src/design/tokens.generated.ts` (writable). The Astro site and the Remotion compositions both consume `tokens.generated.ts` to stay visually aligned with the running deck.

The Astro `predev` and `prebuild` scripts run the sync before starting; CI is expected to do the same.

## Boundaries

The rest of the Sireno Deck monorepo is **read-only** from this workspace. The Astro and Remotion projects do not depend on, link against, or modify anything in `packages/cli` or other root-level files. They reach into the deck UI via file-system relative paths for components and JSON for tokens.
