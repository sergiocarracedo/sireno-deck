#!/usr/bin/env node
// Capture the isolated, storyboard-driven hero showcase through the emulator.
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../../..")
const cliRoot = resolve(repoRoot, "packages/cli")
const defaultScene = resolve(here, "../scenes/hero-showcase.json")
const scenePath = resolve(
  process.env["SIRENODECK_CAPTURE_SCENE"] ?? defaultScene,
)
const scene = JSON.parse(readFileSync(scenePath, "utf8"))
if (
  scene.version !== 1 ||
  typeof scene.config !== "string" ||
  !Array.isArray(scene.timeline) ||
  !Number.isInteger(scene.durationMs) ||
  scene.durationMs < 1000
)
  throw new Error(`Invalid hero capture scene: ${scenePath}`)
const projectConfig = resolve(dirname(scenePath), scene.config)
const output = resolve(
  process.argv[2] ?? resolve(repoRoot, "demos/website-showcase.webm"),
)
const durationMs = scene.durationMs

const run = (command, args, options = {}) =>
  new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: options.stdio ?? "inherit",
    })
    child.once("error", reject)
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun()
      else reject(new Error(`${command} exited with ${code ?? signal}`))
    })
  })

const runForOutput = (command, args, options = {}) =>
  new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      stdio: ["ignore", "pipe", "inherit"],
    })
    let stdout = ""
    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString()
    })
    child.once("error", reject)
    child.once("close", (code, signal) => {
      if (code === 0) resolveRun(stdout)
      else reject(new Error(`${command} exited with ${code ?? signal}`))
    })
  })

const freePort = async () => {
  const server = createServer()
  await new Promise((resolveListen, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveListen)
  })
  const { port } = server.address()
  await new Promise((resolveClose, reject) =>
    server.close((error) => (error ? reject(error) : resolveClose())),
  )
  return port
}

const ports = new Set()
while (ports.size < 3) ports.add(await freePort())
const [frontendPort, configUiPort, bridgePort] = ports

const tempRoot = process.env["TMPDIR"] ?? "/tmp/opencode"
mkdirSync(tempRoot, { recursive: true })
const captureRoot = mkdtempSync(resolve(tempRoot, "sirenodeck-showcase-"))
const config = resolve(captureRoot, "config.yml")
cpSync(projectConfig, config)
const sourceDemos = resolve(dirname(projectConfig), "demos")
if (existsSync(sourceDemos))
  cpSync(sourceDemos, resolve(captureRoot, "demos"), { recursive: true })
const configText = readFileSync(config, "utf8").replaceAll(
  "../../../../works/opensource/sireno/sireno-deck/packages/addons/pomodoro",
  resolve(repoRoot, "packages/addons/pomodoro"),
)
writeFileSync(config, configText)
const agentsStageFile = resolve(captureRoot, "agents-stage.json")
const activeAppFile = resolve(captureRoot, "active-app.json")
const mediaStageFile = resolve(captureRoot, "media-stage.json")
writeFileSync(agentsStageFile, JSON.stringify({ stage: "initial" }))
writeFileSync(activeAppFile, "null")
writeFileSync(mediaStageFile, JSON.stringify({ stage: "playing" }))
const env = {
  ...process.env,
  XDG_CONFIG_HOME: resolve(captureRoot, "config"),
  XDG_DATA_HOME: resolve(captureRoot, "data"),
  XDG_STATE_HOME: resolve(captureRoot, "state"),
  XDG_RUNTIME_DIR: resolve(captureRoot, "runtime"),
  SIRENO_CAPTURE_FAKE_AGENTS: "1",
  SIRENO_CAPTURE_FAKE_AGENTS_FILE: agentsStageFile,
  SIRENO_CAPTURE_FAKE_METRICS: "1",
  SIRENO_CAPTURE_FAKE_MEDIA: "1",
  SIRENO_CAPTURE_FAKE_MEDIA_FILE: mediaStageFile,
  SIRENO_CAPTURE_ACTIVE_APP_FILE: activeAppFile,
  SIRENO_CAPTURE_DISABLE_KEYBOARD: "1",
  SIRENO_CAPTURE_UNLOCKED: "1",
  SIRENODECK_FRONTEND_PORT: String(frontendPort),
  SIRENODECK_CONFIG_UI_PORT: String(configUiPort),
  SIRENODECK_BRIDGE_PORT: String(bridgePort),
  SIRENODECK_DEMO_MODE: "1",
}
for (const name of [
  "XDG_CONFIG_HOME",
  "XDG_DATA_HOME",
  "XDG_STATE_HOME",
  "XDG_RUNTIME_DIR",
])
  mkdirSync(env[name], { recursive: true, mode: 0o700 })

const browserSession = `sirenodeck-showcase-${process.pid}`
const browserArgs = ["--session", browserSession, "--args", "--no-sandbox"]
const rawVideo = resolve(captureRoot, "showcase-screen.webm")
let daemonStarted = false
let browserOpened = false
let recordingStarted = false

