import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  BUILTIN_CLI_ICONS,
  ConfigLoadError,
  DEFAULT_CONFIG_FILENAME,
  defaultResolveHome,
  expandButtonReferences,
  findConfigPath,
  iconSourceToString,
  isBootstrapValid,
  isLocalIconPath,
  loadConfig,
  resolveIconRef,
  validateBootstrap,
} from "@/config";
import type { RawConfig } from "@/config";

const tempRoots: string[] = [];

const makeTempDir = (): string => {
  const dir = mkdtempSync(join(tmpdir(), "sireno-test-"));
  tempRoots.push(dir);
  return dir;
};

afterEach(() => {
  while (tempRoots.length > 0) {
    const dir = tempRoots.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("BUILTIN_CLI_ICONS", () => {
  it("contains expected common icons", () => {
    expect(BUILTIN_CLI_ICONS.has("play")).toBe(true);
    expect(BUILTIN_CLI_ICONS.has("pause")).toBe(true);
    expect(BUILTIN_CLI_ICONS.has("settings")).toBe(true);
    expect(BUILTIN_CLI_ICONS.has("back")).toBe(true);
  });

  it("does not contain arbitrary strings", () => {
    expect(BUILTIN_CLI_ICONS.has("not-a-real-icon")).toBe(false);
  });
});

describe("defaultResolveHome", () => {
  it("expands ~ to home dir", () => {
    expect(defaultResolveHome("~")).toMatch(/\/|\//);
  });

  it("expands ~/foo to home/foo", () => {
    const expanded = defaultResolveHome("~/foo");
    expect(expanded.endsWith("/foo")).toBe(true);
  });

  it("returns absolute paths unchanged", () => {
    expect(defaultResolveHome("/etc/hosts")).toBe("/etc/hosts");
  });
});

describe("isLocalIconPath", () => {
  it("detects ./ and ../", () => {
    expect(isLocalIconPath("./foo.png")).toBe(true);
    expect(isLocalIconPath("../foo.png")).toBe(true);
  });

  it("detects absolute paths", () => {
    expect(isLocalIconPath("/etc/foo.png")).toBe(true);
  });

  it("detects ~/ paths", () => {
    expect(isLocalIconPath("~/foo.png")).toBe(true);
  });

  it("detects paths with separators", () => {
    expect(isLocalIconPath("assets/foo.png")).toBe(true);
    expect(isLocalIconPath("foo\\bar")).toBe(true);
  });

  it("rejects bare filenames", () => {
    expect(isLocalIconPath("foo.png")).toBe(false);
    expect(isLocalIconPath("play")).toBe(false);
  });
});

describe("resolveIconRef", () => {
  const ctx = {
    configDir: "/etc/sireno",
    resolveHome: defaultResolveHome,
    builtinIconIds: BUILTIN_CLI_ICONS,
  };

  it("resolves icon://<id> to CLI builtin", () => {
    expect(resolveIconRef("icon://play", ctx)).toEqual({ kind: "cli-builtin", id: "play" });
  });

  it("rejects unknown CLI builtin ids", () => {
    expect(() => resolveIconRef("icon://nope", ctx)).toThrow(/Unknown CLI-builtin icon/);
  });

  it("rejects empty CLI builtin id", () => {
    expect(() => resolveIconRef("icon://", ctx)).toThrow(/Invalid CLI-builtin/);
  });

  it("resolves builtin://<addon>/<path>", () => {
    expect(resolveIconRef("builtin://core-buttons/play.svg", ctx)).toEqual({
      kind: "builtin-addon",
      addonName: "core-buttons",
      subPath: "play.svg",
    });
  });

  it("rejects malformed builtin:// ref", () => {
    expect(() => resolveIconRef("builtin://noSlash", ctx)).toThrow(/Invalid builtin/);
  });

  it("resolves addon://<addon>/<path>", () => {
    expect(resolveIconRef("addon://my-addon/icon.svg", ctx)).toEqual({
      kind: "addon",
      addonName: "my-addon",
      subPath: "icon.svg",
    });
  });

  it("resolves relative paths against configDir", () => {
    expect(resolveIconRef("./bg.png", ctx)).toEqual({
      kind: "path",
      absolutePath: "/etc/sireno/bg.png",
    });
    expect(resolveIconRef("../assets/bg.png", ctx)).toEqual({
      kind: "path",
      absolutePath: "/etc/assets/bg.png",
    });
  });

  it("resolves absolute paths unchanged", () => {
    expect(resolveIconRef("/var/bg.png", ctx)).toEqual({
      kind: "path",
      absolutePath: "/var/bg.png",
    });
  });

  it("resolves ~/ paths via resolveHome", () => {
    const home = defaultResolveHome("~/bg.png");
    expect(resolveIconRef("~/bg.png", ctx)).toEqual({
      kind: "path",
      absolutePath: home,
    });
  });

  it("rejects unrecognized refs", () => {
    expect(() => resolveIconRef("not-a-uri-just-a-word", ctx)).toThrow(/Unrecognized icon ref/);
  });
});

describe("iconSourceToString", () => {
  it("round-trips each kind", () => {
    expect(iconSourceToString({ kind: "cli-builtin", id: "play" })).toBe("icon://play");
    expect(iconSourceToString({ kind: "builtin-addon", addonName: "core", subPath: "x.svg" })).toBe(
      "builtin://core/x.svg",
    );
    expect(iconSourceToString({ kind: "addon", addonName: "third", subPath: "x.svg" })).toBe(
      "addon://third/x.svg",
    );
    expect(iconSourceToString({ kind: "path", absolutePath: "/a/b.png" })).toBe("/a/b.png");
  });
});

describe("expandButtonReferences", () => {
  it("returns the input unchanged when there are no decks", () => {
    expect(expandButtonReferences({ foo: "bar" }, "/tmp")).toEqual({ foo: "bar" });
  });

  it("expands @file.yml in buttons", () => {
    const dir = makeTempDir();
    const subfile = join(dir, "media-buttons.yml");
    writeFileSync(
      subfile,
      ["- type: 'core:play'", "  position: 0", "- type: 'core:next'", "  position: 1", ""].join(
        "\n",
      ),
    );
    const raw = {
      decks: {
        main: {
          buttons: [`@${subfile}`, { type: "core:settings", position: 2 }],
        },
      },
    };
    const result = expandButtonReferences(raw, dir) as { decks: { main: { buttons: unknown[] } } };
    expect(result.decks.main.buttons).toHaveLength(3);
    expect(result.decks.main.buttons[0]).toEqual({ type: "core:play", position: 0 });
    expect(result.decks.main.buttons[2]).toEqual({ type: "core:settings", position: 2 });
  });

  it("recursively expands nested @ refs", () => {
    const dir = makeTempDir();
    const inner = join(dir, "inner.yml");
    writeFileSync(inner, "- { type: 'core:a' }\n- { type: 'core:b' }\n");
    const outer = join(dir, "outer.yml");
    writeFileSync(outer, `- '@${inner}'\n- { type: 'core:c' }\n`);
    const raw = {
      decks: { main: { buttons: [`@${outer}`] } },
    };
    const result = expandButtonReferences(raw, dir) as { decks: { main: { buttons: unknown[] } } };
    expect(result.decks.main.buttons).toHaveLength(3);
  });
});

describe("loadConfig", () => {
  it("loads a valid config", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(
      path,
      [
        "theme: default",
        "decks:",
        "  main:",
        "    name: Home",
        "    buttons:",
        "      - position: 0",
        "        type: 'core:settings'",
        "      - position: 1",
        "        type: 'core:back'",
        "",
      ].join("\n"),
    );
    const result = loadConfig({ configPath: path });
    expect(result.config.theme).toBe("default");
    expect(Object.keys(result.config.decks)).toEqual(["main"]);
    if (result.config.decks["main"]) {
      expect(result.config.decks["main"].buttons).toHaveLength(2);
    }
    expect(result.configDir).toBe(dir);
  });

  it("rejects unknown top-level properties", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(
      path,
      [
        "main_deck: main", // <- legacy prop, should be rejected
        "decks:",
        "  main:",
        "    buttons: []",
        "",
      ].join("\n"),
    );
    expect(() => loadConfig({ configPath: path })).toThrow(ConfigLoadError);
  });

  it("rejects keyCount in deck", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(
      path,
      ["decks:", "  main:", "    keyCount: 15", "    buttons: []", ""].join("\n"),
    );
    expect(() => loadConfig({ configPath: path })).toThrow(ConfigLoadError);
  });

  it("rejects paste block", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(
      path,
      ["paste:", "  keystroke: 'ctrl+v'", "decks:", "  main:", "    buttons: []", ""].join("\n"),
    );
    expect(() => loadConfig({ configPath: path })).toThrow(ConfigLoadError);
  });

  it("accepts string and object addon entries", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(
      path,
      [
        "decks:",
        "  main:",
        "    buttons: []",
        "addons:",
        "  - core-buttons",
        "  - source: './local-clock'",
        "    enabled: false",
        "",
      ].join("\n"),
    );
    const result = loadConfig({ configPath: path });
    expect(result.config.addons).toHaveLength(2);
    expect(result.config.addons?.[0]).toBe("core-buttons");
    expect(result.config.addons?.[1]).toEqual({ source: "./local-clock", enabled: false });
  });

  it("collects YAML parse errors with line info", () => {
    const dir = makeTempDir();
    const path = join(dir, DEFAULT_CONFIG_FILENAME);
    writeFileSync(path, "decks:\n  main:\n    foo: [unclosed\n");
    try {
      loadConfig({ configPath: path });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      const ce = err as ConfigLoadError;
      expect(ce.issues.length).toBeGreaterThan(0);
      expect(ce.issues[0]?.location).toBeDefined();
    }
  });

  it("wraps ENOENT in a friendly ConfigLoadError", () => {
    const dir = makeTempDir();
    const path = join(dir, "does-not-exist.yml");
    try {
      loadConfig({ configPath: path });
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ConfigLoadError);
      expect((err as Error).message).toContain("Config file not found");
      expect((err as Error).message).toContain(path);
    }
  });
});

