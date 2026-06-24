import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { createWindowsMediaProvider, type CommandExecutor } from "./windows.ts";

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

describe("createWindowsMediaProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("play() invokes powershell with TryPlayAsync", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsMediaProvider({ executor, logger: silentLogger() });
    await provider.play();
    expect(captured[2]).toContain("TryPlayAsync");
    await provider.stop();
  });

  it("pause() invokes powershell with pause", async () => {
    let captured: string[] = [];
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "powershell") captured = [...args];
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsMediaProvider({ executor, logger: silentLogger() });
    await provider.pause();
    expect(captured[2]).toContain("pause");
    await provider.stop();
  });

  it("getCurrent() parses SMTC metadata", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "powershell")
        return { exitCode: 0, stdout: "Time|Pink Floyd|Dark Side of the Moon", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createWindowsMediaProvider({ executor, logger: silentLogger() });
    const meta = await provider.getCurrent();
    expect(meta).toEqual({
      title: "Time",
      artist: "Pink Floyd",
      album: "Dark Side of the Moon",
      artUrl: null,
    });
    await provider.stop();
  });

  it("getCurrent() returns null on empty output", async () => {
    const executor = makeExecutor(() => ({ exitCode: 1, stdout: "", stderr: "no media" }));
    const provider = await createWindowsMediaProvider({ executor, logger: silentLogger() });
    expect(await provider.getCurrent()).toBeNull();
    await provider.stop();
  });

  it("onChange handler fires on track change", async () => {
    let callCount = 0;
    const executor = makeExecutor(() => {
      callCount += 1;
      if (callCount === 1) return { exitCode: 0, stdout: "T1|A1|Al1", stderr: "" };
      return { exitCode: 0, stdout: "T2|A2|Al2", stderr: "" };
    });
    const provider = await createWindowsMediaProvider({
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    });
    const handler = vi.fn();
    provider.onChange(handler);
    await vi.advanceTimersByTimeAsync(300);
    expect(handler).toHaveBeenCalled();
    await provider.stop();
  });
});
