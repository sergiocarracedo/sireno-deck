import WebSocket from "ws"
import { PROTOCOL_VERSION } from "@/render/protocol"

export type ProbeResult = "responding" | "unreachable" | "unknown"
export interface BuildIdentity {
  version: string
  buildId: string | null
}
const parseIdentity = (value: unknown): BuildIdentity | null => {
  if (!value || typeof value !== "object") return null
  const v = value as Record<string, unknown>
  if (
    typeof v.version !== "string" ||
    !(typeof v.buildId === "string" || v.buildId === null)
  )
    return null
  return { version: v.version, buildId: v.buildId }
}

export const probeWebIdentity = async (
  value: string,
  component: "frontend" | "config-ui",
): Promise<BuildIdentity | null> => {
  const base = localUrl(value, ["http:", "https:"])
  if (!base) return null
  try {
    const response = await fetch(
      new URL("/assets/sirenodeck-build.json", base),
      { signal: AbortSignal.timeout(1500), redirect: "manual" },
    )
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/json")
    )
      return null
    const body: unknown = await response.json()
    if (
      !body ||
      typeof body !== "object" ||
      !("component" in body) ||
      body.component !== component
    )
      return null
    return parseIdentity(body)
  } catch {
    return null
  }
}

// Only contact local endpoints: runtime state may be stale or externally supplied.
const localUrl = (value: string, protocols: readonly string[]): URL | null => {
  try {
    const url = new URL(value)
    if (!protocols.includes(url.protocol)) return null
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) return null
    return url
  } catch {
    return null
  }
}

export const probeHttp = async (value: string): Promise<ProbeResult> => {
  const url = localUrl(value, ["http:", "https:"])
  if (!url) return "unknown"
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(1500),
      redirect: "manual",
    })
    return response.ok ? "responding" : "unreachable"
  } catch {
    return "unreachable"
  }
}

export const probeBridgeInfo = (
  value: string,
  token: string | null,
): Promise<{ status: ProbeResult; identity: BuildIdentity | null }> => {
  const url = localUrl(value, ["ws:", "wss:"])
  if (!url || token === null)
    return Promise.resolve({ status: "unknown", identity: null })
  return new Promise((resolve) => {
    const socket = new WebSocket(url)
    const timer = setTimeout(() => finish("unreachable"), 1500)
    let finished = false
    const finish = (
      result: ProbeResult,
      identity: BuildIdentity | null = null,
    ): void => {
      if (finished) return
      finished = true
      clearTimeout(timer)
      socket.terminate()
      resolve({ status: result, identity })
    }
    socket.on("open", () =>
      socket.send(
        JSON.stringify({ type: "hello", version: PROTOCOL_VERSION, token }),
      ),
    )
    socket.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString()) as {
          type?: string
          version?: number
          build?: unknown
        }
        if (message.type === "hello-ack")
          finish(
            message.version === PROTOCOL_VERSION ? "responding" : "unreachable",
            parseIdentity(message.build),
          )
      } catch {
        finish("unreachable")
      }
    })
    socket.on("error", () => finish("unreachable"))
    socket.on("close", () => finish("unreachable"))
  })
}

export const probeBridge = async (
  value: string,
  token: string | null,
): Promise<ProbeResult> => (await probeBridgeInfo(value, token)).status
