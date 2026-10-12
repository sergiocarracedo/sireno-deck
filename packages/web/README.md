# packages/web

Marketing site + documentation for Sireno Deck. The homepage hero is a loop
rendered from demo-deck captures; older Remotion compositions remain in `videos/`.

Two packages within the root pnpm workspace:

- `astro/` — Astro 5 site with `@astrojs/starlight` for docs. Tailwind 4. Hosts the landing page and user/developer docs.
- `videos/` — legacy Remotion compositions.

## Install and build

The root workspace registers both `astro/` and `videos/`. From the repository root:

```bash
pnpm install
pnpm --filter sirenodeck-web build
```

## Layout

```
packages/web/
├── astro/                   # Landing + docs (Astro)
├── videos/                  # Remotion compositions
├── scripts/sync-tokens.mjs  # Pulls design tokens from packages/cli/src/themes/default/sirenodeck.json
├── scripts/render-showcase.mjs # Build the hero and Folio preview from demo assets
├── scenes/                  # Declarative scripted-demo media timelines
└── README.md
```

## Token sync

`scripts/sync-tokens.mjs` reads `packages/cli/src/themes/default/sirenodeck.json` (read-only) and regenerates `astro/src/design/tokens.generated.ts` (writable). The Astro site and the Remotion compositions both consume `tokens.generated.ts` to stay visually aligned with the running deck.

The Astro `predev` and `prebuild` scripts run the sync before starting; CI is expected to do the same.

## Showcase media

Run `pnpm --filter sirenodeck-web render-showcase` from the repository root
(requires `ffmpeg`, `sharp`, and the workspace `scripted-demo` package).
The script reads checked-in `astro/public/captures/demo-*.png` made from demo
deck configs, then generates `astro/public/video-hero.webm`. Coding Agents
snapshots use the real addon and frontend with illustrative values supplied by
the `scripted-demo` WebSocket bridge; no live agent provider is contacted. The
scene is in `packages/web/scenes/coding-agents.json`. The Folio preview is
generated from `packages/themes/folio/sirenodeck.json`.

It neither starts Sireno Deck nor reads the user's config. Do not use
`scripts/capture-decks.mjs` for routine video regeneration: its current cleanup
uses broad process matches and is unsafe on a machine running a user daemon.

## Boundaries

The website reads CLI docs, theme manifests and token JSON, but does not import
daemon runtime code or start the service when rendering the site or its video.
