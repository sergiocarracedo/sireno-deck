#!/usr/bin/env node
// packages/web/scripts/capture-decks.mjs
//
// REAL, deterministic deck captures. For every target we boot a daemon whose
// `main` deck IS that deck (per-deck temp config), screenshot main, verify
// the theme CSS var, then shut down. No click-through navigation — the span
// that kept failing under daemonization.
//
// Outputs (deck-only crops via .grid[data-deck-id]):
//   web-snapshot-*.png        — sparse button-type decks (main per type)
//   web-snapshot-color-*.png  — media deck tinted per buttonColor
//   overlay-{app}.png         — overlay decks (single change-deck → app)
//   01/13/14/15 theme aliases — main deck per theme (CSS-var verified)
//   demo-* alias kept for back-compat
//
// Run: pnpm --filter sirenodeck-web run sync-captures

import { spawn, execSync } from "node:child_process"
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { createRequire } from "node:module"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const outDir = resolve(repoRoot, "packages/web/astro/public/captures")
mkdirSync(outDir, { recursive: true })
const stateDir = `${process.env.HOME}/.local/state/sireno-deck`

const { chromium } = createRequire(
  resolve(repoRoot, "packages/cli/package.json"),
)("playwright")
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const THEMES = [
  {
    id: "default",
    theme: "default",
    alias: "01-default.png",
    expected: "#7dd3fc",
  },
  { id: "light", theme: "light", alias: "13-light.png", expected: "#0284c7" },
  {
    id: "riptide",
    theme: "./packages/themes/riptide",
    alias: "14-riptide.png",
    expected: "#f5ff00",
  },
  {
    id: "neon-grids",
    theme: "./packages/themes/neon-grids",
    alias: "15-neon-grids.png",
    expected: "#00e5ff",
  },
]

const SNAPSHOT_DECKS = [
  "web-snapshot-media",
  "web-snapshot-core",
  "web-snapshot-weather",
  "web-snapshot-date-time",
  "web-snapshot-system-status",
  "web-snapshot-value-display",
  "web-snapshot-emoji",
  "web-snapshot-pomodoro",
  "web-snapshot-coding-agents",
]
const COLOR_VARIANTS = [
  "blue",
  "green",
  "purple",
  "cyan",
  "magenta",
  "amber",
  "lime",
].map((c) => `web-snapshot-color-${c}`)
const OVERLAY_APPS = [
  "vscode",
  "chrome",
  "slack",
  "discord",
  "teams",
  "opencode",
  "claude-code",
  "google-meet",
]

const isBusy = async (port) => {
  try {
    await fetch(`http://127.0.0.1:${port}/`, {
      signal: AbortSignal.timeout(400),
    })
    return true
  } catch {
    return false
  }
}
const waitPortFree = async (port) => {
  for (let i = 0; i < 60; i++) {
    if (!(await isBusy(port))) return true
    await sleep(500)
  }
  return false
}
const waitForHtml = async () => {
  for (let i = 0; i < 300; i++) {
    try {
      const r = await fetch("http://127.0.0.1:5180/", {
        signal: AbortSignal.timeout(600),
      })
      const t = await r.text()
      if (r.status < 500 && t.includes('<div id="root"')) return true
    } catch {}
    await sleep(300)
  }
  return false
}

const stopAll = () => {
  for (const pat of [
    "sirenodeck:dm",
    "sirenodeck:wrp",
    "packages/cli/frontend/vite.config.ts",
    "packages/cli/emulator/vite.config.ts",
  ]) {
    try {
      execSync(`pkill -9 -f "${pat}"`, { timeout: 3000 })
    } catch {}
  }
  for (const f of [
    "sireno-deck.config",
    "sireno-deck.flags.json",
    "sireno-deck.pid",
    "sireno-deck.token",
    "sireno-deck.children.json",
  ]) {
    try {
      execSync(`rm -f ${stateDir}/${f}`, { timeout: 2000 })
    } catch {}
  }
}

