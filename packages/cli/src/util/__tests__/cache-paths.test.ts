import { existsSync, mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addonNpmInstallPath,
  addonNpmRoot,
  resolveAddonCacheDir,
} from "../cache-paths";

const TEST_DIR = join(tmpdir(), `sireno-deck-2-cache-paths-${process.pid}`);

beforeEach(() => {
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
  mkdirSync(TEST_DIR, { recursive: true });
  process.env["XDG_CACHE_HOME"] = TEST_DIR;
  delete process.env["LOCALAPPDATA"];
});

afterEach(() => {
  delete process.env["XDG_CACHE_HOME"];
  delete process.env["LOCALAPPDATA"];
  if (existsSync(TEST_DIR)) rmSync(TEST_DIR, { recursive: true, force: true });
});

describe("resolveAddonCacheDir", () => {
  it("uses $XDG_CACHE_HOME on linux when set", () => {
    const dir = resolveAddonCacheDir();
    expect(dir).toBe(join(TEST_DIR, "sireno-deck-2"));
    expect(existsSync(dir)).toBe(true);
  });

  it("creates the directory if it does not exist", () => {
    expect(existsSync(join(TEST_DIR, "sireno-deck-2"))).toBe(false);
    const dir = resolveAddonCacheDir();
    expect(existsSync(dir)).toBe(true);
  });
});

describe("addonNpmRoot", () => {
  it("returns <cacheDir>/node_modules", () => {
    expect(addonNpmRoot()).toBe(join(TEST_DIR, "sireno-deck-2", "node_modules"));
  });

  it("respects an explicit cacheDir argument", () => {
    expect(addonNpmRoot("/custom")).toBe("/custom/node_modules");
  });
});

describe("addonNpmInstallPath", () => {
  it("returns <cacheDir>/node_modules/<name>", () => {
    expect(addonNpmInstallPath("my-addon")).toBe(
      join(TEST_DIR, "sireno-deck-2", "node_modules", "my-addon"),
    );
  });

  it("supports scoped packages", () => {
    expect(addonNpmInstallPath("@scope/my-addon")).toBe(
      join(TEST_DIR, "sireno-deck-2", "node_modules", "@scope", "my-addon"),
    );
  });
});
