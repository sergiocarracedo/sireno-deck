import { type CommandExecutor } from "../shared"
import type { NotificationProvider } from "../notification"

export interface DarwinNotificationDeps {
  readonly executor: CommandExecutor
  readonly soundPath?: string
}

const escapeForAppleScript = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')

export const createDarwinNotificationProvider = async (
  deps: DarwinNotificationDeps,
): Promise<NotificationProvider> => {
  return {
    async notify(args) {
      const script = `display notification "${escapeForAppleScript(args.body)}" with title "${escapeForAppleScript(args.title)}"`
      try {
        const result = await deps.executor.run("osascript", ["-e", script])
        if (result.exitCode !== 0) {
          // swallow — osascript may fail in headless contexts; notification is best-effort
        }
      } catch {
        // best-effort; never throw
      }

      if (args.sound === true && deps.soundPath !== undefined) {
        try {
          await deps.executor.run("afplay", [deps.soundPath])
        } catch {
          // best-effort
        }
      }
    },
  }
}