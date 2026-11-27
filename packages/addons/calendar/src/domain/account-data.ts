import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { randomUUID } from "node:crypto"
import { dirname, join } from "node:path"

/** Alarm records reference their provider instance through the occurrence key. */
const belongsToInstance = (occurrence: string, instanceId: string): boolean => {
  try {
    const parsed: unknown = JSON.parse(occurrence)
    return Array.isArray(parsed) && parsed[0] === instanceId
  } catch {
    return false
  }
}

const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 })
  const temporary = `${path}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(value), {
      mode: 0o600,
      flag: "wx",
    })
    await rename(temporary, path)
  } catch (error) {
    await unlink(temporary).catch(() => {})
    throw error
  }
}

const readJson = async (path: string): Promise<unknown> => {
  try {
    return JSON.parse(await readFile(path, "utf8"))
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
    throw error
  }
}

/**
 * Delete the local reminders and calendar toggles of one account.
 * Other accounts keep their own selections and alarms.
 */
export const removeAccountLocalData = async (
  dataDirectory: string,
  instanceId: string,
): Promise<void> => {
  const selectionsPath = join(dataDirectory, "calendar-selections-v1.json")
  const selections = await readJson(selectionsPath)
  if (selections !== undefined) {
    const stored = (selections as { selections?: Record<string, boolean> })
      .selections
    if (stored && typeof stored === "object") {
      const kept = Object.fromEntries(
        Object.entries(stored).filter(([key]) => {
          try {
            const parsed: unknown = JSON.parse(key)
            return !(Array.isArray(parsed) && parsed[0] === instanceId)
          } catch {
            return true
          }
        }),
      )
      await writeJson(selectionsPath, { version: 1, selections: kept })
    }
  }
  const alarmsPath = join(dataDirectory, "alarms-v1.json")
  const alarms = await readJson(alarmsPath)
  if (alarms !== undefined) {
    const records = (alarms as { alarms?: unknown[] }).alarms
    if (Array.isArray(records)) {
      const kept = records.filter(
        (record) =>
          typeof (record as { occurrence?: unknown }).occurrence !== "string" ||
          !belongsToInstance(
            (record as { occurrence: string }).occurrence,
            instanceId,
          ),
      )
      await writeJson(alarmsPath, { version: 1, alarms: kept })
    }
  }
  await unlink(join(dataDirectory, "provider-snapshots-v1.json")).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error
    },
  )
}
