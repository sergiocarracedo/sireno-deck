import { execa, type ExecaError } from "execa"

export class NotReachableError extends Error {
  override readonly name = "NotReachableError"
  constructor(message: string) {
    super(message)
  }
}

export interface SpawnedServer {
  readonly baseUrl: string
  readonly child: { kill: () => Promise<void> }
}

interface ExecaChild {
  kill: () => Promise<unknown>
}

interface SpawnDeps {
  readonly fetchImpl?: typeof fetch
  readonly execaImpl?: (cmd: string, args: ReadonlyArray<string>) => ExecaChild
  readonly sleep?: (ms: number) => Promise<void>
}

const defaultSleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

export const ensureOpencodeServer = async (
  baseUrl: string,
  signal: AbortSignal,
  deps: SpawnDeps = {},
): Promise<SpawnedServer | null> => {
  const fetchImpl = deps.fetchImpl ?? fetch
  const sleep = deps.sleep ?? defaultSleep

  if (await isReachable(baseUrl, fetchImpl, signal)) return null

  if (signal.aborted) throw new AbortError()

  const port = parsePort(baseUrl)
  const child: ExecaChild = deps.execaImpl
    ? deps.execaImpl("opencode", ["serve", "--port", String(port)])
    : (execa("opencode", [
        "serve",
        "--port",
        String(port),
      ]) as unknown as ExecaChild)

  const deadline = Date.now() + 5000
  while (Date.now() < deadline) {
    if (signal.aborted) {
      await child.kill().catch(() => undefined)
      throw new AbortError()
    }
    if (await isReachable(baseUrl, fetchImpl, signal)) {
      return {
        baseUrl,
        child: {
          kill: async () => {
            await child.kill().catch(() => undefined)
          },
        },
      }
    }
    await sleep(200)
  }
  await child.kill().catch(() => undefined)
  throw new NotReachableError(
    `opencode serve did not become reachable at ${baseUrl} within 5 s`,
  )
}

const isReachable = async (
  baseUrl: string,
  fetchImpl: typeof fetch,
  signal: AbortSignal,
): Promise<boolean> => {
  try {
    const res = await fetchImpl(`${baseUrl}/global/health`, { signal })
    if (!res.ok) return false
    const body = (await res.json()) as { healthy?: boolean }
    return body.healthy === true
  } catch (err) {
    if ((err as ExecaError | undefined)?.shortMessage) return false
    return false
  }
}

const parsePort = (baseUrl: string): number => {
  try {
    const parsed = new URL(baseUrl)
    const port = Number.parseInt(parsed.port, 10)
    return Number.isFinite(port) && port > 0 ? port : 4096
  } catch {
    return 4096
  }
}

export class AbortError extends Error {
  override readonly name = "AbortError"
  constructor() {
    super("aborted")
  }
}
