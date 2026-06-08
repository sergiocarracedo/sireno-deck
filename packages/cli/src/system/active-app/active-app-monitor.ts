import type {
  ActiveAppProvider,
  ActiveAppSnapshot,
} from './provider'

export interface ActiveAppMonitor {
  start(): void
  stop(): void
}

export function createActiveAppMonitor(args: {
  provider: ActiveAppProvider
  onChange: (snapshot: ActiveAppSnapshot) => void
}): ActiveAppMonitor {
  const { provider, onChange } = args
  return {
    start() {
      provider.start(onChange)
    },
    stop() {
      provider.stop()
    },
  }
}

export interface ActiveAppMonitorDouble {
  start(): void
  stop(): void
  emit(snapshot: ActiveAppSnapshot): void
  getStartCount(): number
  getStopCount(): number
  setOnChange(fn: (s: ActiveAppSnapshot) => void): void
}

export function createActiveAppMonitorDouble(
  opts: {
    initialSnapshot?: ActiveAppSnapshot
    onChange?: (s: ActiveAppSnapshot) => void
  } = {},
): ActiveAppMonitorDouble {
  let onChange = opts.onChange
  let lastEmitted: ActiveAppSnapshot = opts.initialSnapshot ?? null
  let startCount = 0
  let stopCount = 0
  return {
    start() {
      startCount += 1
      onChange?.(lastEmitted)
    },
    stop() {
      stopCount += 1
    },
    emit(snapshot) {
      const lastName = lastEmitted?.ownerName ?? null
      const newName = snapshot?.ownerName ?? null
      if (lastName === newName) return
      lastEmitted = snapshot
      onChange?.(snapshot)
    },
    getStartCount: () => startCount,
    getStopCount: () => stopCount,
    setOnChange(fn) {
      onChange = fn
    },
  }
}
