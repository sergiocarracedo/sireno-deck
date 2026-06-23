import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { spawnViteServer, type ViteServerHandle } from "./vite-server.ts";

let server: ViteServerHandle | null = null;
let tmpDir = "";

afterEach(async () => {
  if (server !== null) {
    await server.stop();
    server = null;
  }
  if (tmpDir) {
    rmSync(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

const writeEchoServer = (): { command: string; args: string[] } => {
  tmpDir = mkdtempSync(join(tmpdir(), "sireno-vite-test-"));
  const script = join(tmpDir, "echo.js");
  writeFileSync(
    script,
    [
      "process.stdout.write('READY 54321\\n');",
      "setInterval(() => process.stdout.write('tick\\n'), 1000);",
      "",
    ].join("\n"),
    "utf8",
  );
  return { command: process.execPath, args: [script] };
};

describe("spawnViteServer", () => {
  it("emits ready and captures port from READY line", async () => {
    const { command, args } = writeEchoServer();
    server = await spawnViteServer({ command, args, cwd: tmpDir });
    expect(server.port).toBe(54321);
    expect(server.pid).not.toBeNull();
  });

  it("rejects when process exits before READY", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "sireno-vite-test-"));
    const script = join(tmpDir, "fail.js");
    writeFileSync(script, "process.exit(1);", "utf8");
    await expect(
      spawnViteServer({ command: process.execPath, args: [script], cwd: tmpDir }),
    ).rejects.toThrow(/exited/);
  });

  it("emits stdout events", async () => {
    const { command, args } = writeEchoServer();
    server = await spawnViteServer({ command, args, cwd: tmpDir });
    const stdout = await new Promise<string>((resolve) => {
      server!.emitter.once("stdout", (chunk: string) => resolve(chunk));
    });
    expect(stdout.length).toBeGreaterThan(0);
  });

  it("stop kills the process", async () => {
    const { command, args } = writeEchoServer();
    server = await spawnViteServer({ command, args, cwd: tmpDir });
    const pid = server.pid!;
    await server.stop();
    server = null;
    await new Promise<void>((resolve) => setTimeout(resolve, 100));
    let stillUp = true;
    try {
      process.kill(pid, 0);
    } catch {
      stillUp = false;
    }
    expect(stillUp).toBe(false);
  });

  it("restarts on crash after READY (up to maxRestarts)", async () => {
    tmpDir = mkdtempSync(join(tmpdir(), "sireno-vite-test-"));
    const script = join(tmpDir, "crash.js");
    writeFileSync(
      script,
      [
        "process.stdout.write('READY 12345\\n');",
        "setTimeout(() => process.exit(2), 100);",
        "",
      ].join("\n"),
      "utf8",
    );
    const emitter = await new Promise<import("node:events").EventEmitter>((resolve, reject) => {
      spawnViteServer({
        command: process.execPath,
        args: [script],
        cwd: tmpDir,
        maxRestarts: 2,
        restartBackoffMs: [50, 50],
      })
        .then((h) => {
          resolve(h.emitter);
        })
        .catch(reject);
    });
    const restartCount = await new Promise<number>((resolve) => {
      let count = 0;
      emitter.on("restart", () => {
        count += 1;
        if (count >= 1) resolve(count);
      });
      setTimeout(() => resolve(count), 1000);
    });
    expect(restartCount).toBeGreaterThanOrEqual(1);
  });
});
