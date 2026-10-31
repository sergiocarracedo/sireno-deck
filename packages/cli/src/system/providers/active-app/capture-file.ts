import { readFileSync } from "node:fs"

import type { ActiveAppProvider, ActiveAppSnapshot } from "../active-app"

const sameSnapshot = (
  left: ActiveAppSnapshot | null,
  right: ActiveAppSnapshot | null,
): boolean =>
  left?.name === right?.name &&
  left?.windowTitle === right?.windowTitle &&
  left?.processId === right?.processId

const readSnapshot = (path: string): ActiveAppSnapshot | null => {
  try {
    const value: unknown = JSON.parse(readFileSync(path, "utf8"))
    if (value === null) return null
    if (typeof value !== "object" || Array.isArray(value)) return null
    const snapshot = value as Record<string, unknown>
    if (typeof snapshot["name"] !== "string") return null
    const windowTitle = snapshot["windowTitle"]
    const processId = snapshot["processId"]
    return {
      name: snapshot["name"],
      windowTitle: typeof windowTitle === "string" ? windowTitle : null,
      processId:
        typeof processId === "number" && Number.isFinite(processId)
          ? processId
          : null,
    }
  } catch {
    return null
  }
}

export const createCaptureFileActiveAppProvider = (
  path: string,
): ActiveAppProvider => {
  const subscribers = new Set<(snapshot: ActiveAppSnapshot | null) => void>()
  let last = readSnapshot(path)
  const interval = setInterval(() => {
    const next = readSnapshot(path)
    if (sameSnapshot(last, next)) return
    last = next
    for (const subscriber of subscribers) subscriber(next)
  }, 100)

  return {
    async getActive() {
      last = readSnapshot(path)
      return last
    },
    subscribe(handler) {
      subscribers.add(handler)
      return () => subscribers.delete(handler)
    },
    async stop() {
      clearInterval(interval)
      subscribers.clear()
    },
  }
}
