import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it } from "vitest"

import { ConfigMutationError, createConfigMutationService } from "../mutation"

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0))
    rmSync(root, { recursive: true, force: true })
})

const fixture = (
  rootText = "decks:\n  main:\n    buttons:\n      - type: core:action\n        position: 0\n",
) => {
  const root = mkdtempSync(join(tmpdir(), "config-mutation-"))
  roots.push(root)
  const path = join(root, "config.yml")
  writeFileSync(path, rootText)
  return path
}

describe("config mutation", () => {
  it("adds, updates, reorders, deletes, and undoes root buttons", async () => {
    const path = fixture()
    const service = createConfigMutationService({ configPath: path })
    await service.apply({
      kind: "add",
      deckId: "main",
      button: { type: "core:action" },
    })
    await service.apply({
      kind: "update",
      deckId: "main",
      index: 0,
      button: { type: "core:action", position: 3 },
    })
    await service.apply({ kind: "reorder", deckId: "main", from: 0, to: 1 })
    await service.apply({ kind: "delete", deckId: "main", index: 0 })
    expect(readFileSync(path, "utf8")).toContain("position: 3")
    expect(service.canUndo()).toBe(true)
    await service.undo()
    expect(readFileSync(path, "utf8")).toContain("position: 3")
  })

  it("preserves comments and rejects invalid edits without writing", async () => {
    const path = fixture("# keep me\ndecks:\n  main:\n    buttons: []\n")
    const service = createConfigMutationService({ configPath: path })
    await expect(
      service.apply({ kind: "add", deckId: "main", button: { type: "" } }),
    ).rejects.toThrow(ConfigMutationError)
    expect(readFileSync(path, "utf8")).toContain("# keep me")
  })

  it("sets the configured theme and can undo it", async () => {
    const path = fixture("theme: old\ndecks:\n  main:\n    buttons: []\n")
    const service = createConfigMutationService({ configPath: path })
    await service.apply({ kind: "set-theme", theme: "new" })
    expect(readFileSync(path, "utf8")).toContain("theme: new")
    await service.undo()
    expect(readFileSync(path, "utf8")).toContain("theme: old")
  })

  it("allows only YAML files in the resolved include graph", () => {
    const path = fixture("decks:\n  main:\n    buttons: []\n")
    const included = join(join(path, ".."), "buttons.yaml")
    writeFileSync(included, "- type: core:action\n")
    writeFileSync(path, `decks: !include ${included}\n`)
    const service = createConfigMutationService({ configPath: path })
    expect(service.isEditableSource(included)).toBe(true)
    expect(service.isEditableSource(join(join(path, ".."), "notes.txt"))).toBe(
      false,
    )
    expect(service.isEditableSource(join(join(path, ".."), "other.yaml"))).toBe(
      false,
    )
    const nonYaml = join(join(path, ".."), "included.txt")
    writeFileSync(nonYaml, "not config\n")
    writeFileSync(path, `decks: !include ${nonYaml}\n`)
    expect(service.isEditableSource(nonYaml)).toBe(false)
    expect(
      service.sourceDescriptors().some((source) => source.path === nonYaml),
    ).toBe(false)
  })

  it("edits an included YAML source and undoes it", async () => {
    const path = fixture(
      "decks:\n  main:\n    buttons: !include buttons.yaml\n",
    )
    const included = join(join(path, ".."), "buttons.yaml")
    writeFileSync(included, "- type: core:action\n")
    const service = createConfigMutationService({ configPath: path })
    await service.apply({
      kind: "edit-source",
      path: included,
      content: "- type: core:settings\n",
    })
    expect(readFileSync(included, "utf8")).toContain("core:settings")
    await service.undo()
    expect(readFileSync(included, "utf8")).toContain("core:action")
  })

  it("persists addon deck overrides in the addon config", async () => {
    const path = fixture(
      "addons:\n  - src: example\ndecks:\n  main:\n    buttons: []\n",
    )
    const service = createConfigMutationService({ configPath: path })
    await service.apply({
      kind: "set-addon-deck-override",
      addonIndex: 0,
      deckId: "tools",
      override: { name: "Tools", autoShow: true },
    })
    const written = readFileSync(path, "utf8")
    expect(written).toContain("name: Tools")
    expect(written).toContain("autoShow: true")
  })

  it("describes only canonical YAML sources and rejects stale source edits", async () => {
    const path = fixture("decks:\n  main:\n    buttons: !include buttons.yml\n")
    const included = join(join(path, ".."), "buttons.yml")
    writeFileSync(included, "- type: core:action\n")
    const service = createConfigMutationService({ configPath: path })

    const descriptors = service.sourceDescriptors()
    expect(descriptors.map((source) => source.path)).toEqual([path, included])
    expect(descriptors.map((source) => source.kind)).toEqual([
      "root",
      "include",
    ])
    expect(descriptors.every((source) => source.editable)).toBe(true)

    writeFileSync(included, "- type: core:settings\n")
    await expect(
      service.apply({
        kind: "edit-source",
        path: included,
        content: "- type: core:action\n",
      }),
    ).rejects.toThrow(/changed outside the editor/)
  })

  it("creates a complete deck and keeps its id outside button data", async () => {
    const path = fixture()
    const service = createConfigMutationService({ configPath: path })
    await service.apply({
      kind: "create-deck",
      deckId: "tools",
      deck: { name: "Tools", buttons: [] },
    })
    const written = readFileSync(path, "utf8")
    expect(written).toContain("tools:")
    expect(written).toContain("name: Tools")
    expect(written).not.toContain("id:")
  })

  it("updates a deck by id without allowing the id into its definition", async () => {
    const path = fixture("decks:\n  main:\n    name: Main\n    buttons: []\n")
    const service = createConfigMutationService({ configPath: path })
    await service.apply({
      kind: "update-deck",
      deckId: "main",
      deck: { name: "Updated", columns: 4, rows: 2, buttons: [] },
    })
    const written = readFileSync(path, "utf8")
    expect(written).toContain("main:")
    expect(written).toContain("name: Updated")
    expect(written).not.toContain("id:")
  })
})
