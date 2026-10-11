#!/usr/bin/env node
// Rebuild the website hero from checked-in demo deck captures. Never boot the
// daemon or read the user's config: session statuses below are fictional.
import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { readFileSync } from "node:fs"

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = resolve(here, "../astro/public")
const captures = resolve(publicDir, "captures")
const require = createRequire(resolve(here, "../astro/package.json"))
const sharp = require("sharp")

const escape = (text) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll('"', "&quot;")

const tile = (column, row, title, subtitle, detail, accent = "#7dd3fc") => {
  const x = 32 + column * 208
  const y = 32 + row * 208
  return `<g transform="translate(${x} ${y})">
    <rect width="192" height="192" rx="34" fill="#2e3540" stroke="#53738b" stroke-width="4"/>
    <circle cx="28" cy="30" r="7" fill="${accent}"/>
    <text x="46" y="37" font-family="system-ui, sans-serif" font-size="16" fill="#b8bfc8">${escape(title)}</text>
    <text x="22" y="105" font-family="system-ui, sans-serif" font-size="23" font-weight="600" fill="#eef2f7">${escape(subtitle)}</text>
    <text x="22" y="151" font-family="system-ui, sans-serif" font-size="14" fill="${accent}">${escape(detail)}</text>
  </g>`
}

const agentsSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1088" height="672" viewBox="0 0 1088 672">
  <rect width="1088" height="672" rx="24" fill="#080a0c"/>
  ${tile(0, 0, "OPENCODE", "Refactor UI", "RUNNING")}
  ${tile(1, 0, "OPENCODE", "Tests ready", "IDLE", "#b8bfc8")}
  ${tile(2, 0, "CLAUDE CODE", "Theme review", "NEEDS APPROVAL", "#fbbf24")}
  ${tile(3, 0, "AGENTS", "3 sessions", "2 providers")}
  ${tile(4, 0, "STATUS", "1 active", "LIVE DEMO", "#34d399")}
  ${tile(0, 1, "SESSION", "Refactor UI", "OpenCode")}
  ${tile(1, 1, "SESSION", "Tests ready", "OpenCode", "#b8bfc8")}
  ${tile(2, 1, "SESSION", "Theme review", "Claude Code", "#fbbf24")}
  ${tile(4, 2, "NAVIGATION", "Back", "RETURN")}
  <text x="32" y="642" font-family="system-ui, sans-serif" font-size="14" fill="#9aaab3">Illustrative session data · Coding Agents addon</text>
</svg>`

await sharp(Buffer.from(agentsSvg))
  .png()
  .toFile(resolve(captures, "coding-agents-demo.png"))

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
  "coding-agents-demo.png",
  "coding-agents-demo.png",
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
