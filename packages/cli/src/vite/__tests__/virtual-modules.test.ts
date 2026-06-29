import { describe, expect, it } from "vitest";

import {
  buildAddonsImports,
  buildAddonsRegistryModule,
} from "../virtual-modules.ts";

describe("buildAddonsImports", () => {
  it("emits no imports for empty addons", () => {
    const out = buildAddonsImports([]);
    expect(out).not.toContain("import ");
    expect(out).toContain("export const addons = [];");
  });

  it("skips addons without a frontend", () => {
    const out = buildAddonsImports([{ name: "no-frontend" }]);
    expect(out).not.toContain("import ");
    expect(out).toContain("export const addons = [];");
  });

  it("emits one import + one entry per addon with a frontend", () => {
    const out = buildAddonsImports([
      { name: "date-time", frontend: { main: "./frontend.tsx" } },
      { name: "weather", frontend: { main: "./frontend.tsx" } },
    ]);
    expect(out).toContain("import * as date_time_frontend");
    expect(out).toContain("import * as weather_frontend");
    expect(out).toContain('"date-time"');
    expect(out).toContain('"weather"');
  });
});

describe("buildAddonsRegistryModule", () => {
  it("emits an empty registry for no addons", () => {
    const out = buildAddonsRegistryModule([]);
    expect(out).toContain("export const addonRegistry = {");
    expect(out).toContain("};");
  });

  it("maps each button type to its addon's component", () => {
    const out = buildAddonsRegistryModule([
      {
        name: "date-time",
        frontend: { main: "./frontend.tsx" },
        buttons: [{ type: "core:time" }, { type: "core:date" }],
      },
      {
        name: "weather",
        frontend: { main: "./frontend.tsx" },
        buttons: [{ type: "core:weather" }],
      },
    ]);
    expect(out).toContain('"core:time": { addonName: "date-time"');
    expect(out).toContain('"core:date": { addonName: "date-time"');
    expect(out).toContain('"core:weather": { addonName: "weather"');
    expect(out).toContain("import * as date_time_frontend");
    expect(out).toContain("import * as weather_frontend");
  });

  it("skips addons without a frontend", () => {
    const out = buildAddonsRegistryModule([
      { name: "no-frontend", buttons: [{ type: "core:foo" }] },
    ]);
    expect(out).not.toContain("core:foo");
  });

  it("skips addons without buttons", () => {
    const out = buildAddonsRegistryModule([
      { name: "no-buttons", frontend: { main: "./frontend.tsx" } },
    ]);
    expect(out).not.toContain("import");
  });

  it("supports scoped addon names", () => {
    const out = buildAddonsRegistryModule([
      {
        name: "@scope/my-addon",
        frontend: { main: "./frontend.tsx" },
        buttons: [{ type: "core:foo" }],
      },
    ]);
    expect(out).toContain("import * as _scope_my_addon_frontend");
    expect(out).toContain('"core:foo": { addonName: "@scope/my-addon"');
  });
});
