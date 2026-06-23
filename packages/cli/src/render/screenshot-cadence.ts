import type pino from "pino";

export interface CadenceTimerOptions {
  readonly intervalMs: number;
  readonly onTick: () => void | Promise<void>;
  readonly logger: pino.Logger;
}

export class CadenceTimer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private running = false;

  constructor(private readonly options: CadenceTimerOptions) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.schedule();
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private schedule(): void {
    if (!this.running) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.running) return;
      const start = Date.now();
      const result = this.options.onTick();
      const follow = () => {
        const elapsed = Date.now() - start;
        if (elapsed > this.options.intervalMs) {
          this.options.logger.warn(
            { intervalMs: this.options.intervalMs, elapsedMs: elapsed },
            "cadence timer tick exceeded interval",
          );
        }
        this.schedule();
      };
      if (result instanceof Promise) {
        result.then(follow, (err: unknown) => {
          this.options.logger.error({ err }, "cadence timer tick failed");
          this.schedule();
        });
      } else {
        follow();
      }
    }, this.options.intervalMs);
  }
}

export interface EventDebouncerOptions {
  readonly delayMs: number;
  readonly onFlush: () => void;
  readonly logger: pino.Logger;
}

export class EventDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(private readonly options: EventDebouncerOptions) {}

  trigger(): void {
    if (this.disposed) return;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      if (this.disposed) return;
      this.options.onFlush();
    }, this.options.delayMs);
  }

  dispose(): void {
    this.disposed = true;
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