describe("findConfigPath", () => {
  it("prefers --config explicit path", () => {
    const dir = makeTempDir();
    const explicit = join(dir, "custom.yml");
    writeFileSync(explicit, "decks:\n  main:\n    buttons: []\n");
    expect(findConfigPath({ explicitPath: explicit, homeDir: "/tmp" })).toBe(explicit);
  });

  it("falls back to cwd/config.yml", () => {
    const dir = makeTempDir();
    writeFileSync(join(dir, DEFAULT_CONFIG_FILENAME), "decks:\n  main:\n    buttons: []\n");
    expect(findConfigPath({ cwd: dir, homeDir: "/tmp" })).toBe(join(dir, DEFAULT_CONFIG_FILENAME));
  });

  it("falls back to $XDG_CONFIG_HOME/sireno-deck-2/config.yml", () => {
    const xdg = makeTempDir();
    const dir = makeTempDir();
    mkdirSync(join(xdg, "sireno-deck-2"), { recursive: true });
    writeFileSync(
      join(xdg, "sireno-deck-2", DEFAULT_CONFIG_FILENAME),
      "decks:\n  main:\n    buttons: []\n",
    );
    expect(findConfigPath({ cwd: dir, homeDir: "/tmp", xdgConfigHome: xdg })).toBe(
      join(xdg, "sireno-deck-2", DEFAULT_CONFIG_FILENAME),
    );
  });

  it("returns null when nothing is found", () => {
    const dir = makeTempDir();
    expect(findConfigPath({ cwd: dir, homeDir: dir, xdgConfigHome: dir })).toBeNull();
  });
});

describe("validateBootstrap", () => {
  const baseConfig: RawConfig = {
    decks: {
      main: { buttons: [] },
    },
  };

  it("errors when main deck is missing", () => {
    const result = validateBootstrap({ decks: { other: { buttons: [] } } });
    expect(isBootstrapValid(result)).toBe(false);
    expect(result.issues.some((i) => /Missing required `main`/.test(i.message))).toBe(true);
  });

  it("errors on duplicate positions", () => {
    const result = validateBootstrap({
      decks: {
        main: {
          buttons: [
            { position: 0, type: "core:a" },
            { position: 0, type: "core:b" },
          ],
        },
      },
    });
    expect(isBootstrapValid(result)).toBe(false);
    expect(result.issues.some((i) => /Duplicate position/.test(i.message))).toBe(true);
  });

  it("passes for a clean main deck", () => {
    const result = validateBootstrap(baseConfig);
    expect(isBootstrapValid(result)).toBe(true);
  });

  it("skips @file.yml string entries", () => {
    const result = validateBootstrap({
      decks: {
        main: {
          buttons: ["@./foo.yml", { position: 0, type: "core:a" }],
        },
      },
    });
    expect(isBootstrapValid(result)).toBe(true);
  });
});
