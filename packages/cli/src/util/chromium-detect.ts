import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

import { execa } from "execa"

const CACHE_DIR =
  process.env.PLAYWRIGHT_BROWSERS_PATH ??
  join(homedir(), ".cache", "ms-playwright")
const MARKER_DIR = join(homedir(), ".cache", "sireno-deck")
const MARKER_PATH = join(MARKER_DIR, "chromium-installed")

export function isChromiumInstalled(): boolean {
  return existsSync(CACHE_DIR) && existsSync(MARKER_PATH)
}

export function isChromiumInstallSkipped(): boolean {
  return process.env.SIRENO_SKIP_BROWSER_INSTALL === "1"
}

function classifyError(err: unknown): "network" | "permission" | "other" {
  const message = err instanceof Error ? err.message : String(err)
  if (/ENOTFOUND|ETIMEDOUT|network|getaddrinfo/i.test(message)) return "network"
  if (/EACCES|EPERM|permission/i.test(message)) return "permission"
  return "other"
}

export async function ensureChromium(): Promise<void> {
  if (isChromiumInstallSkipped()) return
  if (isChromiumInstalled()) return

  process.stderr.write("Installing Playwright Chromium (~200MB, one-time)...\n")

  try {
    await execa("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit",
    })
    mkdirSync(MARKER_DIR, { recursive: true })
    writeFileSync(MARKER_PATH, new Date().toISOString())
  } catch (err) {
    const kind = classifyError(err)
    const detail = err instanceof Error ? err.message : String(err)
    if (kind === "network") {
      process.stderr.write(
        "Failed to download Chromium. Check your network connection.\n",
      )
    } else if (kind === "permission") {
      process.stderr.write(
        `Failed to install Chromium to ${CACHE_DIR}. Permission denied.\n`,
      )
    } else {
      process.stderr.write(`Failed to install Chromium: ${detail}\n`)
    }
    process.exit(1)
  }
}
