import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "@/util/logger";

import { status } from "../status";

const silentLogger = () => createLogger({ level: "silent" });

const TEST_DIR = join(tmpdir(), `sireno-deck-2-status-test-${process.pid}`);

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  process.env["XDG_RUNTIME_DIR"] = TEST_DIR;
});

afterEach(() => {
  delete process.env["XDG_RUNTIME_DIR"];
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("status", () => {
  it("reports not running when pid file is missing", async () => {
    const logger = silentLogger();
    const infoSpy = vi.spyOn(logger, "info");
    await status({ logger });
    expect(infoSpy).toHaveBeenCalledWith("daemon is not running");
  });

  it("reports stale pid file with no other artifacts", async () => {
    writeFileSync(join(TEST_DIR, "sireno-deck-2.pid"), "99999999\n", "utf8");
    const logger = silentLogger();
    const warnSpy = vi.spyOn(logger, "warn");
    await status({ logger });
    expect(warnSpy).toHaveBeenCalledWith({ pid: 99999999 }, "stale pid file found");
  });

  it("reports running daemon with token preview + children", async () => {
    const pid = process.pid;
    writeFileSync(join(TEST_DIR, "sireno-deck-2.pid"), `${pid}\n`, "utf8");
    writeFileSync(join(TEST_DIR, "sireno-deck-2.token"), "abcdefghijklmnopqrstuv\n", "utf8");
    writeFileSync(
      join(TEST_DIR, "sireno-deck-2.children.json"),
      JSON.stringify({ pids: [100, 200, 300] }),
      "utf8",
    );

    const logger = silentLogger();
    const infoSpy = vi.spyOn(logger, "info");

    await status({ logger });

    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ pid }),
      "daemon is running",
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tokenPreview: expect.any(String), tokenLen: expect.any(Number) }),
      "token present",
    );
    expect(infoSpy).toHaveBeenCalledWith(
      expect.objectContaining({ count: 3, pids: [100, 200, 300] }),
      "tracked children",
    );
  });

  it("warns when token file is missing for a running daemon", async () => {
    const pid = process.pid;
    writeFileSync(join(TEST_DIR, "sireno-deck-2.pid"), `${pid}\n`, "utf8");

    const logger = silentLogger();
    const warnSpy = vi.spyOn(logger, "warn");

    await status({ logger });

    expect(warnSpy).toHaveBeenCalledWith("token file missing or empty");
  });

  it("reports no children when children file is missing", async () => {
    const pid = process.pid;
    writeFileSync(join(TEST_DIR, "sireno-deck-2.pid"), `${pid}\n`, "utf8");

    const logger = silentLogger();
    const infoSpy = vi.spyOn(logger, "info");

    await status({ logger });

    expect(infoSpy).toHaveBeenCalledWith("no tracked children");
  });
});
