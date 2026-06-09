export interface LoggerLike {
  warn: (...args: unknown[]) => void
  error?: (...args: unknown[]) => void
  info: (...args: unknown[]) => void
}

export type ActiveAppSnapshot = { ownerName: string } | null

export interface ActiveAppProbe {
  getActiveWindow(): Promise<{ owner?: { name?: string | null } | null } | null | undefined>
}

export interface DbusBus {
  disconnect?: () => void
  getProxyObject: (serviceName: string, objectPath: string) => Promise<DbusProxyObject>
}

export interface DbusProxyObject {
  getInterface: (interfaceName: string) => DbusProxyInterface
}

export interface DbusProxyInterface {
  FocusClass?: () => Promise<string>
  FocusPID?: () => Promise<number>
  FocusTitle?: () => Promise<string>
  List?: () => Promise<unknown>
}

export interface DbusClient {
  createSessionBus: () => DbusBus
}

export interface ActiveAppProvider {
  readonly supportsActiveApp: boolean
  start(onChange: (snapshot: ActiveAppSnapshot) => void): void
  stop(): void
}

export interface ActiveAppProviderDeps {
  dbusClient?: DbusClient
  logger: LoggerLike
  probe?: ActiveAppProbe
}
