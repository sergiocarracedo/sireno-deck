import type { AlarmRecord } from "./alarm-queue.js"
import {
  createSecureJsonStorage,
  type StorageCredentials,
} from "./secure-storage.js"

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
export const createAlarmStorage = (
  path: string,
  credentials?: StorageCredentials,
) => {
  let pending = Promise.resolve()
  const storage = createSecureJsonStorage({
    path,
    ...(credentials ? { credentials } : {}),
  })
  return {
    load: async (): Promise<AlarmRecord[]> => {
      await pending
      const data = await storage.load()
      if (data === undefined) return []
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
      const result = pending.then(() =>
        storage.save({ version: 1, alarms } satisfies StoredAlarms),
      )
      pending = result.catch(() => {})
      return result
    },
  }
}
