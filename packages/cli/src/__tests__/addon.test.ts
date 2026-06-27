import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  AddonRegistry,
  isLocalAddonSpec,
  loadAddons,
  normalizeAddonEntry,
  readManifest,
  resolveLocalAddonRoot,
} from "@/addon";
import { SIRENO_ADDON_API_VERSION } from "@/addon";

const tempRoots: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "sireno-addon-"));
  tempRoots.push(dir);
  return dir;
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("isLocalAddonSpec", () => {
  it("detects ./ and ../", () => {
    expect(isLocalAddonSpec("./my-addon")).toBe(true);
    expect(isLocalAddonSpec("../shared/my-addon")).toBe(true);
  });

  it("detects absolute paths", () => {
    expect(isLocalAddonSpec("/abs/my-addon")).toBe(true);
  });

  it("detects home paths", () => {
    expect(isLocalAddonSpec("~/addons/x")).toBe(true);
  });

  it("detects paths with separators", () => {
    expect(isLocalAddonSpec("addons/local")).toBe(true);
    expect(isLocalAddonSpec("foo\\bar")).toBe(true);
  });

  it("treats bare names and @scoped as npm", () => {
    expect(isLocalAddonSpec("core-buttons")).toBe(false);
    expect(isLocalAddonSpec("@me/my-addon")).toBe(false);
    expect(isLocalAddonSpec("@me/my-addon@1.2.3")).toBe(false);
  });
});

describe("normalizeAddonEntry", () => {
  it("normalizes a string entry", () => {
    expect(normalizeAddonEntry("core-buttons")).toEqual({
      enabled: true,
      source: "core-buttons",
      isLocal: false,
    });
    expect(normalizeAddonEntry("./local")).toEqual({
      enabled: true,
      source: "./local",
      isLocal: true,
    });
  });

  it("normalizes an object entry with default enabled", () => {
    expect(normalizeAddonEntry({ source: "./x" })).toEqual({
      enabled: true,
      source: "./x",
      isLocal: true,
    });
    expect(normalizeAddonEntry({ source: "core-buttons", enabled: false })).toEqual({
      enabled: false,
      source: "core-buttons",
      isLocal: false,
    });
  });
});

describe("resolveLocalAddonRoot", () => {
  it("returns absolute paths unchanged", () => {
    expect(resolveLocalAddonRoot("/abs/path", "/tmp", "/home/me")).toBe("/abs/path");
  });

  it("resolves relative paths against configDir", () => {
    expect(resolveLocalAddonRoot("./my-addon", "/etc/sireno", "/home/me")).toBe(
      "/etc/sireno/my-addon",
    );
  });

  it("expands ~ to homeDir", () => {
    expect(resolveLocalAddonRoot("~/addons/x", "/etc/sireno", "/home/me")).toBe(
      "/home/me/addons/x",
    );
  });
});

describe("readManifest", () => {
  it("reads a valid addon manifest", () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({
        name: "@me/test-addon",
        version: "1.2.3",
        description: "Test addon",
        sirenoAddon: {
          apiVersion: SIRENO_ADDON_API_VERSION,
          main: "./dist/index.js",
          frontend: { main: "./dist/frontend.js", styles: ["./style.css"] },
        },
      }),
    );
    const result = readManifest({ addonRoot: dir });
    expect(result.manifest.apiVersion).toBe(SIRENO_ADDON_API_VERSION);
    expect(result.manifest.main).toBe("./dist/index.js");
    expect(result.manifest.name).toBe("@me/test-addon");
    expect(result.manifest.version).toBe("1.2.3");
    expect(result.manifest.frontend).toEqual({
      main: "./dist/frontend.js",
      styles: ["./style.css"],
    });
  });

  it("throws when sirenoAddon field is missing", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "x" }));
    expect(() => readManifest({ addonRoot: dir })).toThrow(/sirenoAddon/);
  });

  it("throws when apiVersion is not a number", () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ sirenoAddon: { apiVersion: "3", main: "./index.js" } }),
    );
    expect(() => readManifest({ addonRoot: dir })).toThrow(/apiVersion/);
  });

  it("throws when main is missing", () => {
    const dir = makeTempDir();
    writeFileSync(
      join(dir, "package.json"),
      JSON.stringify({ sirenoAddon: { apiVersion: SIRENO_ADDON_API_VERSION } }),
    );
    expect(() => readManifest({ addonRoot: dir })).toThrow(/main/);
  });
});

