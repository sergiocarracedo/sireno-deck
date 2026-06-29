import { describe, expect, it } from "vitest";

import { getHostContext } from "@/deck/host-context.ts";

import { ActionError, createActionExecutor } from "../executor.ts";

const host = getHostContext();
const executor = createActionExecutor({ host });

describe("createActionExecutor", () => {
  it("runs echo hello and returns stdout", async () => {
    const result = await executor.run("echo hello");
    expect(result.stdout.trim()).toBe("hello");
    expect(result.exitCode).toBe(0);
  });

  it("returns exit code 1 for failing command", async () => {
    const result = await executor.run("exit 1");
    expect(result.exitCode).toBe(1);
  });

  it("interpolates {{ host.username }}", async () => {
    const result = await executor.run(`echo "user={{ host.username }}"`);
    expect(result.stdout.trim()).toBe(`user=${host.userInfo.username}`);
  });

  it("interpolates {{ host.platform }}", async () => {
    const result = await executor.run(`echo "platform={{ host.platform }}"`);
    expect(result.stdout.trim()).toBe(`platform=${host.platform}`);
  });

  it("throws ActionError for unknown host placeholder", async () => {
    await expect(executor.run("echo {{ host.unknown }}")).rejects.toBeInstanceOf(ActionError);
  });

  it("captures stderr separately", async () => {
    const result = await executor.run("echo err 1>&2");
    expect(result.stderr.trim()).toBe("err");
    expect(result.stdout).toBe("");
  });

  it("measures durationMs > 0", async () => {
    const result = await executor.run("sleep 0.05");
    expect(result.durationMs).toBeGreaterThanOrEqual(40);
  });
});
