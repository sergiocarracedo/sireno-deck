import si from "systeminformation"

export type HostSessionCapability = "supported" | "unknown" | "unsupported"
export type HostSessionState = "locked" | "unlocked" | "unknown"

export interface HostContext {
  os: {
    type: string
    variant: string
    version: string
  }
  session: {
    capability: HostSessionCapability
    state: HostSessionState
  }
}

export interface HostContextClient {
  osInfo: typeof si.osInfo
}

export interface HostContextSessionOptions {
  capability?: HostSessionCapability
  state?: HostSessionState
}

interface OsInfoSnapshot {
  build?: string
  codename?: string
  distro?: string
  platform?: string
  release?: string
}

const defaultClient: HostContextClient = {
  osInfo: si.osInfo,
}

export const UNKNOWN_HOST_CONTEXT: HostContext = {
  os: {
    type: "unknown",
    variant: "unknown",
    version: "unknown",
  },
  session: {
    capability: "unknown",
    state: "unknown",
  },
}

function normalizeOsType(platform: string | undefined): string {
  switch (platform?.toLowerCase()) {
    case "darwin":
      return "macos"
    case "win32":
      return "windows"
    default:
      return platform?.toLowerCase() ?? "unknown"
  }
}

function normalizeString(value: string | undefined): string {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : "unknown"
}

export function createHostContextFromOsInfo(
  osInfo: OsInfoSnapshot,
  session: HostContextSessionOptions = {},
): HostContext {
  return {
    os: {
      type: normalizeOsType(osInfo.platform),
      variant: normalizeString(osInfo.distro ?? osInfo.codename),
      version: normalizeString(osInfo.release ?? osInfo.build),
    },
    session: {
      capability: session.capability ?? UNKNOWN_HOST_CONTEXT.session.capability,
      state: session.state ?? UNKNOWN_HOST_CONTEXT.session.state,
    },
  }
}

export async function resolveHostContext(
  client: HostContextClient = defaultClient,
  session: HostContextSessionOptions = {},
): Promise<HostContext> {
  return createHostContextFromOsInfo(await client.osInfo(), session)
}
