import { describe, expect, it } from "vitest";

import { AddonRegistry } from "@/addon/registry.ts";
import { coreButtonsAddon } from "@/builtin-addons/core-buttons/index.ts";
import { internalSettingsAddon } from "@/builtin-addons/internal-settings/index.ts";
import { sessionAddon } from "@/builtin-addons/session/index.ts";

import { validateFull } from "../validation.ts";
import type { RawConfig } from "../schemas.ts";

const registry = (): AddonRegistry => {
  const r = new AddonRegistry();
  r.load(coreButtonsAddon);
  r.load(internalSettingsAddon);
  r.load(sessionAddon);
  return r;
};

const baseConfig = (overrides: Partial<RawConfig> = {}): RawConfig => ({
  theme: "default",
  logging: { level: "info" },
  decks: {
    main: {
      name: "Main",
      buttons: [],
    },
  },
  addons: [],
  session: { locked_deck: "session:locked" },
  ...overrides,
});

describe("validateFull", () => {
  it("clean config with valid core:change-deck button passes", () => {
    const reg = registry();
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "core:change-deck", config: { deck: "media" } }],
        },
      },
    });
    const result = validateFull(config, reg);
    expect(result.issues).toEqual([]);
  });

  it("unknown button type errors with path", () => {
    const reg = registry();
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "made:up", config: {} }],
        },
      },
    });
    const result = validateFull(config, reg);
    expect(result.issues.some((i) => i.message.includes("Unknown button type"))).toBe(true);
  });

  it("internal: true button (core:settings-brightness) used in user config errors", () => {
    const reg = registry();
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "core:settings-brightness", config: {} }],
        },
      },
    });
    const result = validateFull(config, reg);
    expect(result.issues.some((i) => i.message.includes("Internal button"))).toBe(true);
  });

  it("bad core:action config (empty command) errors", () => {
    const reg = registry();
    const config = baseConfig({
      decks: {
        main: {
          name: "Main",
          buttons: [{ position: 0, type: "core:action", config: { command: "" } }],
        },
      },
    });
    const result = validateFull(config, reg);
    expect(result.issues.some((i) => i.message.toLowerCase().includes("command"))).toBe(true);
  });

  it("empty issues array returns no errors", () => {
    const reg = registry();
    const config = baseConfig();
    const result = validateFull(config, reg);
    expect(result.issues).toEqual([]);
  });
});
