import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { createAlarmStorage } from "../alarm-storage.js"
import type { AlarmRecord } from "../alarm-queue.js"

describe("alarm storage", () => {
  it("persists serialized updates in order and recovers them after restart", async () => {
    const dir = await mkdtemp(join(tmpdir(), "calendar-state-"))
    try {
      const path = join(dir, "state.json")
      const store = createAlarmStorage(path)
      expect(await store.load()).toEqual([])
      const alarm: AlarmRecord = {
        id: "one",
        occurrence: "event",
        eventStartMs: 100,
        dueAtMs: 50,
        state: "snoozed",
        snoozedUntilMs: 200,
      }
      await Promise.all([
        store.save([alarm]),
        store.save([{ ...alarm, state: "dismissed" }]),
      ])
      expect((await createAlarmStorage(path).load())[0]?.state).toBe(
        "dismissed",
      )
      expect(JSON.parse(await readFile(path, "utf8")).version).toBe(1)
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })

  it("does not silently overwrite or ignore corrupt state", async () => {
    const dir = await mkdtemp(join(tmpdir(), "calendar-state-"))
    try {
      const path = join(dir, "state.json")
      await writeFile(path, '{"version":1,"alarms":[{"state":"snoozed"}]}')
      await expect(createAlarmStorage(path).load()).rejects.toThrow(
        "Invalid alarm state",
      )
      expect(await readFile(path, "utf8")).toContain('"snoozed"')
    } finally {
      await rm(dir, { recursive: true, force: true })
    }
  })
})
