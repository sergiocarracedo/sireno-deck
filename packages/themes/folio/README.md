# Folio

A third-party Sireno Deck theme built around soft ivory tiles, graphite type,
and a restrained blue accent. Inspired by the calm, legible surfaces of mobile
operating systems without copying their interface or assets.

The theme is currently available from this repository; it is **not yet
published to npm**. To try it in a checkout, set `theme` in your selected
`config.yml` to the absolute path to `packages/themes/folio`, then start
Sireno Deck with `--config` pointing to that file. Do not modify your normal
config just to preview the theme.

All colors and button variants are defined in `sirenodeck.json`. No external
fonts, assets, or UI overrides are required.

The website's preview is illustrative; it uses this manifest's colors and
variants. Run `pnpm --filter sirenodeck-web render-showcase` from the repository
root to regenerate the preview and hero video (requires `ffmpeg`).