// Build a temp config whose `main` deck is either the deck file content
// (web-snapshot/demo) or a single change-deck tile (overlays), with theme.
function buildConfig(theme, deckYml, overlayTarget) {
  const addons = `addons:
  - src: ${repoRoot}/packages/addons/app-shortcuts
    config:
      defaults:
        autoShow: false
  - src: ${repoRoot}/packages/addons/pomodoro
`
  let main = ""
  if (overlayTarget) {
    main = `decks:
  main:
    name: Main
    buttons:
      - position: 5
        type: "core:change-deck"
        config:
          deck: ${overlayTarget}
          icon: icon://arrow-right
          label: Open
`
  } else {
    const deckText = readFileSync(join(repoRoot, "demos", deckYml), "utf8")
    main = `decks:\n  main:\n${deckText
      .split("\n")
      .slice(1)
      .map((l) => (l.length ? "    " + l : l))
      .join("\n")}\n`
  }
  return `theme: ${theme}\n\n${addons}\n\nlogging:\n  level: warn\n\n${main}\n`
}

// Full repo config.yml with only the theme swapped — includes every demo
// deck + addons; captures the rich main deck for the hero/themes.
function buildMainConfig(theme) {
  let t = theme
  if (t.startsWith("./")) t = resolve(repoRoot, t)
  const cfg = readFileSync(resolve(repoRoot, "config.yml"), "utf8").replace(
    /^theme:.*$/m,
    `theme: ${t}`,
  )
  if (!/^theme:/m.test(cfg)) cfg = `theme: ${t}\n` + cfg
  return cfg
}

async function bootDaemon(cfg) {
  writeFileSync(resolve(repoRoot, ".sireno-capture.yml"), cfg)
  stopAll()
  await sleep(1500)
  await waitPortFree(5180)
  await waitPortFree(52937)
  await waitPortFree(52938)
  const tsx = resolve(repoRoot, "packages/cli/node_modules/.bin/tsx")
  const entry = resolve(repoRoot, "packages/cli/src/cli/main.ts")
  const proc = spawn(
    tsx,
    [
      entry,
      "start",
      "--config",
      resolve(repoRoot, ".sireno-capture.yml"),
      "--emulator",
      "--port",
      "53237",
      "--no-autoopen",
      "--log-level",
      "warn",
    ],
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        SIRENO_CWD: repoRoot,
        SIRENO_CAPTURE_UNLOCKED: "1",
        SIRENO_CAPTURE_FAKE_AGENTS: "1",
        TSX_TSCONFIG_PATH: resolve(repoRoot, "packages/cli/tsconfig.json"),
      },
      stdio: ["ignore", "ignore", "inherit"],
      detached: true,
    },
  )
  const up = await waitForHtml()
  return { proc, up }
}

async function capture(browser, outName) {
  const ctx = await browser.newContext({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 2,
  })
  const page = await ctx.newPage()
  await page.goto("http://127.0.0.1:5180/", {
    waitUntil: "domcontentloaded",
    timeout: 25000,
  })
  await page.waitForSelector(".grid[data-deck-id]", { timeout: 20000 })
  await page.waitForTimeout(3000)
  const eff = await page.evaluate(() => {
    const el = document.querySelector(".grid[data-deck-id]")
    const cs = el ? getComputedStyle(el) : null
    return {
      id: el?.getAttribute("data-deck-id"),
      primary: cs?.getPropertyValue("--sireno-color-primary").trim(),
    }
  })
  const out = resolve(outDir, outName)
  await page.locator(".grid[data-deck-id]").screenshot({ path: out })
  await ctx.close()
  return eff
}

async function bootWithRetry(cfg) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const { proc, up } = await bootDaemon(cfg)
    if (up) return { proc, up, attempt }
    if (proc) await shutdown(proc)
    await sleep(800)
  }
  return { proc: null, up: false, attempt: 2 }
}

async function shutdown(proc) {
  try {
    if (proc && proc.pid !== undefined && proc.exitCode === null)
      process.kill(-proc.pid, "SIGKILL")
  } catch {}
  await sleep(1500)
  stopAll()
}

