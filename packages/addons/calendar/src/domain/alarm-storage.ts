import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import type { AlarmRecord } from "./alarm-queue.js"

interface StoredAlarms {
  readonly version: 1
  readonly alarms: readonly AlarmRecord[]
}

const validAlarm = (value: unknown): value is AlarmRecord => {
  if (typeof value !== "object" || value === null) return false
  const alarm = value as Record<string, unknown>
  return (
    typeof alarm.id === "string" &&
    typeof alarm.occurrence === "string" &&
    typeof alarm.eventStartMs === "number" &&
    Number.isFinite(alarm.eventStartMs) &&
    typeof alarm.dueAtMs === "number" &&
    Number.isFinite(alarm.dueAtMs) &&
    (alarm.state === "pending" ||
      alarm.state === "active" ||
      alarm.state === "dismissed" ||
      (alarm.state === "snoozed" &&
        typeof alarm.snoozedUntilMs === "number" &&
        Number.isFinite(alarm.snoozedUntilMs)))
  )
}

/** Atomic file replacement; storage contains alarm metadata, never event titles or credentials. */
export const createAlarmStorage = (path: string) => {
  let pending: Promise<void> = Promise.resolve()
  return {
    load: async (): Promise<AlarmRecord[]> => {
      await pending
      let raw: string
      try {
        raw = await readFile(path, "utf8")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return []
        throw error
      }
      let data: unknown
      try {
        data = JSON.parse(raw)
      } catch {
        throw new Error("Invalid alarm state")
      }
      if (
        typeof data !== "object" ||
        data === null ||
        (data as StoredAlarms).version !== 1 ||
        !Array.isArray((data as StoredAlarms).alarms) ||
        !(data as StoredAlarms).alarms.every(validAlarm)
      ) {
        throw new Error("Invalid alarm state")
      }
      return [...(data as StoredAlarms).alarms]
    },
    save: (alarms: readonly AlarmRecord[]): Promise<void> => {
      const snapshot = JSON.stringify({
        version: 1,
        alarms,
      } satisfies StoredAlarms)
      const write = async (): Promise<void> => {
        await mkdir(dirname(path), { recursive: true, mode: 0o700 })
        const temp = `${path}.${randomUUID()}.tmp`
        try {
          await writeFile(temp, snapshot, { mode: 0o600, flag: "wx" })
          await rename(temp, path)
        } catch (error) {
          await unlink(temp).catch(() => {})
          throw error
        }
      }
      const result = pending.then(write)
      pending = result.catch(() => {})
      return result
    },
  }
}
