#!/usr/bin/env node
// Capture supporting screenshots and publish the real, recorded demo-config
// deck video as website media.
import { spawnSync } from "node:child_process"
import { copyFileSync, existsSync, mkdirSync } from "node:fs"
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

const sourceVideo = resolve(repoRoot, "demos/website-showcase.webm")
if (!existsSync(sourceVideo))
  throw new Error(
    `Missing real demo recording at ${sourceVideo}; capture demos/website-showcase.yml first`,
  )
mkdirSync(mediaDir, { recursive: true })
copyFileSync(sourceVideo, resolve(mediaDir, "video-hero.webm"))

const poster = resolve(captures, "hero-video-poster.png")
const result = spawnSync(
  "ffmpeg",
  [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-ss",
    "1",
    "-i",
    sourceVideo,
    "-frames:v",
    "1",
    poster,
  ],
  { stdio: "inherit" },
)
if (result.status !== 0)
  throw new Error("Could not extract hero video poster (ffmpeg required)")
console.log("Published hero media from the live demo-config recording")