const main = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  })
  const results = []
  try {
    // --- full main deck (default theme) -> main.png + 01-default alias ---
    {
      const { proc, up } = await bootWithRetry(buildMainConfig("default"))
      if (!up) {
        console.log("FAIL boot main")
        await shutdown(proc)
      } else {
        const eff = await capture(browser, "main.png")
        console.log(`ok main deck=${eff?.id}`)
        copyFileSync(
          resolve(outDir, "main.png"),
          resolve(outDir, "01-default.png"),
        )
        await shutdown(proc)
      }
    }
    // --- web-snapshot + color + demo decks (default theme) ---
    for (const deckYml of [
      "web-snapshot-media.yml",
      "web-snapshot-core.yml",
      "web-snapshot-weather.yml",
      "web-snapshot-date-time.yml",
      "web-snapshot-system-status.yml",
      "web-snapshot-value-display.yml",
      "web-snapshot-emoji.yml",
      "web-snapshot-pomodoro.yml",
      "web-snapshot-coding-agents.yml",
      ...COLOR_VARIANTS.map((c) => `${c}.yml`),
    ]) {
      const outName = `${deckYml.replace(/\.yml$/, "")}.png`
      const { proc, up } = await bootWithRetry(
        buildConfig("default", deckYml, null),
      )
      if (!up) {
        console.log(`FAIL boot ${outName}`)
        await shutdown(proc)
        continue
      }
      const eff = await capture(browser, outName)
      console.log(`ok ${outName} deck=${eff?.id}`)
      await shutdown(proc)
    }
    // --- overlay per-app decks ---
    for (const app of OVERLAY_APPS) {
      const outName = `overlay-${app}.png`
      const { proc, up } = await bootWithRetry(
        buildConfig("default", null, `app-shortcuts:${app}`),
      )
      if (!up) {
        console.log(`FAIL boot ${outName}`)
        await shutdown(proc)
        continue
      }
      // click the single change-deck tile to reach the overlay
      const ctx = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        deviceScaleFactor: 2,
      })
      const page = await ctx.newPage()
      await page.goto("http://127.0.0.1:5180/", {
        waitUntil: "domcontentloaded",
        timeout: 25000,
      })
      await page.waitForSelector('[data-deck-id="main"]', { timeout: 20000 })
      await page.waitForTimeout(2000)
      const tile = page.locator('[data-button-type="core:change-deck"]').first()
      if (await tile.count()) await tile.click()
      // Overlay decks are paginated -> materialize as `<base>-p1`. Wait for
      // the page-1 id first, falling back to the base id.
      await page
        .waitForSelector(
          `[data-deck-id="app-shortcuts:${app}-p1"],[data-deck-id="app-shortcuts:${app}"]`,
          { timeout: 10000 },
        )
        .catch(() => {})
      await page.waitForTimeout(3000)
      const overlayId =
        (await page
          .locator(`[data-deck-id="app-shortcuts:${app}-p1"]`)
          .count()) > 0
          ? `app-shortcuts:${app}-p1`
          : `app-shortcuts:${app}`
      const out = resolve(outDir, outName)
      await page
        .locator(`[data-deck-id="${overlayId}"]`)
        .screenshot({ path: out })
      await ctx.close()
      console.log(`ok ${outName}`)
      await shutdown(proc)
    }
    // --- themes ---
    for (const theme of THEMES) {
      const { proc, up } = await bootWithRetry(buildMainConfig(theme.theme))
      if (!up) {
        console.log(`FAIL boot theme ${theme.id}`)
        await shutdown(proc)
        continue
      }
      const eff = await capture(browser, `theme-${theme.id}.png`)
      const ok = eff?.primary?.toLowerCase() === theme.expected.toLowerCase()
      if (ok)
        copyFileSync(
          resolve(outDir, `theme-${theme.id}.png`),
          resolve(outDir, theme.alias),
        )
      console.log(
        `${ok ? "PASS" : "FAIL"} theme ${theme.id}: primary=${eff?.primary} -> ${theme.alias}`,
      )
      await shutdown(proc)
    }
  } finally {
    await browser.close()
    stopAll()
  }
  console.log("done")
}

main().catch((e) => {
  console.error("[fatal]", e)
  process.exit(1)
})
