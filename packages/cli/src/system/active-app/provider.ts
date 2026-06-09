export interface LoggerLike {
  warn: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
}

export type ActiveAppSnapshot = { ownerName: string } | null

export interface ActiveAppProbe {
  getActiveWindow(): Promise<{ owner?: { name?: string | null } | null } | null | undefined>
}

export interface ActiveAppProvider {
  readonly supportsActiveApp: boolean
  start(onChange: (snapshot: ActiveAppSnapshot) => void): void
  stop(): void
}

export interface ActiveAppProviderDeps {
  logger: LoggerLike
  probe?: ActiveAppProbe
}
