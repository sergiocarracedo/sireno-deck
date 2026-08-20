import {
  appendFileSync,
  existsSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const TEST_DIR = join(tmpdir(), `sireno-deck-logreader-${process.pid}`)

vi.mock("../daemon", () => ({
  resolveDaemonPaths: () => ({ runtimeDir: TEST_DIR }),
}))

import {
  readDaemonEventsFromSnapshot,
  readDaemonEventsSince,
  snapshotDaemonLog,
} from "../log-reader"

describe("log-reader", () => {
  const logPath = () => join(TEST_DIR, "service.log")

  beforeEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
    mkdirSync(TEST_DIR, { recursive: true })
  })
  afterEach(() => {
    if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  const writeLogLine = (line: Record<string, unknown>): void => {
    appendFileSync(logPath(), `${JSON.stringify(line)}\n`)
  }

  describe("readDaemonEventsSince", () => {
    it("returns [] when file does not exist", () => {
      expect(readDaemonEventsSince("/nonexistent/path.log", 0)).toEqual([])
    })

    it("returns [] when sinceBytes >= file size", () => {
      writeLogLine({ level: 40, time: 1, msg: "boom" })
      expect(readDaemonEventsSince(logPath(), 999)).toEqual([])
    })

    it("parses warn/error/fatal events since offset", () => {
      const line1 = { level: 30, time: 1, msg: "ok" }
      const line2 = { level: 40, time: 2, msg: "disk full" }
      const line3 = { level: 50, time: 3, msg: "crash" }
      writeLogLine(line1)
      writeLogLine(line2)
      const sizeAfter1 = Buffer.byteLength(JSON.stringify(line1) + "\n", "utf8")
      writeLogLine(line3)

      const events = readDaemonEventsSince(logPath(), sizeAfter1)
      expect(events).toHaveLength(2)
      expect(events[0]).toMatchObject({
        level: "warn",
        message: "disk full",
      })
      expect(events[1]).toMatchObject({
        level: "error",
        message: "crash",
      })
    })

    it("skips lines that don't parse to DaemonEvent", () => {
      appendFileSync(logPath(), "not json\n")
      writeLogLine({ level: 30, time: 1, msg: "ok" }) // info, skipped
      writeLogLine({ level: 60, time: 4, msg: "kaboom" }) // fatal, kept
      const sizeAfter2Lines = Buffer.byteLength("not json\n", "utf8") + 1
      const events = readDaemonEventsSince(logPath(), sizeAfter2Lines)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ level: "fatal", message: "kaboom" })
    })

    it("handles rotation (file shrunk)", () => {
      writeLogLine({ level: 40, time: 1, msg: "before rotation" })
      const size = existsSync(logPath()) ? 999 : 0 // pretend offset > new size
      writeFileSync(logPath(), "truncated\n") // rotation
      expect(readDaemonEventsSince(logPath(), size)).toEqual([])
    })

    it("includes component field when present", () => {
      writeLogLine({
        level: 50,
        time: 1,
        msg: "vite crashed",
        component: "http",
      })
      const events = readDaemonEventsSince(logPath(), 0)
      expect(events[0]).toMatchObject({ component: "http" })
    })

    it("defaults component to empty string when absent", () => {
      writeLogLine({ level: 50, time: 1, msg: "vite crashed" })
      const events = readDaemonEventsSince(logPath(), 0)
      expect(events[0]).toMatchObject({ component: "" })
    })

    it("skips lines with empty msg", () => {
      writeLogLine({ level: 50, time: 1, msg: "" })
      writeLogLine({ level: 40, time: 2, msg: "disk full" })
      const events = readDaemonEventsSince(logPath(), 0)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ message: "disk full" })
    })
  })

  describe("readDaemonEventsFromSnapshot", () => {
    it("delegates to readDaemonEventsSince using snapshot.sinceBytes", () => {
      writeLogLine({ level: 30, time: 1, msg: "ok" })
      const snapshot = { sinceBytes: 0, takenAt: Date.now() }
      const events = readDaemonEventsFromSnapshot(logPath(), snapshot)
      expect(events).toEqual([])
    })

    it("returns events accumulated after snapshot", () => {
      writeLogLine({ level: 30, time: 1, msg: "ok" })
      const snapshot = { sinceBytes: 0, takenAt: Date.now() }
      writeLogLine({ level: 40, time: 2, msg: "disk full" })
      const events = readDaemonEventsFromSnapshot(logPath(), snapshot)
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({ level: "warn", message: "disk full" })
    })
  })

  describe("snapshotDaemonLog", () => {
    it("returns size 0 when no log file exists", () => {
      const snap = snapshotDaemonLog()
      expect(snap.sinceBytes).toBe(0)
      expect(snap.takenAt).toBeGreaterThan(0)
    })

    it("returns current file size", () => {
      writeLogLine({ level: 30, time: 1, msg: "ok" })
      const snap = snapshotDaemonLog()
      expect(snap.sinceBytes).toBeGreaterThan(0)
    })
  })
})
