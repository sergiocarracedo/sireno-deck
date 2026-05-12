export interface PollingTask {
  id: string
  run: () => Promise<void> | void
}

export interface PollingSchedulerOptions {
  intervalMs?: number
  jitterMs?: number
  random?: () => number
  scheduleTimeout?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>
  clearScheduledTimeout?: (timeoutId: ReturnType<typeof setTimeout>) => void
}

export interface PollingScheduler {
  intervalMs: number
  jitterMs: number
  scheduleDelay: (taskIndex: number) => number
  start: (tasks: readonly PollingTask[]) => void
  stop: () => void
}

const DEFAULT_INTERVAL_MS = 500
const DEFAULT_JITTER_MS = 75

export function createPollingScheduler(options: PollingSchedulerOptions = {}): PollingScheduler {
  const intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS
  const jitterMs = options.jitterMs ?? DEFAULT_JITTER_MS
  const random = options.random ?? Math.random
  const scheduleTimeout = options.scheduleTimeout ?? setTimeout
  const clearScheduledTimeout = options.clearScheduledTimeout ?? clearTimeout
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  let stopped = false

  function computeJitter(): number {
    const spread = jitterMs * 2 + 1
    return Math.floor(random() * spread) - jitterMs
  }

  function scheduleDelay(taskIndex: number): number {
    const baseOffset = taskIndex * 17
    return Math.max(0, intervalMs + baseOffset + computeJitter())
  }

  function scheduleTask(task: PollingTask, taskIndex: number): void {
    if (stopped) {
      return
    }

    const delay = scheduleDelay(taskIndex)
    const timeoutId = scheduleTimeout(async () => {
      try {
        await task.run()
      } finally {
        scheduleTask(task, taskIndex)
      }
    }, delay)

    timers.set(task.id, timeoutId)
  }

  return {
    intervalMs,
    jitterMs,
    scheduleDelay,
    start(tasks) {
      stopped = false
      for (const [taskIndex, task] of tasks.entries()) {
        scheduleTask(task, taskIndex)
      }
    },
    stop() {
      stopped = true
      for (const timeoutId of timers.values()) {
        clearScheduledTimeout(timeoutId)
      }
      timers.clear()
    },
  }
}
