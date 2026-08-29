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
//   demo-<deck-id>.png       (default theme, every deck)
//   theme-<theme-name>.png   (main deck in that theme)
//   01-default.png           (alias of main.png for theme gallery)
//   13-light.png / 14-riptide.png / 15-neon-grids.png (theme aliases)
//
// Important: the daemon's emulator uses FIXED ports 5180 (frontend vite)
// and 52938 (emulator vite). The WS bridge port is set with --port.
// This script will fail cleanly with a clear error if any of those are
// busy — stop your `sireno start --emulator` (and any vite processes on
// those ports) before running it.
//
// Note on session state: the daemon's session provider reports the host
// desktop's lock state. In a headless shell (no logged-in user) it
// stays "locked" and the SPA first shows the `core:lock` deck. The
// captures in that case are real renders of the lock deck, not the
// main deck. Run the script from your usual dev shell (where the
// session is unlocked) to get the demo decks captured.
//
// Run: pnpm --filter sirenodeck-web run sync-captures

import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
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

const THEME_ALIASES = {
  light: "13-light.png",
  riptide: "14-riptide.png",
  "neon-grids": "15-neon-grids.png",
}

const THEMES = [
  { id: "default", theme: "default" },
  { id: "light", theme: "light" },
  { id: "riptide", theme: "./packages/themes/riptide" },
  { id: "neon-grids", theme: "./packages/themes/neon-grids" },
]

const FS_PORT = 5180 // frontend vite (fixed port in emulator mode)
const BUSY_PORTS = [52937, 5180, 52938]

const probeBusyPorts = async () => {
  const busy = []
  for (const p of BUSY_PORTS) {
    try {
      const res = await fetch(`http://127.0.0.1:${p}/`, {
        signal: AbortSignal.timeout(300),
      })
      busy.push({ port: p, status: res.status })
    } catch {
      /* free */
    }
  }
  return busy
}

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
  let cfg = base.replace(/^theme:.*$/m, `theme: ${themeValue}`)
  if (!/^theme:/m.test(cfg)) cfg = `theme: ${themeValue}\n` + cfg
  const dir = resolve(repoRoot, ".capture-configs")
  mkdirSync(dir, { recursive: true })
  const p = join(dir, "captures.yml")
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
    "53237",
    "--log-level",
    "warn",
  ]
  const proc = spawn(tsxBin, args, {
    cwd: repoRoot,
    env: {
      ...process.env,
      SIRENO_CWD: repoRoot,
      SIRENO_CAPTURE_UNLOCKED: "1",
      TSX_TSCONFIG_PATH: resolve(repoRoot, "packages/cli/tsconfig.json"),
    },
    stdio: ["ignore", "ignore", "inherit"],
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
  const busy = await probeBusyPorts()
  if (busy.length > 0) {
    const list = busy.map((b) => `  - ${b.port} (HTTP ${b.status})`).join("\n")
    console.error(
      `[capture] daemon ports already bound; stop your dev daemon and try again:\n${list}\n` +
        `Expected free: 52937 (WS bridge), 5180 (frontend vite), 52938 (emulator vite).\n` +
        `Hint: pnpm --filter @sirenodeck/cli exec sireno stop`,
    )
    process.exit(2)
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  })

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
          waitUntil: "domcontentloaded",
          timeout: 25000,
        })
        // Wait for the deck grid to render (WS deck-config → React state)
        await page.waitForSelector(`[data-deck-id="${deckId}"]`, {
          timeout: 15000,
        })
        await page.waitForTimeout(800)
        const el = page.locator(`[data-deck-id="${deckId}"]`)
        const out = resolve(outDir, `${deckId}.png`)
        await el.screenshot({ path: out })
        console.log(`[capture] ok  ${deckId}  ->  ${out}`)
      } catch (err) {
        console.warn(`[capture] fail ${deckId}: ${err.message}`)
        // Fallback: screenshot whatever deck is visible
        try {
          const fallback = page.locator(".grid[data-deck-id]").first()
          if (await fallback.count()) {
            const out = resolve(outDir, `${deckId}.png`)
            await fallback.screenshot({ path: out })
            console.log(`[capture] ok  ${deckId} (fallback deck)`)
          }
        } catch {}
      }
    }
    await ctx.close()
    cleanup(daemon)
    await new Promise((res) => daemon.once("exit", res))
    daemon = null

    for (const theme of THEMES.filter((t) => t.id !== "default")) {
      const bootT = await bootDaemon(theme.theme)
      daemon = bootT.proc
      if (!bootT.up) {
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
          waitUntil: "domcontentloaded",
          timeout: 30000,
        })
        await page.waitForSelector('[data-deck-id="main"]', { timeout: 15000 })
        await page.waitForTimeout(800)
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
  } finally {
    if (daemon) {
      cleanup(daemon)
      await new Promise((res) => daemon.once("exit", res))
    }
    await browser.close()
  }
  console.log("[capture] done")
}

main().catch((err) => {
  console.error("[fatal]", err)
  process.exit(1)
})
