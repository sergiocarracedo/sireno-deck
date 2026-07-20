export type ServiceLogLevel =
  | "trace"
  | "debug"
  | "info"
  | "warn"
  | "error"
  | "fatal"

export interface ServiceLogEntry {
  readonly ts: number
  readonly level: ServiceLogLevel
  readonly msg: string
}

export interface BridgeMessageEntry {
  readonly ts: number
  readonly direction: "sent" | "received"
  readonly type: string
  readonly channel: string | null
  readonly payload: unknown
}

export interface ServiceLogFilter {
  readonly level?: ServiceLogLevel
  readonly sinceMs?: number
  readonly contentSubstring?: string
}

export interface BridgeMessageFilter {
  readonly direction?: "all" | "sent" | "received"
  readonly channel?: string
  readonly type?: string
  readonly contentSubstring?: string
  readonly sinceMs?: number
}

const SERVICE_LOG_CAP = 1000
const BRIDGE_MSG_CAP = 1000

const serviceLogs: ServiceLogEntry[] = []
const bridgeMessages: BridgeMessageEntry[] = []

export const appendServiceLog = (entry: ServiceLogEntry): void => {
  serviceLogs.push(entry)
  if (serviceLogs.length > SERVICE_LOG_CAP) {
    serviceLogs.shift()
  }
}

export const getServiceLogs = (
  filter: ServiceLogFilter = {},
): ServiceLogEntry[] => {
  return serviceLogs.filter((entry) => {
    if (filter.level !== undefined && entry.level !== filter.level) return false
    if (filter.sinceMs !== undefined && entry.ts < filter.sinceMs) return false
    if (
      filter.contentSubstring !== undefined &&
      !entry.msg.includes(filter.contentSubstring)
    ) {
      return false
    }
    return true
  })
}

export const clearServiceLogs = (): void => {
  serviceLogs.length = 0
}

export const appendBridgeMessage = (entry: BridgeMessageEntry): void => {
  bridgeMessages.push(entry)
  if (bridgeMessages.length > BRIDGE_MSG_CAP) {
    bridgeMessages.shift()
  }
}

export const getBridgeMessages = (
  filter: BridgeMessageFilter = {},
): BridgeMessageEntry[] => {
  return bridgeMessages.filter((entry) => {
    if (
      filter.direction !== undefined &&
      filter.direction !== "all" &&
      entry.direction !== filter.direction
    ) {
      return false
    }
    if (filter.channel !== undefined && entry.channel !== filter.channel) {
      return false
    }
    if (filter.type !== undefined && entry.type !== filter.type) {
      return false
    }
    if (filter.sinceMs !== undefined && entry.ts < filter.sinceMs) {
      return false
    }
    if (
      filter.contentSubstring !== undefined &&
      !JSON.stringify(entry.payload ?? "").includes(filter.contentSubstring)
    ) {
      return false
    }
    return true
  })
}

export const clearBridgeMessages = (): void => {
  bridgeMessages.length = 0
}
