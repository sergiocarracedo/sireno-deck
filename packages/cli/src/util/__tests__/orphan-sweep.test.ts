import { existsSync, mkdirSync, mkdtempSync, rmSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { sweepOrphanedTempDirs } from "../orphan-sweep"

describe("sweepOrphanedTempDirs", () => {
  let fakeTmpRoot: string

  beforeEach(() => {
    fakeTmpRoot = mkdtempSync(join(tmpdir(), "sireno-sweep-test-"))
  })

  afterEach(() => {
    rmSync(fakeTmpRoot, { recursive: true, force: true })
  })

  function makeDir(prefix: string, ageMs: number, now: number): string {
    const path = join(fakeTmpRoot, `${prefix}${Math.random().toString(36).slice(2)}`)
    mkdirSync(path)
    const mtime = new Date(now - ageMs)
    utimesSync(path, mtime, mtime)
    return path
  }

  function sweep(patterns: Parameters<typeof sweepOrphanedTempDirs>[0], now: number) {
    return sweepOrphanedTempDirs(patterns, now, { roots: [fakeTmpRoot] })
  }

  it("removes directories older than the threshold", () => {
    const now = Date.now()
    const oldCapture = makeDir("sireno-browser-renderer-", 2 * 60 * 60 * 1000, now)
    const oldProfile = makeDir("playwright_chromiumdev_profile-", 90 * 60 * 1000, now)

    const results = sweep(
      [
        { prefix: "sireno-browser-renderer-" },
        { prefix: "playwright_chromiumdev_profile-" },
      ],
      now,
    )

    expect(results[0]?.removed).toContain(oldCapture)
    expect(results[1]?.removed).toContain(oldProfile)
    expect(existsSync(oldCapture)).toBe(false)
    expect(existsSync(oldProfile)).toBe(false)
  })

  it("preserves directories newer than the threshold", () => {
    const now = Date.now()
    const freshCapture = makeDir("sireno-browser-renderer-", 5 * 60 * 1000, now)
    const freshProfile = makeDir("playwright_chromiumdev_profile-", 30 * 1000, now)

    const results = sweep(
      [
        { prefix: "sireno-browser-renderer-" },
        { prefix: "playwright_chromiumdev_profile-" },
      ],
      now,
    )

    expect(results[0]?.removed).not.toContain(freshCapture)
    expect(results[1]?.removed).not.toContain(freshProfile)
    expect(results[0]?.skipped).toBeGreaterThanOrEqual(1)
    expect(results[1]?.skipped).toBeGreaterThanOrEqual(1)
    expect(existsSync(freshCapture)).toBe(true)
    expect(existsSync(freshProfile)).toBe(true)
  })

  it("returns an empty list when no patterns are provided", () => {
    expect(sweepOrphanedTempDirs([], Date.now(), { roots: [fakeTmpRoot] })).toEqual([])
  })

  it("ignores directories that do not match the prefix", () => {
    const now = Date.now()
    const unrelated = makeDir("not-a-match-", 2 * 60 * 60 * 1000, now)

    const results = sweep([{ prefix: "sireno-browser-renderer-" }], now)

    expect(results[0]?.scanned).toBe(0)
    expect(results[0]?.removed).toEqual([])
    expect(results[0]?.skipped).toBe(0)
    expect(existsSync(unrelated)).toBe(true)
  })

  it("honours a per-pattern maxAgeMs override", () => {
    const now = Date.now()
    const tenMin = makeDir("sireno-browser-renderer-", 10 * 60 * 1000, now)

    const results = sweep(
      [{ prefix: "sireno-browser-renderer-", maxAgeMs: 5 * 60 * 1000 }],
      now,
    )

    expect(results[0]?.removed).toContain(tenMin)
  })
})