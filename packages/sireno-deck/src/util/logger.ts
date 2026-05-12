import pino from "pino"

export function createLogger(options?: {
  level?: string
  verbose?: boolean
}): pino.Logger {
  return pino({
    level: options?.verbose ? "debug" : options?.level ?? "info",
    transport: process.stdout.isTTY
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
  })
}
