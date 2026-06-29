import { describe, expect, it } from "vitest";

import { isSirenoAddon } from "@/addon/api-types";

import { coreActionButton } from "../action";
import { coreButtonsAddon } from "../index";
import { coreChangeDeckButton } from "../change-deck";
import { coreToggleButton } from "../toggle";

describe("core-buttons addon", () => {
  it("addon object validates via isSirenoAddon", () => {
    expect(isSirenoAddon(coreButtonsAddon)).toBe(true);
  });

  it("action button configSchema rejects empty command", () => {
    const result = coreActionButton.configSchema.safeParse({ command: "" });
    expect(result.success).toBe(false);
  });

  it("change-deck configSchema rejects empty deck", () => {
    const result = coreChangeDeckButton.configSchema.safeParse({ deck: "" });
    expect(result.success).toBe(false);
  });

  it("toggle configSchema uses default false", () => {
    const result = coreToggleButton.configSchema.safeParse({ key: "k" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.default).toBe(false);
  });
});