try {
  daemonStarted = true
  await run(
    "pnpm",
    [
      "exec",
      "node",
      "bin/dev.js",
      "start",
      "--config",
      config,
      "--emulator",
      "--port",
      String(bridgePort),
      "--no-autoopen",
    ],
    { cwd: cliRoot, env },
  )

  mkdirSync(dirname(output), { recursive: true })
  const url = `http://127.0.0.1:${configUiPort}/?deckOnly=1`
  browserOpened = true
  await run("agent-browser", [...browserArgs, "open", url])
  await run("agent-browser", [...browserArgs, "set", "viewport", "1280", "720"])
  await run("agent-browser", [
    ...browserArgs,
    "wait",
    "--fn",
    "(() => { const frame = document.querySelector('[data-testid=deck-frame]'); const status = document.querySelector('[data-testid=iframe-status]'); return frame && frame.querySelectorAll('[data-testid^=deck-key-]').length >= 15 && (!status || status.getAttribute('data-status') === 'loaded'); })()",
  ])
  await run("agent-browser", [
    ...browserArgs,
    "wait",
    "--fn",
    "document.querySelector('[data-testid=deck-frame]')?.dataset.deck === 'main'",
  ])

  const pause = (ms) =>
    new Promise((resolveDelay) => setTimeout(resolveDelay, ms))
  let captureStartedAt = Date.now()
  const waitUntil = async (atMs) =>
    pause(Math.max(0, captureStartedAt + atMs - Date.now()))
  const clickKey = async (position, expectedDeck) => {
    await run("agent-browser", [
      ...browserArgs,
      "eval",
      `(() => { const key = document.querySelector('[data-testid="deck-key-${position}"]'); if (!key) throw new Error('Missing emulator key ${position}'); const rect = key.getBoundingClientRect(); const x = rect.x + rect.width / 2; const y = rect.y + rect.height / 2; for (const [type, buttons] of [['pointerdown', 1], ['pointerup', 0], ['click', 0]]) key.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, clientX: x, clientY: y, button: 0, buttons })); return 'tapped'; })()`,
    ])
    if (expectedDeck) {
      await run("agent-browser", [
        ...browserArgs,
        "wait",
        "--fn",
        `document.querySelector('[data-testid=deck-frame]')?.dataset.deck === '${expectedDeck}'`,
      ])
    }
  }
  const doubleClickKey = async (position, expectedDeck) => {
    await clickKey(position)
    await pause(100)
    await clickKey(position, expectedDeck)
  }

  const boundsOutput = await runForOutput("agent-browser", [
    ...browserArgs,
    "eval",
    "(() => { const rect = document.querySelector('[data-testid=deck-frame]').getBoundingClientRect(); const scale = window.devicePixelRatio || 1; return [rect.width, rect.height, rect.x, rect.y].map(value => Math.round(value * scale)).join(':'); })()",
  ])
  const boundsLine = boundsOutput.trim().split(/\r?\n/).at(-1)
  if (boundsLine === undefined)
    throw new Error("Could not read the deck bounds for the video crop")
  const bounds = JSON.parse(boundsLine)
  if (typeof bounds !== "string" || !/^\d+:\d+:\d+:\d+$/.test(bounds))
    throw new Error(
      `Invalid deck bounds returned for video crop: ${boundsLine}`,
    )
  console.log(`Cropping deck video to ${bounds}`)

  recordingStarted = true
  await run("agent-browser", [
    ...browserArgs,
    "record",
    "start",
    rawVideo,
    "--fps",
    "30",
  ])
  captureStartedAt = Date.now()
  const tapGesture = async (position, deck) => {
    await clickKey(position, deck)
  }
  for (const event of scene.timeline) {
    await waitUntil(event.atMs)
    if (event.kind === "tap") await tapGesture(event.position, event.deck)
    else if (event.kind === "doubleTap")
      await doubleClickKey(event.position, event.deck)
    else if (event.kind === "agents")
      writeFileSync(agentsStageFile, JSON.stringify({ stage: event.stage }))
    else if (event.kind === "media")
      writeFileSync(mediaStageFile, JSON.stringify({ stage: event.stage }))
    else if (event.kind === "activeApp")
      writeFileSync(activeAppFile, JSON.stringify(event.snapshot))
    else throw new Error(`Unknown scene event kind: ${event.kind}`)
  }
  await waitUntil(durationMs)
  await run("agent-browser", [...browserArgs, "record", "stop"])
  recordingStarted = false

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    rawVideo,
    "-vf",
    `crop=${bounds},format=yuv420p`,
    "-an",
    "-c:v",
    "libvpx-vp9",
    "-crf",
    "30",
    "-b:v",
    "0",
    "-row-mt",
    "1",
    output,
  ])

  if (!existsSync(output) || statSync(output).size === 0)
    throw new Error(`Recording was not written to ${output}`)
  console.log(`Captured live personalized showcase deck: ${output}`)
} finally {
  if (recordingStarted) {
    await run("agent-browser", [...browserArgs, "record", "stop"]).catch(
      () => {},
    )
  }
  if (browserOpened) {
    await run("agent-browser", [...browserArgs, "close"]).catch(() => {})
  }
  if (daemonStarted) {
    await run("pnpm", ["exec", "node", "bin/dev.js", "stop"], {
      cwd: cliRoot,
      env,
    }).catch((error) => {
      console.error(`Could not stop isolated capture daemon: ${error.message}`)
    })
  }
  rmSync(captureRoot, { recursive: true, force: true })
}
