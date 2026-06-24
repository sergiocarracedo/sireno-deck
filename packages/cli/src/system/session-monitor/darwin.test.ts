import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { createDarwinSessionProvider, type CommandExecutor } from "./darwin.ts";

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

const makeExecutor = (responses: Map<string, { exitCode: number; stdout: string }>): CommandExecutor => ({
  async run(_cmd: string, _args: ReadonlyArray<string>) {
    const r = responses.get("loginwindow") ?? { exitCode: 1, stdout: "" };
    return { exitCode: r.exitCode, stdout: r.stdout, stderr: "" };
  },
});

describe("createDarwinSessionProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initial state reflects osascript loginwindow running=true → locked", async () => {
    const executor = makeExecutor(new Map([["loginwindow", { exitCode: 0, stdout: "true" }]]));
    const provider = await createDarwinSessionProvider({ executor, logger: silentLogger() });
    expect(provider.getState()).toBe("locked");
    await provider.stop();
  });

  it("initial state unlocked when loginwindow not running", async () => {
    const executor = makeExecutor(new Map([["loginwindow", { exitCode: 0, stdout: "false" }]]));
    const provider = await createDarwinSessionProvider({ executor, logger: silentLogger() });
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
    const provider = await createDarwinSessionProvider({ executor, logger: silentLogger(), pollIntervalMs: 100 });
    const handler = vi.fn();
    provider.subscribe(handler);
    await vi.advanceTimersByTimeAsync(200);
    expect(handler).toHaveBeenCalled();
    await provider.stop();
  });

  it("stop() halts the polling interval", async () => {
    const executor = makeExecutor(new Map([["loginwindow", { exitCode: 0, stdout: "false" }]]));
    const provider = await createDarwinSessionProvider({ executor, logger: silentLogger() });
    await provider.stop();
  });
});
