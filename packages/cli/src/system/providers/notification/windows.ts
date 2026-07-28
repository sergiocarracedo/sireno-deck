import type pino from "pino"

import { type CommandExecutor, withTimeout } from "../shared"
import type { NotificationProvider } from "../notification"

export interface WindowsNotificationDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
  readonly soundPath?: string
}

const DEFAULT_TIMEOUT_MS = 5_000

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "''").replace(/'/g, "'\\''")}'`

// ponytail: raw toast template via PowerShell BurntToast-free path. Sufficient
// for our "Pomodoro done" use case; richer XML templates are out of scope.
const buildToastScript = (title: string, body: string): string => {
  const safeTitle = title.replace(/[`$"\\]/g, "\\$&")
  const safeBody = body.replace(/[`$"\\]/g, "\\$&")
  return [
    "Add-Type -AssemblyName System.Windows.Forms | Out-Null",
    `$balloon = New-Object System.Windows.Forms.NotifyIcon`,
    `$balloon.Icon = [System.Drawing.SystemIcons]::Information`,
    `$balloon.BalloonTipTitle = "${safeTitle}"`,
    `$balloon.BalloonTipText = "${safeBody}"`,
    `$balloon.Visible = $true`,
    `$balloon.ShowBalloonTip(5000)`,
    "Start-Sleep -Milliseconds 5500",
    "$balloon.Dispose()",
  ].join("; ")
}

export const createWindowsNotificationProvider = async (
  deps: WindowsNotificationDeps,
): Promise<NotificationProvider> => {
  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return {
    async notify(args) {
      const script = buildToastScript(args.title, args.body)
      try {
        await withTimeout(
          deps.executor.run("powershell", ["-NoProfile", "-Command", script]),
          timeoutMs,
        )
      } catch (err) {
        deps.logger.warn({ err }, "windows notification: toast failed")
      }

      if (args.sound === true && deps.soundPath !== undefined) {
        try {
          await withTimeout(
            deps.executor.run(
              "powershell",
              [
                "-NoProfile",
                "-Command",
                `(New-Object Media.SoundPlayer '${shellQuote(deps.soundPath)}').PlaySync()`,
              ],
            ),
            timeoutMs,
          )
        } catch (err) {
          deps.logger.warn({ err }, "windows notification: sound playback failed")
        }
      }
    },
  }
}