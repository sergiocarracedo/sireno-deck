import { Writable } from "node:stream";

import pino, { type Logger, type LoggerOptions, type SerializedError } from "pino";

export interface CreateLoggerOptions {
  level?: LoggerOptions["level"];
  verbose?: boolean;
  json?: boolean;
}

const RESET = "\u001b[0m";
const DIM = "\u001b[2m";
const RED = "\u001b[31m";
const YELLOW = "\u001b[33m";
const CYAN = "\u001b[36m";
const MAGENTA = "\u001b[35m";
const GRAY = "\u001b[90m";

const LEVEL_COLOR: Record<number, string> = {
  10: GRAY,
  20: GRAY,
  30: CYAN,
  40: YELLOW,
  50: RED,
  60: RED,
};

const LEVEL_LABEL: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

const colorize = (color: string, text: string): string =>
  process.stdout.isTTY ? `${color}${text}${RESET}` : text;

const CONTEXT_FIELDS = [
  "frontendUrl",
  "wsUrl",
  "tool",
  "sessionType",
  "platform",
  "executor",
  "deckId",
  "position",
  "gesture",
  "host",
  "port",
] as const;

const formatContext = (entry: Record<string, unknown>): string[] => {
  const lines: string[] = [];
  for (const key of CONTEXT_FIELDS) {
    const value = entry[key];
    if (value === undefined || value === null) continue;
    const display = typeof value === "string" ? value : JSON.stringify(value);
    if (display.length === 0) continue;
    lines.push(`  ${colorize(DIM, `${key}:`)} ${display}`);
  }
  return lines;
};

const formatHuman = (jsonLine: string): string | null => {
  let entry: Record<string, unknown>;
  try {
    entry = JSON.parse(jsonLine) as Record<string, unknown>;
  } catch {
    return jsonLine;
  }
  const levelNum = typeof entry["level"] === "number" ? entry["level"] : 30;
  const level = LEVEL_LABEL[levelNum] ?? "INFO";
  const levelColor = LEVEL_COLOR[levelNum] ?? CYAN;
  const msg = typeof entry["msg"] === "string" ? entry["msg"] : "";
  const time =
    typeof entry["time"] === "number"
      ? new Date(entry["time"]).toISOString().slice(11, 19)
      : "";
  const tool =
    typeof entry["provider"] === "string"
      ? entry["provider"]
      : typeof entry["component"] === "string"
        ? entry["component"]
        : typeof entry["name"] === "string"
          ? entry["name"]
          : "";
  const err = entry["err"];
  let errLine = "";
  if (err !== null && typeof err === "object") {
    const e = err as { type?: unknown; message?: unknown };
    const errType = typeof e.type === "string" ? e.type : "Error";
    const errMsg = typeof e.message === "string" ? e.message : "";
    if (errMsg.length > 0) {
      errLine = `\n  ${colorize(RED, `${errType}: ${errMsg}`)}`;
    }
  }
  const tag = colorize(MAGENTA, tool.length > 0 ? `(${tool})` : "");
  const head = colorize(levelColor, level.padEnd(5));
  const ts = colorize(DIM, time.length > 0 ? `${time} ` : "");
  const contextLines = formatContext(entry);
  const contextBlock = contextLines.length > 0 ? `\n${contextLines.join("\n")}` : "";
  return `${ts}${head} ${tag} ${msg}${errLine}${contextBlock}`.trimEnd();
};

class HumanWritable extends Writable {
  override _write(
    chunk: Buffer | string,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    const text = typeof chunk === "string" ? chunk : chunk.toString("utf8");
    const lines = text.split("\n");
    for (const line of lines) {
      if (line.length === 0) continue;
      const formatted = formatHuman(line);
      if (formatted !== null) {
        process.stdout.write(`${formatted}\n`);
      }
    }
    callback();
  }
}

const errorSerializer = (err: Error & { issues?: unknown; type?: string }): SerializedError => {
  const out = {
    type: err.name || "Error",
    message: err.message,
    stack: process.env["SIRENO_LOG_VERBOSE"] === "1" ? (err.stack ?? "") : "",
    raw: err,
  };
  if (err.type !== undefined) (out as { type?: string }).type = err.type;
  if (err.issues !== undefined) (out as { issues?: unknown }).issues = err.issues;
  return out as SerializedError;
};

export const createLogger = (options: CreateLoggerOptions = {}): Logger => {
  const { level, verbose = false, json = false } = options;

  if (verbose) process.env["SIRENO_LOG_VERBOSE"] = "1";
  if (json) process.env["SIRENO_LOG_JSON"] = "1";

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

  if (json) {
    return pino(loggerOptions);
  }

  return pino(loggerOptions, new HumanWritable());
};