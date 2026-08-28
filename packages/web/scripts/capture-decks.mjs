#!/usr/bin/env node
// packages/web/scripts/capture-decks.mjs
//
// REAL deck captures: boots the actual Sireno Deck daemon (emulator mode)
// with the repo's demo config, then screenshots the live React ButtonFrame
// from the emulator's frontend. No CSS approximation — this is what the
// running app really renders.
//
// For each demo deck we navigate to /decks/<id> and screenshot the deck
// frame. For each extra theme we reboot the daemon with `theme: <name>` in
// a temp config and capture its main deck again.
//
// Output: packages/web/astro/public/captures/
//   demo-<deck-id>.png        (default theme, every deck)
//   theme-<theme-name>.png    (main deck in that theme)
//
// Run: node packages/web/scripts/capture-decks.mjs

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn } from "node:child_process"
import { createRequire } from "node:module"

const here = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(here, "..", "..", "..")
const outDir = resolve(repoRoot, "packages/web/astro/public/captures")
mkdirSync(outDir, { recursive: true })

const cliPkg = resolve(repoRoot, "packages/cli/package.json")
const requireFromCli = createRequire(cliPkg)
const { chromium } = requireFromCli("playwright")

// Deck ids present in config.yml's decks (via !include). We resolve the
// visible set from config.yml at runtime, minus the alias names we keep.
const BASE_DECKS = [
  "main",
  "demo-app-shortcuts",
  "demo-core",
  "demo-decks-index",
  "demo-media",
  "demo-weather",
  "demo-system-status",
  "demo-date-time",
  "demo-value-display",
  "demo-pomodoro",
]

// Legacy aliases the site references today (see page metas / sections).
const THEME_ALIASES = {
  light: "13-light.png",
  riptide: "14-riptide.png",
  "neon-grids": "15-neon-grids.png",
}

// Theme id → config.yml `theme:` value.
const THEMES = [
  { id: "default", theme: "default" },
  { id: "light", theme: "light" },
  { id: "riptide", theme: "./packages/themes/riptide" },
  { id: "neon-grids", theme: "./packages/themes/neon-grids" },
]

const EMPORT = 53237
const FS_PORT = 53238

const waitFor = async (url, timeoutMs) => {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(500) })
      if (res.status < 500) return true
    } catch {
      /* not yet */
    }
    await new Promise((r) => setTimeout(r, 300))
  }
  return false
}

const writeTempConfig = (themeValue) => {
  const base = readFileSync(resolve(repoRoot, "config.yml"), "utf8")
  // Replace the theme line (or inject one at the top).
  let cfg = base.replace(/^theme:.*$/m, `theme: ${themeValue}`)
  if (!/^theme:/m.test(cfg)) {
    cfg = `theme: ${themeValue}\n` + cfg
  }
  const p = resolve(repoRoot, ".capture-configs/decks.yml")
  writeFileSync(p, cfg)
  return p
}

const bootDaemon = async (themeValue) => {
  const cfgPath = writeTempConfig(themeValue)
  const tsxBin = resolve(repoRoot, "packages/cli/node_modules/.bin/tsx")
  const cliEntry = resolve(repoRoot, "packages/cli/src/cli/main.ts")
  const args = [
    cliEntry,
    "start",
    "--config",
    cfgPath,
    "--emulator",
    "--port",
    String(EMPORT),
    "--log-level",
    "warn",
  ]
  const proc = spawn(tsxBin, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      SIRENO_CWD: repoRoot,
      TSX_TSCONFIG_PATH: resolve(repoRoot, "packages/cli/tsconfig.json"),
    },
    stdio: ["ignore", "ignore", "ignore"],
    detached: true,
  })

  const up = await waitFor(`http://127.0.0.1:${FS_PORT}/`, 90000)
  return { proc, up }
}

const cleanup = (proc) => {
  try {
    if (proc.pid !== undefined && proc.exitCode === null)
      process.kill(-proc.pid, "SIGINT")
  } catch {
    /* noop */
  }
  setTimeout(() => {
    try {
      if (proc.pid !== undefined && proc.exitCode === null)
        process.kill(-proc.pid, "SIGKILL")
    } catch {
      /* noop */
    }
  }, 5000)
}

const main = async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })

  // --- default theme: every demo deck ---
  let daemon = null
  try {
    const boot = await bootDaemon("default")
    daemon = boot.proc
    if (!boot.up) {
      console.error("[capture] daemon never bound frontend port")
      return
    }

    const ctx = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 2,
    })
    const page = await ctx.newPage()
    page.on("pageerror", (e) => console.error("[page:err]", e.message))

    for (const deckId of BASE_DECKS) {
      try {
        await page.goto(`http://127.0.0.1:${FS_PORT}/decks/${deckId}`, {
          waitUntil: "networkidle",
          timeout: 25000,
        })
        await page.waitForTimeout(1200)
        const el = page.locator(`[data-deck-id="${deckId}"]`)
        if (await el.count()) {
          const out = resolve(outDir, `${deckId}.png`)
          await el.screenshot({ path: out })
          console.log(`[capture] ok  ${deckId}  ->  ${out}`)
        } else {
          // fall back to full-viewport shot of the frame
          await page.screenshot({ path: resolve(outDir, `${deckId}.png`) })
          console.log(`[capture] ok  ${deckId} (frame fallback)`)
        }
      } catch (err) {
        console.warn(`[capture] fail ${deckId}: ${err.message}`)
      }
    }
    await ctx.close()
    cleanup(daemon)
    await new Promise((res) => daemon.once("exit", res))
    daemon = null
  } finally {
    if (daemon) {
      cleanup(daemon)
      await new Promise((res) => daemon.once("exit", res))
    }
  }

  // --- extra themes: main deck only ---
  for (const theme of THEMES.filter((t) => t.id !== "default")) {
    const boot = await bootDaemon(theme.theme)
    daemon = boot.proc
    if (!boot.up) {
      console.error(`[capture] theme ${theme.id} never bound`)
      cleanup(daemon)
      continue
    }
    const ctx = await browser.newContext({
      viewport: { width: 1600, height: 1000 },
      deviceScaleFactor: 2,
    })
    const page = await ctx.newPage()
    try {
      await page.goto(`http://127.0.0.1:${FS_PORT}/decks/main`, {
        waitUntil: "networkidle",
        timeout: 30000,
      })
      await page.waitForTimeout(1800)
      const el = page.locator('[data-deck-id="main"]')
      const out = resolve(outDir, `theme-${theme.id}.png`)
      await el.screenshot({ path: out })
      console.log(`[capture] ok  theme-${theme.id}`)
      const alias = THEME_ALIASES[theme.id]
      if (alias) {
        copyFileSync(out, resolve(outDir, alias))
        console.log(`[capture]        alias -> ${alias}`)
      }
    } catch (err) {
      console.warn(`[capture] fail theme-${theme.id}: ${err.message}`)
    }
    await ctx.close()
    cleanup(daemon)
    await new Promise((res) => daemon.once("exit", res))
    daemon = null
  }

  await browser.close()
  console.log("[capture] done")
}

main().catch((err) => {
  console.error("[fatal]", err)
  process.exit(1)
})
