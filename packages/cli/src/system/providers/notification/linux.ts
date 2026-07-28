import type pino from "pino"

import { type CommandExecutor, withTimeout } from "../shared"
import type { NotificationProvider } from "../notification"

export interface LinuxNotificationDeps {
  readonly executor: CommandExecutor
  readonly logger: pino.Logger
  readonly timeoutMs?: number
  readonly extraFsProbe?: (tool: string) => boolean
  readonly soundPath?: string
}

const NOTIFY_SEND_TOOL = "notify-send"
const FFPLAY_TOOL = "ffplay"
const PAPLAY_TOOL = "paplay"
const DEFAULT_TIMEOUT_MS = 2_000
const SOUND_TIMEOUT_MS = 5_000

const probeTool = async (
  executor: CommandExecutor,
  tool: string,
  extraFsProbe?: (tool: string) => boolean,
): Promise<boolean> => {
  const result = await executor.run("which", [tool])
  if (result.exitCode === 0 && result.stdout.trim().length > 0) return true
  return extraFsProbe?.(tool) === true
}

const shellQuote = (value: string): string =>
  `'${value.replace(/'/g, "'\\''")}'`

export const createLinuxNotificationProvider = async (
  deps: LinuxNotificationDeps,
): Promise<NotificationProvider> => {
  const notifySendOk = await probeTool(
    deps.executor,
    NOTIFY_SEND_TOOL,
    deps.extraFsProbe,
  )
  if (!notifySendOk) {
    deps.logger.warn(
      {},
      "linux notification: notify-send not found; notify() will be a no-op",
    )
    return {
      async notify() {
        return
      },
    }
  }

  const ffplayOk = await probeTool(
    deps.executor,
    FFPLAY_TOOL,
    deps.extraFsProbe,
  )
  const paplayOk =
    !ffplayOk &&
    (await probeTool(deps.executor, PAPLAY_TOOL, deps.extraFsProbe))
  const soundTool: string | null = ffplayOk
    ? FFPLAY_TOOL
    : paplayOk
      ? PAPLAY_TOOL
      : null

  const timeoutMs = deps.timeoutMs ?? DEFAULT_TIMEOUT_MS

  return {
    async notify(args) {
      const sendArgs = [
        "-t",
        "5000",
        shellQuote(args.title),
        shellQuote(args.body),
      ]
      try {
        const result = await withTimeout(
          deps.executor.run(NOTIFY_SEND_TOOL, sendArgs),
          timeoutMs,
        )
        if (result.exitCode !== 0) {
          deps.logger.warn(
            { stderr: result.stderr.trim() },
            "linux notification: notify-send returned non-zero",
          )
        }
      } catch (err) {
        deps.logger.warn({ err }, "linux notification: notify-send failed")
      }

      if (
        args.sound === true &&
        deps.soundPath !== undefined &&
        soundTool !== null
      ) {
        try {
          await withTimeout(
            deps.executor.run(soundTool, [
              "-nodisp",
              "-autoexit",
              deps.soundPath,
            ]),
            SOUND_TIMEOUT_MS,
          )
        } catch (err) {
          deps.logger.warn(
            { err, tool: soundTool },
            "linux notification: sound playback failed",
          )
        }
      }
    },
  }
}
