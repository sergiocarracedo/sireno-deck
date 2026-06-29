import { describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { ProviderError } from "@/system/provider";

import { createWindowsKeyMacroProvider, type CommandExecutor } from "../windows";

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
  ) => { exitCode: number; stdout: string; stderr: string },
): CommandExecutor => ({
  async run(cmd: string, args: ReadonlyArray<string>) {
    return handler(cmd, [...args]);
  },
});

describe("createWindowsKeyMacroProvider", () => {
  it("sendKey('ctrl+t') invokes PowerShell with ^t", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("ctrl+t");
    expect(captured[0]).toBe("-NoProfile");
    expect(captured[1]).toBe("-Command");
    expect(captured[2]).toContain("^t");
    expect(captured[2]).toContain("SendWait");
    await provider.stop();
  });

  it("sendKey('alt+shift+F4') invokes PowerShell with %+{F4}", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("alt+shift+F4");
    expect(captured[2]).toContain("%+{F4}");
    await provider.stop();
  });

  it("sendKey('Return') invokes PowerShell with {ENTER}", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("Return");
    expect(captured[2]).toContain("{ENTER}");
    await provider.stop();
  });

  it("sendKey('hello') invokes PowerShell as literal text", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsKeyMacroProvider({ executor, logger: silentLogger() });
    await provider.sendKey("hello");
    expect(captured[2]).toContain("hello");
    await provider.stop();
  });

  it("powershell non-zero throws ProviderError", async () => {
    const executor = makeExecutor(() => ({ exitCode: 1, stdout: "", stderr: "fail" }));
    const provider = await createWindowsKeyMacroProvider({ executor, logger: silentLogger() });
    await expect(provider.sendKey("ctrl+t")).rejects.toBeInstanceOf(ProviderError);
    await expect(provider.sendKey("ctrl+t")).rejects.toMatchObject({ code: "EXEC_FAILED" });
    await provider.stop();
  });
});
