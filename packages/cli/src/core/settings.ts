import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  writeSync,
} from "node:fs"
import { dirname, join } from "node:path"
import { homedir } from "node:os"
import { randomBytes } from "node:crypto"

import { z } from "zod"
import type pino from "pino"

export const settingsSchema = z
  .object({
    brightness: z.number().int().min(10).max(100),
    activeDeck: z.string().min(1),
  })
  .strict()

export type Settings = z.infer<typeof settingsSchema>

export const DEFAULT_SETTINGS: Settings = {
  brightness: 50,
  activeDeck: "main",
}

const SETTINGS_DIR = "sirenodeck"
const SETTINGS_FILE = "settings.json"

const resolveXdgConfigHome = (): string =>
  process.env["XDG_CONFIG_HOME"] ?? join(homedir(), ".config")

export const resolveSettingsPath = (): string => {
  const dir = join(resolveXdgConfigHome(), SETTINGS_DIR)
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  return join(dir, SETTINGS_FILE)
}

export const loadSettings = (
  path: string = resolveSettingsPath(),
  logger?: pino.Logger,
): Settings => {
  if (!existsSync(path)) return DEFAULT_SETTINGS
  let raw: string
  try {
    raw = readFileSync(path, "utf8")
  } catch (err) {
    logger?.warn({ err, path }, "settings: read failed; using defaults")
    return DEFAULT_SETTINGS
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (err) {
    logger?.warn({ err, path }, "settings: corrupt JSON; using defaults")
    return DEFAULT_SETTINGS
  }
  const result = settingsSchema.safeParse(parsed)
  if (!result.success) {
    logger?.warn(
      { err: result.error.message, path },
      "settings: schema mismatch; using defaults",
    )
    return DEFAULT_SETTINGS
  }
  return result.data
}

export const atomicWriteJson = (path: string, data: unknown): void => {
  const tmpPath = `${path}.${randomBytes(6).toString("hex")}.tmp`
  const fd = openSync(tmpPath, "w", 0o600)
  try {
    writeSync(fd, JSON.stringify(data, null, 2))
  } finally {
    closeSync(fd)
  }
  renameSync(tmpPath, path)
}

const DEBOUNCE_MS = 500

export interface SettingsStore {
  get(): Settings
  update(partial: Partial<Settings>): void
  flush(): void
  close(): void
}

export const createSettingsStore = ({
  path = resolveSettingsPath(),
  logger,
  writeJson = atomicWriteJson,
}: {
  path?: string
  logger?: pino.Logger
  writeJson?: (path: string, data: unknown) => void
} = {}): SettingsStore => {
  let current: Settings = loadSettings(path, logger)
  let timer: ReturnType<typeof setTimeout> | null = null
  let pending = false

  const writeNow = (): void => {
    try {
      writeJson(path, current)
    } catch (err) {
      logger?.warn({ err, path }, "settings: write failed")
    }
  }

  const schedule = (): void => {
    pending = true
    if (timer !== null) return
    timer = setTimeout(() => {
      timer = null
      if (pending) {
        pending = false
        writeNow()
      }
    }, DEBOUNCE_MS)
  }

  return {
    get: () => ({ ...current }),
    update: (partial) => {
      current = { ...current, ...partial }
      schedule()
    },
    flush: () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      pending = false
      writeNow()
    },
    close: () => {
      if (timer !== null) {
        clearTimeout(timer)
        timer = null
      }
      if (pending) {
        pending = false
        writeNow()
      }
    },
  }
}

void dirname
