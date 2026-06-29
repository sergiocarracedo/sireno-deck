import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { ProviderError } from "@/system/provider";

import { createLinuxKeyMacroProvider, type CommandExecutor } from "../linux.ts";

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined;
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger;
};

const makeExecutor = (
  responses:
    | Record<string, { exitCode: number; stdout?: string; stderr?: string }>
    | ((
        tool: string,
        args: ReadonlyArray<string>,
      ) => { exitCode: number; stdout?: string; stderr?: string }),
): {
  executor: CommandExecutor;
  calls: Array<{ tool: string; args: string[] }>;
} => {
  const calls: Array<{ tool: string; args: string[] }> = [];
  const resolve = (
    tool: string,
    args: ReadonlyArray<string>,
  ): { exitCode: number; stdout: string; stderr: string } => {
    const resp =
      typeof responses === "function"
        ? responses(tool, args)
        : (responses[tool] ?? { exitCode: 0, stdout: "" });
    return {
      exitCode: resp.exitCode,
      stdout: resp.stdout ?? "",
      stderr: resp.stderr ?? "",
    };
  };
  const executor: CommandExecutor = {
    async run(tool: string, args: ReadonlyArray<string>) {
      calls.push({ tool, args: [...args] });
      return resolve(tool, args);
    },
  };
  return { executor, calls };
};

const baseEnv = (sessionType?: string): Readonly<Record<string, string>> => {
  const env: Record<string, string> = {};
  if (sessionType !== undefined) env["XDG_SESSION_TYPE"] = sessionType;
  return env;
};

describe("createLinuxKeyMacroProvider", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  it("uses xdotool when found on X11", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/xdotool\n" },
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await provider.sendKey("ctrl+t");
    expect(calls[0]).toEqual({ tool: "which", args: ["xdotool"] });
    expect(calls[1]).toEqual({ tool: "xdotool", args: ["key", "ctrl+t"] });
    await provider.stop();
  });

  it("falls back to ydotool on wayland when xdotool missing", async () => {
    const { executor, calls } = makeExecutor((tool, args) => {
      if (tool === "which" && args[0] === "xdotool") return { exitCode: 1, stdout: "" };
      if (tool === "which" && args[0] === "ydotool")
        return { exitCode: 0, stdout: "/usr/bin/ydotool\n" };
      if (tool === "ydotool") return { exitCode: 0, stdout: "" };
      return { exitCode: 1, stdout: "" };
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("wayland"),
      logger: silentLogger(),
    });
    await provider.sendKey("alt+shift+F4");
    expect(calls.find((c) => c.tool === "ydotool")).toEqual({
      tool: "ydotool",
      args: ["key", "alt+shift+F4"],
    });
    await provider.stop();
  });

  it("returns null provider (throws on sendKey) when no tool found", async () => {
    const { executor } = makeExecutor({
      which: { exitCode: 1, stdout: "" },
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({ code: "NOT_AVAILABLE" });
  });

  it("sendKey literal text uses `type --` syntax with xdotool", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/xdotool\n" },
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await provider.sendKey("hello");
    expect(calls.find((c) => c.tool === "xdotool" && c.args[0] === "type")).toEqual({
      tool: "xdotool",
      args: ["type", "--", "hello"],
    });
    await provider.stop();
  });

  it("sendKey with emoji passes through as literal text", async () => {
    const { executor, calls } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/xdotool\n" },
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await provider.sendKey("😀");
    expect(calls.find((c) => c.tool === "xdotool" && c.args[0] === "type")).toEqual({
      tool: "xdotool",
      args: ["type", "--", "😀"],
    });
    await provider.stop();
  });

  it("throws ProviderError with code EXEC_FAILED when tool exits non-zero", async () => {
    const { executor } = makeExecutor({
      which: { exitCode: 0, stdout: "/usr/bin/xdotool\n" },
      xdotool: { exitCode: 1, stderr: "no such key" },
    });
    const provider = await createLinuxKeyMacroProvider({
      executor,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await expect(provider.sendKey("ctrl+Insert")).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.sendKey("ctrl+Insert")).rejects.toMatchObject({ code: "EXEC_FAILED" });
    await provider.stop();
  });

  it("throws on TIMEOUT when tool takes too long", async () => {
    const slow: CommandExecutor = {
      async run(_tool, _args) {
        await new Promise((r) => setTimeout(r, 1_000));
        return { exitCode: 0, stdout: "", stderr: "" };
      },
    };
    const provider = await createLinuxKeyMacroProvider({
      executor: slow,
      env: baseEnv("x11"),
      logger: silentLogger(),
    });
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(ProviderError);
    await provider.stop();
  });
});
