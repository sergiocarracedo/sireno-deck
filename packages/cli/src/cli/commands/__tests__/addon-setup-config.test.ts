import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { parse } from "yaml"
import {
  listAddonProviders,
  removeAddonProvider,
  saveAddonProvider,
} from "../addon-setup-config"

const dirs: string[] = []
afterEach(() => {
  for (const dir of dirs.splice(0))
    rmSync(dir, { recursive: true, force: true })
})
const fixture = (contents: string) => {
  const dir = mkdtempSync(join(tmpdir(), "sireno-setup-test-"))
  dirs.push(dir)
  const path = join(dir, "config.yml")
  writeFileSync(path, contents)
  return path
}
const provider = {
  id: "personal",
  type: "google",
  clientId: "client",
  calendarIds: ["primary"],
}

describe("saveAddonProvider", () => {
  it("adds an account without deleting comments or other providers", async () => {
    const path = fixture(
      "# keep this\naddons:\n  - src: calendar\n    config:\n      service:\n        providers:\n          - id: work\n            type: google\n            clientId: old\n            calendarIds: [work]\ndecks:\n  main:\n    buttons: []\n",
    )
    await saveAddonProvider(path, "calendar", provider)
    const output = readFileSync(path, "utf8")
    expect(output).toContain("# keep this")
    expect(parse(output).addons[0].config.service.providers).toEqual([
      { id: "work", type: "google", clientId: "old", calendarIds: ["work"] },
      provider,
    ])
  })
  it("updates the same account without deleting its other settings", async () => {
    const path = fixture(
      "addons:\n  - src: calendar\n    config:\n      service:\n        providers:\n          - id: personal\n            type: google\n            clientId: old\n            calendarIds: [old]\n            name: Personal\ndecks:\n  main:\n    buttons: []\n",
    )
    await saveAddonProvider(path, "calendar", provider)
    expect(
      parse(readFileSync(path, "utf8")).addons[0].config.service.providers,
    ).toEqual([{ ...provider, name: "Personal" }])
  })
  it("does not modify configs without a matching addon", async () => {
    const contents = "addons: [other]\ndecks:\n  main:\n    buttons: []\n"
    const path = fixture(contents)
    await expect(saveAddonProvider(path, "calendar", provider)).rejects.toThrow(
      "found 0",
    )
    expect(readFileSync(path, "utf8")).toBe(contents)
  })
  it("converts a string addon entry while preserving its source", async () => {
    const path = fixture(
      "addons: [calendar]\ndecks:\n  main:\n    buttons: []\n",
    )
    await saveAddonProvider(path, "calendar", provider)
    expect(parse(readFileSync(path, "utf8")).addons[0]).toEqual({
      src: "calendar",
      config: { service: { providers: [provider] } },
    })
  })
  it("preserves YAML includes while updating the addon", async () => {
    const path = fixture(
      "addons:\n  - src: calendar\ndecks: !include decks.yml\n",
    )
    writeFileSync(join(path, "..", "decks.yml"), "main:\n  buttons: []\n")
    await saveAddonProvider(path, "calendar", provider)
    expect(readFileSync(path, "utf8")).toContain("!include decks.yml")
  })
})

describe("listAddonProviders", () => {
  it("lists the configured account IDs in config order", async () => {
    const path = fixture(
      "addons:\n  - src: calendar\n    config:\n      service:\n        providers:\n          - id: work\n            type: google\n          - id: personal\n            type: google\ndecks:\n  main:\n    buttons: []\n",
    )
    expect(await listAddonProviders(path, "calendar")).toEqual([
      "work",
      "personal",
    ])
  })
  it("returns nothing when the addon has no providers", async () => {
    const path = fixture(
      "addons:\n  - src: calendar\ndecks:\n  main:\n    buttons: []\n",
    )
    expect(await listAddonProviders(path, "calendar")).toEqual([])
  })
})

describe("removeAddonProvider", () => {
  it("removes only the selected account", async () => {
    const path = fixture(
      "# keep this\naddons:\n  - src: calendar\n    config:\n      service:\n        providers:\n          - id: work\n            type: google\n            clientId: old\n            calendarIds: [work]\n          - id: personal\n            type: google\n            clientId: other\n            calendarIds: [primary]\ndecks:\n  main:\n    buttons: []\n",
    )
    await removeAddonProvider(path, "calendar", "work")
    const output = readFileSync(path, "utf8")
    expect(output).toContain("# keep this")
    expect(parse(output).addons[0].config.service.providers).toEqual([
      {
        id: "personal",
        type: "google",
        clientId: "other",
        calendarIds: ["primary"],
      },
    ])
  })
  it("refuses to remove an unknown account", async () => {
    const contents =
      "addons:\n  - src: calendar\n    config:\n      service:\n        providers:\n          - id: work\n            type: google\ndecks:\n  main:\n    buttons: []\n"
    const path = fixture(contents)
    await expect(
      removeAddonProvider(path, "calendar", "missing"),
    ).rejects.toThrow("Unknown account ID")
    expect(readFileSync(path, "utf8")).toBe(contents)
  })
})
