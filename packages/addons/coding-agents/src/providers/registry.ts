// ponytail: see packages/addons/app-shortcuts/src/index.ts for context.
import type { AgentProvider } from "../shared/state.js"
import { ClaudeCodeProvider } from "./claude-code.js"
import { OpenCodeProvider } from "./opencode.js"

export interface ProviderRegistryConfig {
  readonly opencodeUrl: string
  readonly claudeCodeProjectsDir?: string
  readonly spawnOpencodeIfMissing: boolean
}

export interface LoadProvidersResult {
  readonly providers: ReadonlyMap<string, AgentProvider>
  readonly spawnedChild: { kill: () => Promise<void> } | null
}

export interface LoadProvidersDeps {
  readonly ensureOpencodeServer?: typeof import("./spawn").ensureOpencodeServer
}

const DEFAULT_OPENCODE_URL = "http://127.0.0.1:4096"

export const loadProviders = async (
  config: ProviderRegistryConfig,
  signal: AbortSignal,
  deps: LoadProvidersDeps = {},
): Promise<LoadProvidersResult> => {
  const providers = new Map<string, AgentProvider>()
  let spawnedChild: { kill: () => Promise<void> } | null = null
  const opencodeUrl = config.opencodeUrl ?? DEFAULT_OPENCODE_URL

  try {
    providers.set("opencode", new OpenCodeProvider({ baseUrl: opencodeUrl }))
  } catch {
    // ponytail: client construction is synchronous and should not throw;
    // if SDK import is broken at runtime, we just skip opencode.
  }

  if (
    !providers.has("opencode") ||
    !(await probeOpencodeHealth(opencodeUrl, signal))
  ) {
    if (config.spawnOpencodeIfMissing && !signal.aborted) {
      try {
        const ensure =
          deps.ensureOpencodeServer ??
          (await import("./spawn")).ensureOpencodeServer
        const spawned = await ensure(opencodeUrl, signal)
        if (spawned) {
          spawnedChild = spawned.child
          providers.set(
            "opencode",
            new OpenCodeProvider({ baseUrl: spawned.baseUrl }),
          )
        }
      } catch {
        // spawn failed; opencode will remain absent from the registry
      }
    } else {
      providers.delete("opencode")
    }
  }

  try {
    providers.set(
      "claude-code",
      new ClaudeCodeProvider({
        ...(config.claudeCodeProjectsDir !== undefined
          ? { projectsDir: config.claudeCodeProjectsDir }
          : {}),
      }),
    )
  } catch {
    // claude-code has no native deps; skip if chokidar somehow fails
  }

  return { providers, spawnedChild }
}

const probeOpencodeHealth = async (
  baseUrl: string,
  signal: AbortSignal,
): Promise<boolean> => {
  try {
    const res = await fetch(`${baseUrl}/global/health`, { signal })
    if (!res.ok) return false
    const body = (await res.json()) as { healthy?: boolean }
    return body.healthy === true
  } catch {
    return false
  }
}
