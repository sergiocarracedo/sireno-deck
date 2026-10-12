#!/usr/bin/env node
// Rebuild the website hero from checked-in demo captures. Never boot the
// daemon or read the user's config; Coding Agents captures use scripted-demo.
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { readFileSync } from "node:fs"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../../..")
const publicDir = resolve(here, "../astro/public")
const captures = resolve(publicDir, "captures")
const require = createRequire(resolve(here, "../astro/package.json"))
const sharp = require("sharp")

const escape = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;")

const agentCapture = spawnSync(
  "pnpm",
  [
    "--dir",
    repoRoot,
    "--filter",
    "@sirenodeck/scripted-demo",
    "demo",
    "run",
    resolve(here, "../scenes/coding-agents.json"),
    "--output-root",
    publicDir,
  ],
  { stdio: "inherit" },
)
if (agentCapture.status !== 0)
  throw new Error("Could not capture Coding Agents frontend")

const folio = JSON.parse(
  readFileSync(resolve(here, "../../themes/folio/sirenodeck.json"), "utf8"),
)
const palette = folio.colorTokens
const folioTile = (col, row, top, primary, bottom, tone = "default") => {
  const variant = folio.variants[tone]
  const x = 38 + col * 207
  const y = 38 + row * 204
  return `<g transform="translate(${x} ${y})">
    <rect width="187" height="184" rx="31" fill="${variant.background}" stroke="${variant.border}" stroke-width="2"/>
    <text x="22" y="39" font-family="system-ui, sans-serif" font-size="17" fill="${variant.foreground}">${escape(top)}</text>
    <text x="22" y="104" font-family="system-ui, sans-serif" font-size="30" font-weight="600" fill="${variant.foreground}">${escape(primary)}</text>
    <text x="22" y="150" font-family="system-ui, sans-serif" font-size="15" fill="${palette.primary}">${escape(bottom)}</text>
  </g>`
}
const folioSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1088" height="672" viewBox="0 0 1088 672">
  <rect width="1088" height="672" rx="25" fill="${palette.background}"/>
  ${folioTile(0, 0, "STUDIO", "Folio", "MAIN DECK", "highlighted")}
  ${folioTile(1, 0, "TIME", "12:54", "MONDAY")}
  ${folioTile(2, 0, "WEATHER", "20°C", "Vigo", "cyan")}
  ${folioTile(3, 0, "AGENTS", "3 online", "OpenCode · Claude", "blue")}
  ${folioTile(4, 0, "SYSTEM", "62%", "CPU")}
  ${folioTile(0, 1, "MUSIC", "Play", "NOW PLAYING", "purple")}
  ${folioTile(1, 1, "VOLUME", "Down", "MEDIA")}
  ${folioTile(2, 1, "VOLUME", "Up", "MEDIA")}
  ${folioTile(3, 1, "MEETING", "Muted", "INPUT", "warning")}
  ${folioTile(4, 1, "STATUS", "Ready", "CONNECTED", "success")}
  ${folioTile(4, 2, "SETTINGS", "Adjust", "THEME")}
</svg>`
await sharp(Buffer.from(folioSvg))
  .png()
  .toFile(resolve(captures, "folio-preview.png"))

const scenes = [
  "demo-decks-index.png",
  "coding-agents-summary.png",
  "coding-agents-deck.png",
  "demo-weather.png",
  "demo-media.png",
  "demo-decks-index.png",
]
const args = ["-hide_banner", "-loglevel", "error", "-y"]
for (const image of scenes)
  args.push(
    "-loop",
    "1",
    "-framerate",
    "24",
    "-t",
    "3",
    "-i",
    resolve(captures, image),
  )

const normalize = scenes.map(
  (_, i) =>
    `[${i}:v]scale=1120:692:flags=lanczos,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0x0a0d0e,setsar=1,format=yuv420p,settb=AVTB[v${i}]`,
)
const blends = scenes
  .slice(1)
  .map(
    (_, i) =>
      `[${i === 0 ? "v0" : `x${i}`}][v${i + 1}]xfade=transition=fade:duration=0.4:offset=${(i + 1) * 2.6}[x${i + 1}]`,
  )
args.push(
  "-filter_complex",
  [...normalize, ...blends].join(";"),
  "-map",
  `[x${scenes.length - 1}]`,
  "-an",
  "-c:v",
  "libvpx-vp9",
  "-crf",
  "36",
  "-b:v",
  "0",
  "-row-mt",
  "1",
  resolve(publicDir, "video-hero.webm"),
)
const result = spawnSync("ffmpeg", args, { stdio: "inherit" })
if (result.status !== 0)
  throw new Error("Could not render website hero video (ffmpeg required)")
console.log("Rendered demo-only hero video with illustrative coding agent data")
