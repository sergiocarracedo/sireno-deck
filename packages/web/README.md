# packages/web

Marketing site + documentation for Sireno Deck. The homepage hero is a loop
rendered from demo-deck captures and scripted live-frontend frames.

The Astro site is a package within the root pnpm workspace:

- `astro/` — Astro 5 site with `@astrojs/starlight` for docs. Tailwind 4. Hosts the landing page and user/developer docs.

## Install and build

From the repository root:

```bash
pnpm install
pnpm capture:showcase
pnpm --filter sirenodeck-web build
```

`pnpm capture:showcase` captures the scripted Coding Agents frontend, creates
the Folio preview, and renders the WebM showcase videos in `/.videos/`. It
does not build the Astro site.

## Layout

```
packages/web/
├── astro/                   # Landing + docs (Astro)
├── scripts/sync-tokens.mjs  # Pulls design tokens from packages/cli/src/themes/default/sirenodeck.json
├── scripts/render-showcase.mjs # Build the hero and Folio preview from demo assets
├── scenes/                  # Declarative scripted-demo media timelines
└── README.md
```

## Token sync

`scripts/sync-tokens.mjs` reads `packages/cli/src/themes/default/sirenodeck.json` (read-only) and regenerates `astro/src/design/tokens.generated.ts` (writable). The Astro site consumes `tokens.generated.ts` to stay visually aligned with the running deck.

The Astro `predev` and `prebuild` scripts run the sync before starting; CI is expected to do the same.

## Showcase media

Run `pnpm --filter sirenodeck-web render-showcase` from the repository root
(requires `ffmpeg`, `sharp`, and the workspace `scripted-demo` package).
The script reads checked-in `astro/public/captures/demo-*.png` made from demo
deck configs, then generates media under the gitignored `/.videos/` directory.
Astro serves it as `/media/` in development and emits it into the production
build. Coding Agents
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
