import { describe, expect, it } from "vitest";

import manifestJson from "../sirenodeck.json" with { type: "json" };
import type ManifestType from "../index.d.ts";

import settingsDeck from "../decks/settings";

describe("internal-settings sirenodeck.json", () => {
  it("declares kind=addon, apiVersion 1, and the expected name", () => {
    expect(manifestJson.kind).toBe("addon");
    expect(manifestJson.apiVersion).toBe(1);
    expect(manifestJson.name).toBe("internal-settings");
  });

  it("references a types file path", () => {
    expect(manifestJson.types).toBe("./index.d.ts");
  });

  it("declares three internal buttons", () => {
    expect(manifestJson.buttons).toHaveLength(3);
    const types = manifestJson.buttons.map((b) => b.type);
    expect(types).toContain("core:settings-about");
    expect(types).toContain("core:settings-brightness");
    expect(types).toContain("core:settings-theme");
    for (const b of manifestJson.buttons) {
      expect(b.internal).toBe(true);
    }
  });

  it("declares one deck (settings)", () => {
    expect(manifestJson.decks).toHaveLength(1);
    expect(manifestJson.decks?.[0]?.type).toBe("settings");
    expect(manifestJson.decks?.[0]?.path).toBe("decks/settings");
  });
});

describe("internal-settings typed manifest", () => {
  it("typed re-export matches the JSON", () => {
    const expected: ManifestType = manifestJson as ManifestType;
    expect(expected).toBe(manifestJson);
    expect(expected.name).toBe("internal-settings");
  });
});

describe("internal-settings settings deck", () => {
  it("returns the three buttons in order", () => {
    const deck = settingsDeck(0);
    expect(deck.name).toBe("Settings");
    const types = (deck.buttons ?? []).map(
      (b) => (b as { type: string }).type,
    );
    expect(types).toEqual([
      "core:settings-brightness",
      "core:settings-theme",
      "core:settings-about",
    ]);
  });
});