describe("loadAddons", () => {
  it("loads a local addon by relative path", async () => {
    const configDir = makeTempDir();
    const addonDir = join(configDir, "my-addon");
    mkdirSync(addonDir, { recursive: true });
    writeFileSync(
      join(addonDir, "package.json"),
      JSON.stringify({
        name: "my-addon",
        sirenoAddon: {
          apiVersion: SIRENO_ADDON_API_VERSION,
          main: "./index.ts",
        },
      }),
    );
    writeFileSync(
      join(addonDir, "index.ts"),
      [
        "import { z } from 'zod';",
        "export default {",
        "  apiVersion: 3,",
        "  name: 'my-addon',",
        "  buttons: [{",
        "    type: 'my-addon:hello',",
        "    configSchema: z.object({ name: z.string() }),",
        "    render: () => null,",
        "  }],",
        "};",
        "",
      ].join("\n"),
    );
    const result = await loadAddons({
      entries: ["./my-addon"],
      configDir,
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(1);
    expect(result.addons[0]?.module.name).toBe("my-addon");
    expect(result.addons[0]?.module.buttons?.[0]?.type).toBe("my-addon:hello");
    expect(result.issues).toHaveLength(0);
  });

  it("records info issue when addon is disabled", async () => {
    const result = await loadAddons({
      entries: [{ source: "./anywhere", enabled: false }],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(0);
    expect(result.issues.some((i) => /disabled/i.test(i.message))).toBe(true);
  });

  it("records error when local addon path does not exist", async () => {
    const result = await loadAddons({
      entries: ["./does-not-exist"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(0);
    expect(result.issues.some((i) => /does not exist/.test(i.message))).toBe(true);
  });

  it("records error when addon module export is invalid", async () => {
    const configDir = makeTempDir();
    const addonDir = join(configDir, "broken-addon");
    mkdirSync(addonDir, { recursive: true });
    writeFileSync(
      join(addonDir, "package.json"),
      JSON.stringify({
        sirenoAddon: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./index.ts" },
      }),
    );
    writeFileSync(join(addonDir, "index.ts"), "export default { not: 'a valid addon' };\n");
    const result = await loadAddons({
      entries: ["./broken-addon"],
      configDir,
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(0);
    expect(result.issues.some((i) => /apiVersion \+ name required/.test(i.message))).toBe(true);
  });

  it("records error for npm addons when no cacheDir is provided", async () => {
    const result = await loadAddons({
      entries: ["core-buttons"],
      configDir: "/tmp",
      homeDir: "/tmp",
      currentApiVersion: SIRENO_ADDON_API_VERSION,
    });
    expect(result.addons).toHaveLength(0);
    expect(
      result.issues.some((i) => /Unknown addon spec/.test(i.message)),
    ).toBe(true);
  });
});

describe("AddonRegistry", () => {
  it("indexes addons, button types, and deck types", () => {
    const registry = new AddonRegistry();
    registry.load({
      manifest: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./index.ts" },
      module: {
        apiVersion: SIRENO_ADDON_API_VERSION,
        name: "test",
        buttons: [
          {
            type: "test:a",
            configSchema: {},
            render: () => null,
          },
        ],
        decks: [
          {
            type: "test-deck",
            createDecks: () => ({}),
          },
        ],
      },
      source: { kind: "local", specifier: "./test", resolvedPath: "/tmp/test" },
    });
    expect(registry.listAddons()).toHaveLength(1);
    expect(registry.hasButtonType("test:a")).toBe(true);
    expect(registry.hasDeckType("test-deck")).toBe(true);
    expect(registry.getAddon("test")?.module.name).toBe("test");
    expect(registry.getButtonType("test:a")?.addonName).toBe("test");
    expect(registry.getDeckType("test-deck")?.addonName).toBe("test");
  });

  it("throws on duplicate addon name", () => {
    const registry = new AddonRegistry();
    const addon = {
      manifest: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./index.ts" },
      module: { apiVersion: SIRENO_ADDON_API_VERSION, name: "dup" },
      source: { kind: "local" as const, specifier: "./x", resolvedPath: "/tmp/x" },
    };
    registry.load(addon);
    expect(() => registry.load(addon)).toThrow(/Duplicate addon name: dup/);
  });

  it("throws on duplicate button type", () => {
    const registry = new AddonRegistry();
    registry.load({
      manifest: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./x.ts" },
      module: {
        apiVersion: SIRENO_ADDON_API_VERSION,
        name: "first",
        buttons: [{ type: "shared:type", configSchema: {}, render: () => null }],
      },
      source: { kind: "local", specifier: "./first", resolvedPath: "/tmp/first" },
    });
    expect(() =>
      registry.load({
        manifest: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./y.ts" },
        module: {
          apiVersion: SIRENO_ADDON_API_VERSION,
          name: "second",
          buttons: [{ type: "shared:type", configSchema: {}, render: () => null }],
        },
        source: { kind: "local", specifier: "./second", resolvedPath: "/tmp/second" },
      }),
    ).toThrow(/Duplicate button type/);
  });

  it("reset clears all state", () => {
    const registry = new AddonRegistry();
    registry.load({
      manifest: { apiVersion: SIRENO_ADDON_API_VERSION, main: "./x.ts" },
      module: { apiVersion: SIRENO_ADDON_API_VERSION, name: "x" },
      source: { kind: "local", specifier: "./x", resolvedPath: "/tmp/x" },
    });
    expect(registry.listAddons()).toHaveLength(1);
    registry.reset();
    expect(registry.listAddons()).toHaveLength(0);
  });
});
