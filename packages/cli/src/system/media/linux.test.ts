import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import { ProviderError } from "@/system/provider";

import { createLinuxMediaProvider, type CommandExecutor } from "./linux.ts";

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
  handler: (cmd: string, args: ReadonlyArray<string>) => {
    exitCode: number;
    stdout: string;
    stderr: string;
  },
): CommandExecutor => ({
  async run(cmd, args) {
    return handler(cmd, [...args]);
  },
});

describe("createLinuxMediaProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("returns null provider when playerctl not on PATH", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "which") return { exitCode: 1, stdout: "", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createLinuxMediaProvider({ executor, logger: silentLogger() });
    await expect(provider.play()).rejects.toBeInstanceOf(ProviderError);
    await provider.stop();
  });

  it("play() invokes playerctl play", async () => {
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "which" && args[0] === "playerctl") return { exitCode: 0, stdout: "/usr/bin/playerctl", stderr: "" };
      if (cmd === "playerctl" && args[0] === "play") return { exitCode: 0, stdout: "", stderr: "" };
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createLinuxMediaProvider({ executor, logger: silentLogger() });
    await provider.play();
    await provider.stop();
  });

  it("getCurrent() parses playerctl metadata", async () => {
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "which" && args[0] === "playerctl") return { exitCode: 0, stdout: "/usr/bin/playerctl", stderr: "" };
      if (cmd === "playerctl" && args[0] === "metadata") {
        return {
          exitCode: 0,
          stdout: "Time\tPink Floyd\tDark Side of the Moon\thttps://example.com/art.png",
          stderr: "",
        };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createLinuxMediaProvider({ executor, logger: silentLogger() });
    const meta = await provider.getCurrent();
    expect(meta).toEqual({
      title: "Time",
      artist: "Pink Floyd",
      album: "Dark Side of the Moon",
      artUrl: "https://example.com/art.png",
    });
    await provider.stop();
  });

  it("getCurrent() returns null on empty output", async () => {
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "which" && args[0] === "playerctl") return { exitCode: 0, stdout: "/usr/bin/playerctl", stderr: "" };
      if (cmd === "playerctl" && args[0] === "metadata") return { exitCode: 1, stdout: "", stderr: "no player" };
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createLinuxMediaProvider({ executor, logger: silentLogger() });
    const meta = await provider.getCurrent();
    expect(meta).toBeNull();
    await provider.stop();
  });

  it("onChange handler fires when metadata changes", async () => {
    let callCount = 0;
    const executor = makeExecutor((cmd, args) => {
      if (cmd === "which" && args[0] === "playerctl") return { exitCode: 0, stdout: "/usr/bin/playerctl", stderr: "" };
      if (cmd === "playerctl" && args[0] === "metadata") {
        callCount += 1;
        if (callCount === 1) return { exitCode: 0, stdout: "T1\tA1\tAl1\t", stderr: "" };
        return { exitCode: 0, stdout: "T2\tA2\tAl2\t", stderr: "" };
      }
      return { exitCode: 0, stdout: "", stderr: "" };
    });
    const provider = await createLinuxMediaProvider({ executor, logger: silentLogger() });
    const handler = vi.fn();
    provider.onChange(handler);
    await vi.advanceTimersByTimeAsync(5_000);
    expect(handler).toHaveBeenCalled();
    await provider.stop();
  });
});
