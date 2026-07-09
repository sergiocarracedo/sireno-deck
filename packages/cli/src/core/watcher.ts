import chokidar, { type FSWatcher } from "chokidar"

export type WatchEvent = "add" | "change" | "unlink" | "ready" | "error"

export interface WatcherEventHandlers {
  onChange?: (path: string) => void
  onUnlink?: (path: string) => void
  onReady?: () => void
  onError?: (error: Error) => void
}

export interface WatchOptions {
  ignoreInitial?: boolean
  awaitWriteFinish?:
    | boolean
    | { stabilityThreshold?: number; pollInterval?: number }
  ignored?: ReadonlyArray<string | RegExp>
}

const defaultIgnored = [/node_modules/, /\.git/, /dist/]

export class ConfigWatcher {
  private readonly targets: string[]
  private watcher: FSWatcher | null = null
  private handlers: WatcherEventHandlers

  constructor(targets: string[], handlers: WatcherEventHandlers = {}) {
    this.targets = targets
    this.handlers = handlers
  }

  async start(options: WatchOptions = {}): Promise<void> {
    if (this.watcher) return
    const watcher = chokidar.watch(this.targets, {
      ignoreInitial: options.ignoreInitial ?? true,
      awaitWriteFinish: options.awaitWriteFinish ?? {
        stabilityThreshold: 100,
        pollInterval: 25,
      },
      ignored: options.ignored
        ? [...options.ignored, ...defaultIgnored]
        : defaultIgnored,
      persistent: true,
    })
    this.watcher = watcher

    watcher.on("add", (p) => this.handlers.onChange?.(p))
    watcher.on("change", (p) => this.handlers.onChange?.(p))
    watcher.on("unlink", (p) => this.handlers.onUnlink?.(p))
    watcher.on("error", (err: unknown) =>
      this.handlers.onError?.(
        err instanceof Error ? err : new Error(String(err)),
      ),
    )
    await new Promise<void>((resolve) => {
      watcher.once("ready", () => {
        this.handlers.onReady?.()
        resolve()
      })
    })
  }

  setHandlers(handlers: WatcherEventHandlers): void {
    this.handlers = handlers
  }

  async close(): Promise<void> {
    if (!this.watcher) return
    const w = this.watcher
    this.watcher = null
    await w.close()
  }
}
