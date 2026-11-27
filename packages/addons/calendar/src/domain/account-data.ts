import { unlink } from "node:fs/promises"
import { join } from "node:path"
import {
  createSecureJsonStorage,
  type StorageCredentials,
} from "./secure-storage.js"

interface StoredAlarms {
  readonly version: 1
  readonly alarms: readonly { readonly occurrence?: unknown }[]
}

interface StoredSelections {
  readonly version: 1
  readonly selections?: Record<string, boolean>
}

/** Alarm records reference their provider instance through the occurrence key. */
const belongsToInstance = (occurrence: string, instanceId: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(occurrence)
    return Array.isArray(parsed) && parsed[0] === instanceId
  } catch {
    return false
  }
}

/**
 * Delete the local reminders and calendar toggles of one account.
 * Other accounts keep their own selections and alarms.
 */
export const removeAccountLocalData = async (
  dataDirectory: string,
  instanceId: string,
  credentials?: StorageCredentials,
): Promise<void> => {
  const selectionsPath = join(dataDirectory, "calendar-selections-v1.json")
  const selections = createSecureJsonStorage({
    path: selectionsPath,
    ...(credentials ? { credentials } : {}),
  })
  const storedSelections = (await selections.load()) as
    | StoredSelections
    | undefined
  if (storedSelections?.selections) {
    const kept = Object.fromEntries(
      Object.entries(storedSelections.selections).filter(([key]) => {
        try {
          const parsed: unknown = JSON.parse(key)
          return !(Array.isArray(parsed) && parsed[0] === instanceId)
        } catch {
          return true
        }
      }),
    )
    await selections.save({ version: 1, selections: kept })
  }
  const alarmsPath = join(dataDirectory, "alarms-v1.json")
  const alarms = createSecureJsonStorage({
    path: alarmsPath,
    ...(credentials ? { credentials } : {}),
  })
  const storedAlarms = (await alarms.load()) as StoredAlarms | undefined
  if (storedAlarms?.alarms) {
    const kept = storedAlarms.alarms.filter(
      (record) =>
        typeof record.occurrence !== "string" ||
        !belongsToInstance(record.occurrence, instanceId),
    )
    await alarms.save({ version: 1, alarms: kept })
  }
  await unlink(join(dataDirectory, "provider-snapshots-v1.json")).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    },
  )
}
