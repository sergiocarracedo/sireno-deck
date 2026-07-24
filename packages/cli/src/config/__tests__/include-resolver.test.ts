import { mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { IncludeResolutionError, resolveIncludes } from "../include-resolver"

let workdir = ""

const writeYml = (name: string, content: string): string => {
  const path = join(workdir, name)
  writeFileSync(path, content)
  return path
}

beforeEach(() => {
  workdir = mkdtempSync(join(tmpdir(), "include-resolver-"))
})

afterEach(() => {
  if (workdir.length > 0) {
    rmSync(workdir, { recursive: true, force: true })
  }
})

describe("resolveIncludes", () => {
  it("replaces a top-level !include with the file's content", () => {
    const included = writeYml("a.yml", "name: from-a\nvalue: 1\n")
    const root = writeYml(
      "root.yml",
      `theme: default\npayload: !include ${included}\n`,
    )

    const out = resolveIncludes(
      `theme: default\npayload: !include ${included}\n`,
      root,
    )

    expect(out).toContain("theme: default")
    expect(out).toContain("name: from-a")
    expect(out).toContain("value: 1")
    expect(out).not.toContain("!include")
  })

  it("resolves recursive includes (file includes another file)", () => {
    const leaf = writeYml("leaf.yml", "leaf: true\n")
    const mid = writeYml("mid.yml", `mid: true\npayload: !include ${leaf}\n`)
    const root = writeYml("root.yml", `top: true\ndeeper: !include ${mid}\n`)

    const out = resolveIncludes(`top: true\ndeeper: !include ${mid}\n`, root)

    expect(out).toContain("top: true")
    expect(out).toContain("mid: true")
    expect(out).toContain("leaf: true")
    expect(out).not.toContain("!include")
  })

  it("throws IncludeResolutionError on circular references", () => {
    writeYml("a.yml", `payload: !include b.yml\n`)
    writeYml("b.yml", `payload: !include a.yml\n`)
    const a = join(workdir, "a.yml")

    expect(() => resolveIncludes(`payload: !include b.yml\n`, a)).toThrow(
      IncludeResolutionError,
    )
    try {
      resolveIncludes(`payload: !include b.yml\n`, a)
    } catch (err) {
      expect((err as IncludeResolutionError).message).toContain("Circular")
    }
  })

  it("throws IncludeResolutionError when the included file is missing", () => {
    const root = writeYml(
      "root.yml",
      "payload: !include /tmp/this-file-does-not-exist-zzz.yml\n",
    )

    expect(() =>
      resolveIncludes(
        "payload: !include /tmp/this-file-does-not-exist-zzz.yml\n",
        root,
      ),
    ).toThrow(IncludeResolutionError)

    try {
      resolveIncludes(
        "payload: !include /tmp/this-file-does-not-exist-zzz.yml\n",
        root,
      )
    } catch (err) {
      expect((err as IncludeResolutionError).message).toContain("not found")
    }
  })

  it("accepts absolute paths and resolves them unchanged", () => {
    const absoluteTarget = writeYml("abs.yml", "from: absolute\n")

    const out = resolveIncludes(`x: !include ${absoluteTarget}\n`, workdir)

    expect(out).toContain("from: absolute")
    expect(out).not.toContain("!include")
  })

  it("resolves sibling !includes to the same file as independent copies", () => {
    const shared = writeYml("shared.yml", "shared_key: shared_value\n")

    const out = resolveIncludes(
      `first: !include ${shared}\nsecond: !include ${shared}\n`,
      workdir,
    )

    expect(out).toContain("first:")
    expect(out).toContain("second:")
    expect((out.match(/shared_key/g) ?? []).length).toBe(2)
  })

  it("passes through YAML without any !include unchanged", () => {
    const text = "theme: default\ndecks:\n  main: {}\n"

    const out = resolveIncludes(text, workdir)

    expect(out).toBe(text)
  })
})
