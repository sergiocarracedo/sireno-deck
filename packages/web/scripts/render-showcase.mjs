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

const summaryTile = `<g transform="translate(448 240)">
  <rect width="192" height="192" rx="34" fill="#293b49" stroke="#75a8c5" stroke-width="4"/>
  <text x="96" y="39" text-anchor="middle" font-family="system-ui, sans-serif" font-size="21" font-weight="700" fill="#eef2f7">Agents</text>
  ${[
    { count: 2, label: "idle", color: "#b8bfc8" },
    { count: 6, label: "running", color: "#7dd3fc" },
    { count: 3, label: "waiting for human", color: "#ffb4ab" },
  ]
    .map(
      (
        { count, label, color },
        i,
      ) => `<circle cx="25" cy="${68 + i * 37}" r="6" fill="${color}"/>
        <text x="40" y="${74 + i * 37}" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="#eef2f7">${count} ${label}</text>`,
    )
    .join("")}
</g>`

const summarySvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1088" height="672" viewBox="0 0 1088 672">
  <rect width="1088" height="672" rx="24" fill="#080a0c"/>
  ${tile(0, 0, "STUDIO", "Main deck", "WORKSPACE")}
  ${tile(1, 0, "DATE", "Mon 12", "OCTOBER")}
  ${tile(2, 0, "WEATHER", "20°C", "VIGO")}
  ${tile(3, 0, "SYSTEM", "62%", "CPU")}
  ${tile(4, 0, "FOCUS", "Ready", "START")}
  ${tile(0, 1, "MEDIA", "Play", "NOW PLAYING")}
  ${tile(1, 1, "PROJECT", "Build", "SIRENO DECK")}
  ${summaryTile}
  ${tile(3, 1, "SESSIONS", "Open", "AGENT DECK")}
  ${tile(4, 1, "VOLUME", "Muted", "INPUT")}
  ${tile(0, 2, "TOOLS", "Console", "OPEN")}
  ${tile(1, 2, "CLOCK", "12:54", "LOCAL")}
  ${tile(4, 2, "NAVIGATION", "Back", "RETURN")}
</svg>`

const agentTile = (column, row, content, color = "#53738b") => {
  const x = 32 + column * 208
  const y = 32 + row * 208
  return `<g transform="translate(${x} ${y})">
    <rect width="192" height="192" rx="34" fill="#2e3540" stroke="${color}" stroke-width="4"/>
    ${content}
  </g>`
}

const agentName = (column, row, provider, status, title, color) =>
  agentTile(
    column,
    row,
    `<circle cx="28" cy="33" r="7" fill="${color}"/>
    <text x="45" y="39" font-family="system-ui, sans-serif" font-size="15" fill="#b8bfc8">${escape(provider)}</text>
    <text x="22" y="86" font-family="system-ui, sans-serif" font-size="15" font-weight="600" fill="${color}">${escape(status)}</text>
    <text x="22" y="127" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="#eef2f7">${escape(title)}</text>`,
    color,
  )

const agentDetails = (
  column,
  row,
  firstLabel,
  firstValue,
  secondLabel,
  secondValue,
  color,
) =>
  agentTile(
    column,
    row,
    `<text x="22" y="41" font-family="system-ui, sans-serif" font-size="14" fill="#b8bfc8">${escape(firstLabel)}</text>
    <text x="22" y="81" font-family="system-ui, sans-serif" font-size="23" font-weight="600" fill="#eef2f7">${escape(firstValue)}</text>
    <path d="M22 103h148" stroke="#53738b" stroke-width="2"/>
    <text x="22" y="132" font-family="system-ui, sans-serif" font-size="14" fill="#b8bfc8">${escape(secondLabel)}</text>
    <text x="22" y="165" font-family="system-ui, sans-serif" font-size="18" font-weight="600" fill="${color}">${escape(secondValue)}</text>`,
    color,
  )

const deckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="1088" height="672" viewBox="0 0 1088 672">
  <rect width="1088" height="672" rx="24" fill="#080a0c"/>
  ${agentName(0, 0, "OpenCode", "RUNNING", "Refactor UI", "#7dd3fc")}
  ${agentDetails(1, 0, "context", "72%", "project", "sireno-deck", "#7dd3fc")}
  ${agentDetails(2, 0, "cost", "$1.48", "tokens", "24.6k", "#7dd3fc")}
  ${agentName(3, 0, "Claude Code", "NEEDS YOU", "Review theme", "#ffb4ab")}
  ${agentDetails(4, 0, "context", "48%", "project", "theme-folio", "#ffb4ab")}
  ${agentName(0, 1, "OpenCode", "IDLE", "Tests ready", "#b8bfc8")}
  ${agentDetails(1, 1, "cost", "$0.86", "tokens", "12.1k", "#b8bfc8")}
  ${agentName(2, 1, "Claude Code", "RUNNING", "Write docs", "#7dd3fc")}
  ${agentDetails(3, 1, "context", "35%", "project", "website", "#7dd3fc")}
  ${agentDetails(4, 1, "cost", "$2.13", "tokens", "31.8k", "#7dd3fc")}
  ${tile(4, 2, "NAVIGATION", "Back", "RETURN")}
</svg>`

await Promise.all([
  sharp(Buffer.from(summarySvg))
    .png()
    .toFile(resolve(captures, "coding-agents-summary.png")),
  sharp(Buffer.from(deckSvg))
    .png()
    .toFile(resolve(captures, "coding-agents-deck.png")),
])

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
