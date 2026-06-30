import { describe, expect, it } from "vitest";

import { AddonRegistry } from "@/addon/registry";

import { registerBuiltInThemes, resolveActiveTheme } from "../../loader";

describe("themes/light override", () => {
  it("registerBuiltInThemes registers both default and light themes", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    expect(registry.hasTheme("default")).toBe(true);
    expect(registry.hasTheme("light")).toBe(true);
    expect(
      registry
        .listThemes()
        .map((t) => t.name)
        .sort(),
    ).toEqual(["default", "light"]);
  });

  it("resolveActiveTheme resolves the light theme when configured", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    const { theme } = resolveActiveTheme(registry, { theme: "light" });
    expect(theme.name).toBe("light");
    expect(theme.frontendPath.endsWith("index")).toBe(true);
    expect(theme.cssPath.endsWith("theme.generated.css")).toBe(true);
  });

  it("light and default themes have distinct CSS paths", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    const def = registry.getTheme("default");
    const light = registry.getTheme("light");
    expect(def?.cssPath).not.toBe(light?.cssPath);
    expect(def?.cssPath).toContain("default/theme.generated.css");
    expect(light?.cssPath).toContain("light/theme.generated.css");
  });

  it("unknown theme name throws with available themes listed", () => {
    const registry = new AddonRegistry();
    registerBuiltInThemes(registry);
    expect(() => resolveActiveTheme(registry, { theme: "neon" })).toThrow(
      /Theme 'neon' is not registered/,
    );
    expect(() => resolveActiveTheme(registry, { theme: "neon" })).toThrow(/default/);
    expect(() => resolveActiveTheme(registry, { theme: "neon" })).toThrow(/light/);
  });
});
