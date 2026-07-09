import { describe, expect, it } from "vitest"

import {
  buildAddonsImports,
  buildAddonsRegistryModule,
} from "../virtual-modules"

describe("buildAddonsImports", () => {
  it("emits no imports for empty addons", () => {
    const out = buildAddonsImports([])
    expect(out).not.toContain("import ")
    expect(out).toContain("export const addons = [];")
  })

  it("skips addons without a frontend", () => {
    const out = buildAddonsImports([{ name: "no-frontend" }])
    expect(out).not.toContain("import ")
    expect(out).toContain("export const addons = [];")
  })

  it("emits one import + one entry per addon with a frontend", () => {
    const out = buildAddonsImports([
      { name: "date-time", frontend: { main: "./frontend" } },
      { name: "weather", frontend: { main: "./frontend" } },
    ])
    expect(out).toContain("import * as date_time_frontend")
    expect(out).toContain("import * as weather_frontend")
    expect(out).toContain('"date-time"')
    expect(out).toContain('"weather"')
  })
})

describe("buildAddonsRegistryModule", () => {
  it("emits an empty registry for no addons", () => {
    const out = buildAddonsRegistryModule([])
    expect(out).toContain("export const addonRegistry = {")
    expect(out).toContain("};")
  })

  it("maps each button type to its addon's component", () => {
    const out = buildAddonsRegistryModule([
      {
        name: "date-time",
        frontend: { main: "./frontend" },
        buttonTypes: { "date-time:time": "Time", "date-time:date": "Date" },
      },
      {
        name: "weather",
        frontend: { main: "./frontend" },
        buttonTypes: { "weather:weather": "Weather" },
      },
    ])
    expect(out).toContain('"date-time:time": { addonName: "date-time"')
    expect(out).toContain('"date-time:date": { addonName: "date-time"')
    expect(out).toContain('"weather:weather": { addonName: "weather"')
    expect(out).toContain("import * as date_time_manifest")
    expect(out).toContain("import * as weather_manifest")
  })

  it("skips addons without a frontend", () => {
    const out = buildAddonsRegistryModule([
      { name: "no-frontend", buttonTypes: { "core:foo": "Foo" } },
    ])
    expect(out).not.toContain("core:foo")
  })

  it("skips addons without buttonTypes", () => {
    const out = buildAddonsRegistryModule([
      { name: "no-buttonTypes", frontend: { main: "./frontend" } },
    ])
    expect(out).not.toContain("import")
  })

  it("supports scoped addon names", () => {
    const out = buildAddonsRegistryModule([
      {
        name: "@scope/my-addon",
        frontend: { main: "./frontend" },
        buttonTypes: { "@scope/my-addon:foo": "Foo" },
      },
    ])
    expect(out).toContain("import * as _scope_my_addon_manifest")
    expect(out).toContain(
      '"@scope/my-addon:foo": { addonName: "@scope/my-addon"',
    )
  })
})
