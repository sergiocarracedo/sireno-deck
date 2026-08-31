import { spawn } from "node:child_process"
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import type pino from "pino"

import { systemRequirements } from "./commands/system-requirements"

const FLAG_VERSION = 1

export const isInstalledBuild = (): boolean =>
  process.env["SIRENO_INSTALL_ROOT"] !== undefined &&
  process.env["SIRENO_INSTALL_ROOT"] !== ""

const configDir = (): string => {
  const xdg = process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config")
  return join(xdg, "sirenodeck")
}

const flagPath = (): string => join(configDir(), "first-run.json")

const playrightBrowsersPath = (): string => {
  const cached =
    process.env["PLAYWRIGHT_BROWSERS_PATH"] ??
    join(homedir(), ".cache", "sirenodeck", "playwright")
  process.env["PLAYWRIGHT_BROWSERS_PATH"] = cached
  return cached
}

const chromiumInstalled = (browsersPath: string): boolean => {
  if (!existsSync(browsersPath)) return false
  try {
    return readdirSync(browsersPath).some((entry) =>
      entry.startsWith("chromium"),
    )
  } catch {
    return false
  }
}

/**
 * Download the headless chromium build without npm by shelling out to the
 * bundled playwright CLI. Browsers land in ~/.cache/sirenodeck/playwright/
 * (PLAYWRIGHT_BROWSERS_PATH) and the env var stays set for the child daemon,
 * so `browser-renderer` finds them at runtime.
 */
export const ensurePlaywright = async (logger: pino.Logger): Promise<void> => {
  const browsersPath = playrightBrowsersPath()
  if (chromiumInstalled(browsersPath)) return
  const root = process.env["SIRENO_INSTALL_ROOT"]
  if (root === undefined) return
  const cliPath = join(root, "node_modules", "playwright", "cli.js")
  if (!existsSync(cliPath)) {
    logger.warn(
      { cliPath },
      "first-run: playwright cli not found in install tree — skipping browser download",
    )
    return
  }
  logger.info(
    { browsersPath },
    "first-run: downloading headless chromium for browser rendering (one-time, ~150MB)",
  )
  await new Promise<void>((resolve) => {
    const child = spawn(process.execPath, [cliPath, "install", "chromium"], {
      env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: browsersPath },
      stdio: "inherit",
    })
    child.on("error", (err) => {
      logger.error({ err }, "first-run: failed to start playwright install")
      resolve()
    })
    child.on("exit", (code) => {
      if (code !== 0) {
        logger.warn(
          { code },
          "first-run: playwright install exited non-zero — browser output will be unavailable",
        )
      }
      resolve()
    })
  })
}

/**
 * First-run bootstrap for installed builds: run the setup wizard (which
 * surfaces the Wayland GNOME extension prerequisite), then download the
 * Playwright browsers, then stamp the flag file so it happens once.
 *
 * Skips for non-installed (dev) builds and for query commands
 * (--help/--version/system-requirements). Never blocks the requested command:
 * failures are logged and the run proceeds.
 */
export const runFirstRunIfNeeded = async (
  logger: pino.Logger,
): Promise<void> => {
  if (!isInstalledBuild()) return
  const command = process.argv.slice(2).find((arg) => !arg.startsWith("-"))
  if (command === undefined || command === "system-requirements") return
  if (existsSync(flagPath())) return

  const tty = process.stdin.isTTY === true
  try {
    await systemRequirements({
      logger,
      ...(tty ? {} : { nonInteractive: true }),
    })
  } catch (err) {
    logger.warn({ err }, "first-run: setup wizard failed, continuing")
  }

  try {
    await ensurePlaywright(logger)
  } catch (err) {
    logger.warn(
      { err },
      "first-run: playwright download failed — browser output will be unavailable",
    )
  }

  try {
    mkdirSync(configDir(), { recursive: true })
    writeFileSync(flagPath(), JSON.stringify({ version: FLAG_VERSION }))
  } catch (err) {
    logger.warn({ err }, "first-run: failed to write first-run flag file")
  }
}
