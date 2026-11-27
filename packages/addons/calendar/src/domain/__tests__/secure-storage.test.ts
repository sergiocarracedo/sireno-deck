import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { createSecureJsonStorage } from "../secure-storage.js"

const credentials = () => {
  const values = new Map<string, string>()
  return {
    values,
    availability: vi.fn(async () => "available" as const),
    get: vi.fn(async (name: string) => values.get(name)),
    set: vi.fn(async (name: string, value: string) => {
      values.set(name, value)
    }),
  }
}

describe("secure calendar storage", () => {
  it("encrypts stored values and keeps them out of the file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-secure-"))
    const path = join(directory, "alarms-v1.json")
    const store = credentials()
    try {
      const storage = createSecureJsonStorage({ path, credentials: store })
      await storage.save({
        version: 1,
        alarms: [{ title: "synthetic secret" }],
      })
      const raw = await readFile(path, "utf8")
      expect(raw).not.toContain("synthetic secret")
      expect(JSON.parse(raw)).toMatchObject({ version: 1, alg: "aes-256-gcm" })
      const reloaded = await createSecureJsonStorage({
        path,
        credentials: store,
      }).load()
      expect(reloaded).toEqual({
        version: 1,
        alarms: [{ title: "synthetic secret" }],
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("migrates a plaintext file and rewrites it encrypted", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-migrate-"))
    const path = join(directory, "alarms-v1.json")
    const store = credentials()
    try {
      await writeFile(path, JSON.stringify({ version: 1, alarms: ["legacy"] }))
      const storage = createSecureJsonStorage({ path, credentials: store })
      expect(await storage.load()).toEqual({ version: 1, alarms: ["legacy"] })
      const raw = await readFile(path, "utf8")
      expect(raw).not.toContain("legacy")
      expect(JSON.parse(raw)).toMatchObject({ alg: "aes-256-gcm" })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("falls back to plaintext when the credential store is unavailable", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-nocred-"))
    const path = join(directory, "alarms-v1.json")
    try {
      const storage = createSecureJsonStorage({
        path,
        credentials: {
          availability: async () => "unavailable" as const,
          get: async () => undefined,
          set: async () => {},
        },
      })
      await storage.save({ version: 1, alarms: [] })
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        version: 1,
        alarms: [],
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses to read encrypted data when the credential store is locked", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-locked-"))
    const path = join(directory, "alarms-v1.json")
    const store = credentials()
    try {
      await createSecureJsonStorage({ path, credentials: store }).save({
        version: 1,
        alarms: ["secret"],
      })
      const locked = createSecureJsonStorage({
        path,
        credentials: {
          availability: async () => "locked" as const,
          get: async () => undefined,
          set: async () => {},
        },
      })
      await expect(locked.load()).rejects.toThrow("locked")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("keeps working when the credential store cannot persist the key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-nokey-"))
    const path = join(directory, "alarms-v1.json")
    try {
      const storage = createSecureJsonStorage({
        path,
        credentials: {
          availability: async () => "available" as const,
          get: async () => undefined,
          set: async () => {},
        },
      })
      await storage.save({ version: 1, alarms: [] })
      expect(JSON.parse(await readFile(path, "utf8"))).toEqual({
        version: 1,
        alarms: [],
      })
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("does not read data written with a different key", async () => {
    const directory = await mkdtemp(join(tmpdir(), "calendar-otherkey-"))
    const path = join(directory, "alarms-v1.json")
    const first = credentials()
    const second = credentials()
    try {
      await createSecureJsonStorage({ path, credentials: first }).save({
        version: 1,
        alarms: ["secret"],
      })
      await expect(
        createSecureJsonStorage({ path, credentials: second }).load(),
      ).rejects.toThrow("Invalid calendar storage")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
