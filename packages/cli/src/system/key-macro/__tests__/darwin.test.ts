import { describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { ProviderError } from "@/system/provider";

import { createDarwinKeyMacroProvider, type CommandExecutor } from "../darwin";

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
  handler: (
    cmd: string,
    args: ReadonlyArray<string>,
  ) => {
    exitCode: number;
    stdout: string;
    stderr: string;
  },
): CommandExecutor => ({
  async run(cmd: string, args: ReadonlyArray<string>) {
    return handler(cmd, [...args]);
  },
});

describe("createDarwinKeyMacroProvider", () => {
  it("sendKey('ctrl+t') invokes osascript with command down", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createDarwinKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("ctrl+t");
    expect(captured[0]).toBe("-e");
    expect(captured[1]).toContain('keystroke "t"');
    expect(captured[1]).toContain("command down");
    await provider.stop();
  });

  it("sendKey('alt+shift+F4') invokes osascript with multiple mods", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createDarwinKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("alt+shift+F4");
    expect(captured[1]).toContain("option down");
    expect(captured[1]).toContain("shift down");
    expect(captured[1]).toContain('keystroke "F4"');
    await provider.stop();
  });

  it("sendKey('hello') invokes osascript as literal keystroke", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createDarwinKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("hello");
    expect(captured[1]).toContain('keystroke "hello"');
    await provider.stop();
  });

  it("sendKey('😀') invokes osascript with emoji", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "osascript") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createDarwinKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("😀");
    expect(captured[1]).toContain('keystroke "😀"');
    await provider.stop();
  });

  it("osascript non-zero throws ProviderError", async () => {
    const executor = makeExecutor(() => ({ exitCode: 1, stdout: "", stderr: "fail" }));
    const provider = await createDarwinKeyMacroProvider({ executor, logger: silentLogger() });
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({ code: "EXEC_FAILED" });
    await provider.stop();
  });
});
