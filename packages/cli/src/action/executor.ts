import { execa } from "execa";

import { getOriginalCwd } from "@/cli/cwd.ts";
import type { HostContext } from "@/deck/host-context.ts";

export interface ActionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export class ActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ActionError";
  }
}

export interface ActionExecutorOptions {
  cwd?: string;
  env?: Readonly<Record<string, string>>;
}

export interface ActionExecutor {
  run(command: string, options?: ActionExecutorOptions): Promise<ActionResult>;
}

const PLACEHOLDER_RE = /\{\{\s*host\.([a-zA-Z]+)\s*\}\}/g;

const KNOWN_HOST_KEYS: ReadonlySet<keyof HostContext | string> = new Set([
  "hostname",
  "platform",
  "username",
  "homedir",
  "arch",
]);

const interpolate = (command: string, host: HostContext): string => {
  const remaining = new Set<string>();
  const replaced = command.replace(PLACEHOLDER_RE, (_match, key: string) => {
    if (!KNOWN_HOST_KEYS.has(key)) {
      remaining.add(key);
      return `{{ host.${key} }}`;
    }
    if (key === "hostname") return host.hostname;
    if (key === "platform") return host.platform;
    if (key === "arch") return host.arch;
    if (key === "username") return host.userInfo.username;
    if (key === "homedir") return host.userInfo.homedir;
    return `{{ host.${key} }}`;
  });
  if (remaining.size > 0) {
    throw new ActionError(
      `Unknown host placeholder(s): ${[...remaining].map((k) => `{{ host.${k} }}`).join(", ")}`,
    );
  }
  return replaced;
};

export interface CreateActionExecutorOptions {
  host: HostContext;
}

export const createActionExecutor = (options: CreateActionExecutorOptions): ActionExecutor => {
  const run = async (
    command: string,
    runOptions: ActionExecutorOptions = {},
  ): Promise<ActionResult> => {
    const interpolated = interpolate(command, options.host);
    const cwd = runOptions.cwd ?? getOriginalCwd();
    const env = runOptions.env ? { ...process.env, ...runOptions.env } : process.env;
    const started = Date.now();
    const result = await execa("/bin/sh", ["-c", interpolated], {
      cwd,
      env,
      reject: false,
      all: false,
    });
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      exitCode: result.exitCode ?? -1,
      durationMs: Date.now() - started,
    };
  };

  return { run };
};
