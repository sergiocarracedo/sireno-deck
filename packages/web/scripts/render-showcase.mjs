#!/usr/bin/env node
// Capture real frontend frames through scripted-demo and compose the website
// hero. Never boot the daemon or read the user's config.
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../../..")
const mediaDir = resolve(repoRoot, ".showcase")
const captures = resolve(mediaDir, "captures")
const captureScene = (scene) =>
  spawnSync(
    "pnpm",
    [
      "--dir",
      repoRoot,
      "--filter",
      "@sirenodeck/scripted-demo",
      "demo",
      "run",
      resolve(here, `../scenes/${scene}.json`),
      "--output-root",
      mediaDir,
    ],
    { stdio: "inherit" },
  )
for (const scene of ["coding-agents", "showcase", "folio"])
  if (captureScene(scene).status !== 0)
    throw new Error(`Could not capture ${scene} frontend`)

const scenes = [
  resolve(captures, "demo-decks-index.png"),
  resolve(captures, "coding-agents-summary.png"),
  resolve(captures, "coding-agents-deck.png"),
  resolve(captures, "demo-weather.png"),
  resolve(captures, "demo-media.png"),
  resolve(captures, "demo-decks-index.png"),
]
const args = ["-hide_banner", "-loglevel", "error", "-y"]
for (const image of scenes)
  args.push("-loop", "1", "-framerate", "24", "-t", "3", "-i", image)

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
  resolve(mediaDir, "video-hero.webm"),
)
const result = spawnSync("ffmpeg", args, { stdio: "inherit" })
if (result.status !== 0)
  throw new Error("Could not render website hero video (ffmpeg required)")
console.log("Rendered showcase media from scripted frontend captures")
