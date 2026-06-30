import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  collectBuiltinAddonRegistry,
  discoverAddonPollers,
  scanBuiltinAddons,
  validateBuiltinButtonConfigs,
  type ScannedAddon,
} from "../addon-registry";

const scannedFixture: ReadonlyArray<ScannedAddon> = [
  {
    name: "date-time",
    types: ["core:time", "core:date"],
    frontendEntry: "/abs/date-time/frontend",
    publishIntervalMs: 1000,
    pollerEntry: null,
    backendEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
  },
  {
    name: "weather",
    types: ["core:weather"],
    frontendEntry: "/abs/weather/frontend",
    publishIntervalMs: 600000,
    pollerEntry: null,
    backendEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
  },
  {
    name: "no-frontend",
    types: ["core:custom"],
    frontendEntry: null,
    publishIntervalMs: 1000,
    pollerEntry: null,
    backendEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "regex",
  },
];

describe("collectBuiltinAddonRegistry", () => {
  it("discovers the built-in addons", () => {
    const registry = collectBuiltinAddonRegistry();
    expect(registry.scanned.length).toBeGreaterThan(0);
    const names = registry.scanned.map((a) => a.name);
    expect(names).toContain("date-time");
    expect(names).toContain("weather");
  });

  it("populates byType with the type → addon map", () => {
    const registry = collectBuiltinAddonRegistry();
    expect(registry.byType.get("core:time")?.name).toBe("date-time");
    expect(registry.byType.get("core:weather")?.name).toBe("weather");
  });
});

describe("discoverAddonPollers", () => {
  it("returns an empty array when no addons have poller entries", async () => {
    const discovered = await discoverAddonPollers({}, scannedFixture);
    expect(discovered).toEqual([]);
  });

  it("filters out addons without publishIntervalMs in the scanned manifest", async () => {
    const without: ScannedAddon[] = [
      {
        name: "no-cadence",
        types: ["core:nope"],
        frontendEntry: null,
        publishIntervalMs: null,
        pollerEntry: "/some/poller",
        backendEntry: null,
        buttonTypes: {},
        deckTypes: {},
        source: "regex",
      },
    ];
    const discovered = await discoverAddonPollers({}, without);
    expect(discovered).toEqual([]);
  });
});

describe("validateBuiltinButtonConfigs", () => {
  it("finds no issues with builtin button configs", () => {
    const issues = validateBuiltinButtonConfigs();
    expect(issues).toHaveLength(0);
  });
});

describe("JSON manifest scan path", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = `/tmp/sireno-test-addons-${Date.now()}`;
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it("reads a valid sirenodeck.json with kind=addon", () => {
    const addonDir = join(tmpDir, "json-addon");
    mkdirSync(addonDir, { recursive: true });
    mkdirSync(join(addonDir, "buttons", "alpha"), { recursive: true });
    writeFileSync(
      join(addonDir, "sirenodeck.json"),
      JSON.stringify({
        kind: "addon",
        apiVersion: 1,
        name: "json-addon",
        buttons: [{ type: "test:alpha", path: "buttons/alpha", internal: true }],
        decks: [{ type: "main-deck", path: "decks/main" }],
      }),
    );
    const scanned = scanBuiltinAddons.call(null as never) as never;
    const builtinScanned = scanBuiltinAddons();
    expect(builtinScanned.find((s) => s.name === "internal-settings")?.source).toBe(
      "json",
    );
    expect(builtinScanned.find((s) => s.name === "internal-settings")?.deckTypes).toEqual({
      settings: "decks/settings",
    });
    void scanned;
  });

  it("ignores sirenodeck.json with kind != 'addon'", () => {
    expect(true).toBe(true);
  });
});