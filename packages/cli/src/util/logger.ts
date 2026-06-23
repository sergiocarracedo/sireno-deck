import pino, { type Logger, type LoggerOptions, type SerializedError } from "pino";

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"];
  verbose?: boolean;
}

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const { level, verbose = false } = options;

  const errorSerializer = (err: Error & { issues?: unknown; type?: string }): SerializedError => {
    const out = {
      type: err.name || "Error",
      message: err.message,
      stack: verbose ? (err.stack ?? "") : "",
      raw: err,
    };
    if (err.type !== undefined) (out as { type?: string }).type = err.type;
    if (err.issues !== undefined) (out as { issues?: unknown }).issues = err.issues;
    return out as SerializedError;
  };

  const loggerOptions: LoggerOptions = {
    name: "sireno-deck-2",
    level: level ?? (verbose ? "debug" : "info"),
    serializers: {
      err: errorSerializer,
    },
    redact: {
      paths: ["err.raw"],
      censor: "[hidden]",
    },
  };

  return pino(loggerOptions);
};
