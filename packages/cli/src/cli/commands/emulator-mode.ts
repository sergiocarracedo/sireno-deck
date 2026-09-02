import { spawn, type ChildProcess } from "node:child_process"
import { existsSync, mkdirSync, writeFileSync } from "node:fs"
import { dirname, join, resolve as resolvePath } from "node:path"
import { fileURLToPath } from "node:url"

import type pino from "pino"

import {
  BUILT_IN_THEMES,
  buildThemeCssFromManifest,
  copyThemeAssets,
  readAndValidateManifest,
} from "@/themes/loader"

export const DEFAULT_FRONTEND_PORT = 5180
export const DEFAULT_CONFIG_UI_PORT = 52938
const DEFAULT_TIMEOUT_MS = 30_000
// eslint-disable-next-line no-control-regex
const ANSI_REGEX = /\u001b\[[0-9;]*m/g
// Matches Vite's Local: line — localhost binding
const LOCAL_URL_REGEX =
  /(?:Local|➜\s*Local)[^\n]*?(https?):\/\/([0-9.]+|[^:\s]+)(?::(\d+))?/
// Matches Vite's Network: line — 0.0.0.0 binding
const NETWORK_URL_REGEX =
  /(?:Network)[^\n]*?(https?):\/\/([0-9.]+|[^:\s]+)(?::(\d+))?/

export const findWorkspaceRoot = (): string => {
  const here = dirname(fileURLToPath(import.meta.url))
  let dir = here
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(resolvePath(dir, "pnpm-workspace.yaml"))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return here
}

export const resolveConfigUiCwd = (override?: string): string => {
  if (override !== undefined) return override
  return resolvePath(findWorkspaceRoot(), "packages", "cli", "config-ui")
}

export const resolveFrontendCwd = (): string =>
  resolvePath(findWorkspaceRoot(), "packages", "cli", "frontend")

interface ViteSpawnOptions {
  port: number
  cwd: string
  pnpmCommand: string
  readyTimeoutMs: number
  logger: pino.Logger
  wsUrl?: string
  frontendUrl?: string
  themeDir?: string
  configPath?: string
  host?: string
  requireToken?: string
  emulatorMode?: boolean
  childLabel: "frontend vite" | "config ui vite"
  exitFatalMessage: string
  onPid?: (pid: number) => void
}

const spawnViteAndWaitForReady = (
  options: ViteSpawnOptions,
): Promise<{ process: ChildProcess; url: string }> => {
  const {
    port,
    cwd,
    readyTimeoutMs,
    logger,
    wsUrl,
    frontendUrl,
    themeDir,
    configPath,
    host,
    requireToken,
    emulatorMode,
    childLabel,
    exitFatalMessage,
    onPid,
  } = options

  return new Promise((resolve, reject) => {
    if (!existsSync(cwd)) {
      reject(new Error(`${childLabel} workspace not found at ${cwd}`))
      return
    }
    const env: Record<string, string> = { ...process.env, FORCE_COLOR: "0" }
    if (wsUrl !== undefined) {
      env["SIRENO_WS_URL"] = wsUrl
    }
    if (frontendUrl !== undefined) {
      env["SIRENO_FRONTEND_URL"] = frontendUrl
    }
    if (themeDir !== undefined) {
      env["SIRENO_THEME_DIR"] = themeDir
    }
    if (configPath !== undefined) {
      env["SIRENO_CONFIG_PATH"] = configPath
    }
    if (host !== undefined) {
      env["SIRENO_VITE_HOST"] = host
    }
    if (requireToken !== undefined) {
      env["SIRENO_REQUIRE_TOKEN"] = requireToken
    }
    if (emulatorMode !== undefined) {
      env["SIRENO_EMULATOR_MODE"] = String(emulatorMode)
    }
    const viteBin = findWorkspaceRoot() + "/node_modules/.bin/vite"
    const viteArgs = [
      "--config",
      resolvePath(cwd, "vite.config.ts"),
      "--port",
      String(port),
    ]
    if (host !== undefined) {
      viteArgs.push("--host", host)
    }
    const child = spawn(viteBin, viteArgs, {
      cwd,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    })
    const spawnedPid = child.pid
    if (spawnedPid !== undefined) onPid?.(spawnedPid)

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []
    let settled = false
    let settledUrl: string | null = null

    const collectOutput = (text: string, label: "stdout" | "stderr"): void => {
      const stripped = text.replace(ANSI_REGEX, "").trimEnd()
      if (stripped.length === 0) return
      const formatted = `${label}:\n${stripped}`
      if (label === "stdout") stdoutChunks.push(formatted)
      else stderrChunks.push(formatted)
      if (label === "stderr") logger.warn(formatted)
      else logger.info(formatted)
    }

    const timer = setTimeout(() => {
      child.kill("SIGTERM")
      const output = stdoutChunks.join("") + stderrChunks.join("")
      const detail = output.length > 0 ? `\n  output:\n${output}` : ""
      reject(
        new Error(
          `${childLabel} did not become ready within ${readyTimeoutMs}ms${detail}`,
        ),
      )
    }, readyTimeoutMs)

    const onData = (chunk: Buffer): void => {
      const text = chunk.toString()
      collectOutput(text, "stdout")
      const stripped = text.replace(ANSI_REGEX, "")
      const regex = host === "0.0.0.0" ? NETWORK_URL_REGEX : LOCAL_URL_REGEX
      const match = stripped.match(regex)
      if (match && match[1] && match[2] && match[3]) {
        clearTimeout(timer)
        const resolvedHost = host ?? "127.0.0.1"
        const url = `${match[1]}://${resolvedHost}:${match[3]}`
        if (childLabel === "frontend vite") {
          setTimeout(() => {
            settled = true
            settledUrl = url
            resolve({ process: child, url })
          }, 1000)
        } else {
          settled = true
          settledUrl = url
          resolve({ process: child, url })
        }
      }
    }

    child.stdout?.on("data", onData)
    child.stderr?.on("data", (chunk: Buffer) => {
      collectOutput(chunk.toString(), "stderr")
    })
    child.on("exit", (code) => {
      clearTimeout(timer)
      if (settled) {
        // ponytail: this logs as a warn, not a fatal. The supervisor (which
        // owns this child) already decides whether to respawn or give up
        // and emits its own warn + fatal as appropriate. Logging fatal here
        // is redundant and clutters `p dev restart`, which legitimately
        // kills the previous vite as part of the stop→start cycle.
        logger.warn({ code, url: settledUrl }, exitFatalMessage)
        return
      }
      const output = stdoutChunks.join("") + stderrChunks.join("")
      const detail = output.length > 0 ? `\n  output:\n${output}` : ""
      reject(
        new Error(
          `${childLabel} exited (code=${code}) before becoming ready${detail}`,
        ),
      )
    })
    child.on("error", (err) => {
      clearTimeout(timer)
      reject(err)
    })
  })
}

export const spawnFrontendVite = (options: {
  port: number
  cwd: string
  pnpmCommand: string
  readyTimeoutMs: number
  logger: pino.Logger
  wsUrl?: string
  themeDir?: string
  configPath?: string
  host?: string
  requireToken?: string
  emulatorMode?: boolean
  onPid?: (pid: number) => void
}): Promise<{ process: ChildProcess; url: string }> =>
  spawnViteAndWaitForReady({
    ...options,
    emulatorMode: options.emulatorMode ?? false,
    childLabel: "frontend vite",
    exitFatalMessage:
      "frontend vite exited after becoming ready — emulator will show a blank deck until the frontend is restarted",
  })

export const spawnConfigUiVite = (options: {
  port: number
  cwd: string
  pnpmCommand: string
  readyTimeoutMs: number
  logger: pino.Logger
  wsUrl?: string
  frontendUrl?: string
  configPath?: string
  host?: string
  requireToken?: string
  emulatorMode?: boolean
  onPid?: (pid: number) => void
}): Promise<{ process: ChildProcess; url: string }> =>
  spawnViteAndWaitForReady({
    ...options,
    emulatorMode: options.emulatorMode ?? true,
    childLabel: "config ui vite",
    exitFatalMessage:
      "config ui vite exited after becoming ready — commands from buttons will no longer be received",
  })

export const killChild = (child: ChildProcess): Promise<void> =>
  new Promise<void>((resolve) => {
    if (child.exitCode !== null) {
      resolve()
      return
    }
    child.once("exit", () => resolve())
    child.kill("SIGTERM")
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL")
    }, 2_000)
  })

export const ensureDefaultThemeEnv = (frontendCwd: string): void => {
  if (
    process.env["SIRENO_THEME"] !== undefined &&
    process.env["SIRENO_THEME"].length > 0
  ) {
    return
  }
  const defaultSpec = BUILT_IN_THEMES[0]
  if (defaultSpec === undefined) return
  const manifestPath = resolvePath(defaultSpec.dir, "sirenodeck.json")
  process.env["SIRENO_THEME"] = JSON.stringify({
    name: defaultSpec.name,
    manifestPath,
    uiOverridesPath: null,
  })
  process.env["SIRENO_THEME_DIR"] = frontendCwd
  const cssDir = join(frontendCwd, ".sirenodeck")
  if (!existsSync(cssDir)) mkdirSync(cssDir, { recursive: true })
  const manifest = readAndValidateManifest(manifestPath, defaultSpec.name)
  const cssContent = buildThemeCssFromManifest(manifest, defaultSpec.dir)
  writeFileSync(join(cssDir, "theme.css"), cssContent, "utf8")
  copyThemeAssets(defaultSpec.dir, cssDir)
}
