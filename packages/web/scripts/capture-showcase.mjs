#!/usr/bin/env node
// Capture the live website showcase without using or stopping the user's daemon.
import { spawn } from "node:child_process"
import { createServer } from "node:net"
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "../../..")
const cliRoot = resolve(repoRoot, "packages/cli")
const fallbackConfig = resolve(repoRoot, "demos/website-showcase.yml")
const userConfig = resolve(
  process.env["HOME"] ?? "",
  ".config/sirenodeck/config.yml",
)
const sourceConfig = resolve(
  process.env["SIRENODECK_CAPTURE_CONFIG"] ??
    (existsSync(userConfig) ? userConfig : fallbackConfig),
)
const output = resolve(
  process.argv[2] ?? resolve(repoRoot, "demos/website-showcase.webm"),
)
const configuredDuration = Number.parseInt(
  process.env["SIRENODECK_CAPTURE_DURATION_MS"] ?? "15000",
  10,
)
const durationMs =
  Number.isInteger(configuredDuration) &&
  configuredDuration >= 1000 &&
  configuredDuration <= 120000
    ? configuredDuration
    : 15000

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

const captureRoot = mkdtempSync(
  resolve(process.env["TMPDIR"] ?? "/tmp/opencode", "sirenodeck-showcase-"),
)
const config = resolve(captureRoot, "config.yml")
cpSync(sourceConfig, config)
const sourceDemos = resolve(dirname(sourceConfig), "demos")
if (existsSync(sourceDemos))
  cpSync(sourceDemos, resolve(captureRoot, "demos"), { recursive: true })
const env = {
  ...process.env,
  XDG_CONFIG_HOME: resolve(captureRoot, "config"),
  XDG_DATA_HOME: resolve(captureRoot, "data"),
  XDG_STATE_HOME: resolve(captureRoot, "state"),
  XDG_RUNTIME_DIR: resolve(captureRoot, "runtime"),
  SIRENO_CAPTURE_FAKE_AGENTS: "1",
  SIRENODECK_FRONTEND_PORT: String(frontendPort),
  SIRENODECK_CONFIG_UI_PORT: String(configUiPort),
  SIRENODECK_BRIDGE_PORT: String(bridgePort),
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
  const clickKey = async (position, expectedDeck) => {
    await run("agent-browser", [
      ...browserArgs,
      "find",
      "testid",
      `deck-key-${position}`,
      "click",
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
  const captureStartedAt = Date.now()
  await pause(1800)
  await clickKey(10) // Start the main-deck Pomodoro.
  await pause(2600)
  await clickKey(9, "emoji-selector")
  await pause(1700)
  await clickKey(1, "emoji-selector-smileys-p1")
  await pause(2500)
  await clickKey(14, "emoji-selector")
  await pause(500)
  await clickKey(14, "main")
  await pause(Math.max(0, durationMs - (Date.now() - captureStartedAt)))
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
