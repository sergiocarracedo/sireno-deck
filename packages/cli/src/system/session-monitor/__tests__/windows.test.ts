import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { createWindowsSessionProvider, type CommandExecutor } from "../windows.ts";

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

describe("createWindowsSessionProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initial state locked when logonui running", async () => {
    const executor = makeExecutor(() => ({ exitCode: 0, stdout: "true", stderr: "" }));
    const provider = await createWindowsSessionProvider({ executor, logger: silentLogger() });
    expect(provider.getState()).toBe("locked");
    await provider.stop();
  });

  it("initial state unlocked when logonui not running", async () => {
    const executor = makeExecutor(() => ({ exitCode: 0, stdout: "false", stderr: "" }));
    const provider = await createWindowsSessionProvider({ executor, logger: silentLogger() });
    expect(provider.getState()).toBe("unlocked");
    await provider.stop();
  });

  it("subscriber fires on state change", async () => {
    let first = true;
    const executor: CommandExecutor = {
      async run() {
        const v = first ? "false" : "true";
        first = false;
        return { exitCode: 0, stdout: v, stderr: "" };
      },
    };
    const provider = await createWindowsSessionProvider({
      executor,
      logger: silentLogger(),
      pollIntervalMs: 100,
    });
    const handler = vi.fn();
    provider.subscribe(handler);
    await vi.advanceTimersByTimeAsync(200);
    expect(handler).toHaveBeenCalled();
    await provider.stop();
  });

  it("stop halts polling", async () => {
    const executor = makeExecutor(() => ({ exitCode: 0, stdout: "false", stderr: "" }));
    const provider = await createWindowsSessionProvider({ executor, logger: silentLogger() });
    await provider.stop();
  });
});
