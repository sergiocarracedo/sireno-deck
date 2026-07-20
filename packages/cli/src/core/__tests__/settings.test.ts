import { mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { randomBytes } from "node:crypto"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  atomicWriteJson,
  createSettingsStore,
  loadSettings,
  resolveSettingsPath,
  settingsSchema,
} from "../settings"

const tmpDir = (): string =>
  mkdtempSync(join(tmpdir(), `settings-${randomBytes(4).toString("hex")}-`))

describe("settingsSchema", () => {
  it("accepts valid settings", () => {
    const result = settingsSchema.safeParse({
      brightness: 50,
      activeDeck: "main",
    })
    expect(result.success).toBe(true)
  })

  it("rejects unknown keys", () => {
    const result = settingsSchema.safeParse({
      brightness: 50,
      activeDeck: "main",
      foo: 1,
    })
    expect(result.success).toBe(false)
  })

  it("rejects brightness out of range", () => {
    const result = settingsSchema.safeParse({
      brightness: 5,
      activeDeck: "main",
    })
    expect(result.success).toBe(false)
  })
})

describe("resolveSettingsPath", () => {
  const originalHome = process.env["HOME"]
  const originalXdg = process.env["XDG_CONFIG_HOME"]

  afterEach(() => {
    if (originalHome === undefined) delete process.env["HOME"]
    else process.env["HOME"] = originalHome
    if (originalXdg === undefined) delete process.env["XDG_CONFIG_HOME"]
    else process.env["XDG_CONFIG_HOME"] = originalXdg
  })

  it("uses XDG_CONFIG_HOME when set", () => {
    const dir = tmpDir()
    process.env["XDG_CONFIG_HOME"] = dir
    expect(resolveSettingsPath()).toBe(join(dir, "sirenodeck", "settings.json"))
  })

  it("falls back to HOME/.config", () => {
    const dir = tmpDir()
    delete process.env["XDG_CONFIG_HOME"]
    process.env["HOME"] = dir
    expect(resolveSettingsPath()).toBe(
      join(dir, ".config", "sirenodeck", "settings.json"),
    )
  })
})

describe("loadSettings", () => {
  let path: string

  beforeEach(() => {
    path = join(tmpDir(), "settings.json")
  })

  it("returns defaults for missing file", () => {
    const result = loadSettings(path)
    expect(result).toEqual({ brightness: 50, activeDeck: "main" })
  })

  it("returns defaults for corrupt JSON", () => {
    writeFileSync(path, "not json{")
    const result = loadSettings(path)
    expect(result).toEqual({ brightness: 50, activeDeck: "main" })
  })

  it("returns defaults for schema mismatch", () => {
    writeFileSync(path, JSON.stringify({ brightness: 50 }))
    const result = loadSettings(path)
    expect(result).toEqual({ brightness: 50, activeDeck: "main" })
  })

  it("returns parsed settings on success", () => {
    writeFileSync(
      path,
      JSON.stringify({ brightness: 80, activeDeck: "settings" }),
    )
    const result = loadSettings(path)
    expect(result).toEqual({ brightness: 80, activeDeck: "settings" })
  })
})

describe("createSettingsStore", () => {
  it("roundtrips update + close", () => {
    const path = join(tmpDir(), "settings.json")
    const store = createSettingsStore({ path })
    store.update({ brightness: 80 })
    store.close()
    const loaded = loadSettings(path)
    expect(loaded.brightness).toBe(80)
  })

  it("debounces 5 rapid updates into 1 write", () => {
    const path = join(tmpDir(), "settings.json")
    const writeJson = vi.fn<(p: string, d: unknown) => void>()
    const store = createSettingsStore({ path, writeJson })
    for (let i = 0; i < 5; i++) store.update({ brightness: 60 + i })
    store.flush()
    expect(writeJson).toHaveBeenCalledTimes(1)
  })

  it("get returns a snapshot copy", () => {
    const store = createSettingsStore({ path: join(tmpDir(), "settings.json") })
    const snap = store.get()
    snap.brightness = 1
    expect(store.get().brightness).toBe(50)
  })
})

describe("atomicWriteJson", () => {
  it("writes JSON to disk", () => {
    const path = join(tmpDir(), "atomic.json")
    atomicWriteJson(path, { hello: "world" })
    const raw = readFileSync(path, "utf8")
    expect(JSON.parse(raw)).toEqual({ hello: "world" })
  })
})
