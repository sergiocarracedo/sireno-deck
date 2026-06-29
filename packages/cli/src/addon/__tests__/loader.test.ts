import { mkdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { addonNpmInstallPath } from "@/util/cache-paths.ts";
import { SIRENO_ADDON_API_VERSION } from "@/addon/api-types.ts";

vi.mock("execa", () => ({
  execa: vi.fn(),
}));

import { execa } from "execa";

const silentLogger = () => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
  fatal: () => undefined,
  child: () => silentLogger(),
  level: "silent" as const,
});

const TEST_CACHE = join(tmpdir(), `sireno-deck-2-loader-test-${process.pid}`);

const writeFakePackage = (
  packageName: string,
  apiVersion: number,
  exportsDefault: boolean,
): void => {
  const installPath = addonNpmInstallPath(packageName, TEST_CACHE);
  mkdirSync(installPath, { recursive: true });
  writeFileSync(
    join(installPath, "package.json"),
    JSON.stringify({
      name: packageName,
      version: "1.0.0",
      main: "index.js",
      sirenoAddonApiVersion: apiVersion,
    }),
    "utf8",
  );
  const code = exportsDefault
    ? `module.exports.default = { apiVersion: ${apiVersion}, name: "fake", buttons: [] };`
    : `module.exports = { apiVersion: ${apiVersion}, name: "fake", buttons: [] };`;
  writeFileSync(join(installPath, "index.js"), code, "utf8");
};

beforeEach(() => {
  if (existsSync(TEST_CACHE)) rmSync(TEST_CACHE, { recursive: true, force: true });
  mkdirSync(TEST_CACHE, { recursive: true });
  process.env["XDG_CACHE_HOME"] = TEST_CACHE;
  delete process.env["LOCALAPPDATA"];
  vi.clearAllMocks();
});

afterEach(() => {
  delete process.env["XDG_CACHE_HOME"];
  delete process.env["LOCALAPPDATA"];
  if (existsSync(TEST_CACHE)) rmSync(TEST_CACHE, { recursive: true, force: true });
});

const loader = async () => (await import("../loader.ts")).loadAddons;

describe("loadAddons — npm path", () => {
  it("loads a cached npm addon without calling npm install", async () => {
    writeFakePackage("cached-addon", SIRENO_ADDON_API_VERSION, false);
    const loadAddons = await loader();
    const result = await loadAddons({
      entries: ["cached-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    });
    expect(result.addons).toHaveLength(1);
    expect(result.addons[0]?.source.kind).toBe("npm");
    expect(vi.mocked(execa)).not.toHaveBeenCalled();
  });

  it("calls npm install when the package is not cached", async () => {
    vi.mocked(execa).mockImplementation(async () => {
      writeFakePackage("uncached-addon", SIRENO_ADDON_API_VERSION, false);
      return {} as never;
    });

    const loadAddons = await loader();
    await loadAddons({
      entries: ["uncached-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    });

    expect(vi.mocked(execa)).toHaveBeenCalledTimes(1);
    const args = vi.mocked(execa).mock.calls[0]?.[1] as string[] | undefined;
    expect(args?.[0]).toBe("install");
    expect(args).toContain("uncached-addon");
    expect(args).toContain("--prefix");
    expect(args).toContain(TEST_CACHE);
    expect(args).toContain("--no-save");
  });

  it("records an error and continues when npm install fails", async () => {
    vi.mocked(execa).mockRejectedValue(new Error("network unreachable"));
    const loadAddons = await loader();
    const result = await loadAddons({
      entries: ["broken-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    });
    expect(result.addons).toHaveLength(0);
    expect(result.issues.some((i) => /npm install failed/.test(i.message))).toBe(true);
  });

  it("records error for npm specifier when cacheDir is missing", async () => {
    const loadAddons = await loader();
    const result = await loadAddons({
      entries: ["some-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(0);
    expect(result.issues.some((i) => /Unknown addon spec/.test(i.message))).toBe(true);
  });

  it("warns on apiVersion mismatch but still loads", async () => {
    writeFakePackage("future-addon", 99, false);
    const loadAddons = await loader();
    const result = await loadAddons({
      entries: ["future-addon"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
      cacheDir: TEST_CACHE,
    });
    expect(result.addons).toHaveLength(1);
    expect(result.issues.some((i) => /apiVersion mismatch/.test(i.message))).toBe(true);
  });
});

void silentLogger;
