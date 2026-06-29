import { describe, expect, it, vi } from "vitest";

import type pino from "pino";

import type { CommandExecutor } from "@/system/active-app/linux";

import { createWindowsActiveAppProvider } from "../windows.ts";

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

describe("createWindowsActiveAppProvider", () => {
  it("parses PowerShell output into ActiveAppSnapshot", async () => {
    const executor = makeExecutor((cmd) => {
      if (cmd === "powershell") return { exitCode: 0, stdout: "Google Chrome|1234", stderr: "" };
      return { exitCode: 1, stdout: "", stderr: "" };
    });
    const provider = await createWindowsActiveAppProvider({ executor, logger: silentLogger() });
    const snap = await provider.getActive();
    expect(snap).toEqual({ name: "Google Chrome", windowTitle: "Google Chrome", processId: 1234 });
    await provider.stop();
  });

  it("returns last snapshot on failure", async () => {
    let first = true;
    const executor: CommandExecutor = {
      async run() {
        if (first) return { exitCode: 0, stdout: "App|1", stderr: "" };
        first = false;
        return { exitCode: 1, stdout: "", stderr: "fail" };
      },
    };
    const provider = await createWindowsActiveAppProvider({ executor, logger: silentLogger() });
    const snap1 = await provider.getActive();
    expect(snap1?.name).toBe("App");
    const snap2 = await provider.getActive();
    expect(snap2?.name).toBe("App");
    await provider.stop();
  });

  it("returns null on empty output", async () => {
    const executor = makeExecutor(() => ({ exitCode: 0, stdout: "", stderr: "" }));
    const provider = await createWindowsActiveAppProvider({ executor, logger: silentLogger() });
    expect(await provider.getActive()).toBeNull();
    await provider.stop();
  });

  it("stop clears interval", async () => {
    const executor = makeExecutor(() => ({ exitCode: 0, stdout: "", stderr: "" }));
    const provider = await createWindowsActiveAppProvider({ executor, logger: silentLogger() });
    await provider.stop();
  });
});
