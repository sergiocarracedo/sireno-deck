import pino, { type Logger, type LoggerOptions } from "pino";

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"];
  verbose?: boolean;
}

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const { level, verbose = false } = options;

  const loggerOptions: LoggerOptions = {
    name: "sireno-deck-2",
    level: level ?? (verbose ? "debug" : "info"),
  };

  return pino(loggerOptions);
};
