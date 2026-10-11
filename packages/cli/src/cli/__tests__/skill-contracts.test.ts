import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { parseDocument } from "yaml"
import { describe, expect, it } from "vitest"
import { ThemeJsonManifestSchema } from "@/themes/manifest"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..")
const read = (path: string): string => readFileSync(resolve(root, path), "utf8")
const skillNames = [
  "sirenodeck-config",
  "sirenodeck-extension-authoring",
  "sirenodeck-app-shortcuts",
]

describe("agent skill contracts", () => {
  it.each([
    ["skills/sirenodeck-config/SKILL.md", "sirenodeck-config"],
    [
      "skills/sirenodeck-extension-authoring/SKILL.md",
      "sirenodeck-extension-authoring",
    ],
    [
      "packages/addons/app-shortcuts/skills/sirenodeck-app-shortcuts/SKILL.md",
      "sirenodeck-app-shortcuts",
    ],
  ])("has valid frontmatter and references for %s", (path, expectedName) => {
    const content = read(path)
    expect(content.startsWith("---\n")).toBe(true)
    const frontmatter = content.split("---", 3)[1]
    const parsed = parseDocument(frontmatter ?? "").toJSON() as {
      name?: string
      description?: string
    }
    expect(parsed.name).toBe(expectedName)
    expect(parsed.description?.length).toBeGreaterThan(30)
    expect(skillNames).toContain(parsed.name)
    expect(content).not.toMatch(/TODO|FIXME/)
  })

  it("keeps app-shortcuts generated deck IDs aligned with its manifest", () => {
    const manifest = read("packages/addons/app-shortcuts/src/manifest.ts")
    const skill = read(
      "packages/addons/app-shortcuts/skills/sirenodeck-app-shortcuts/SKILL.md",
    )
    for (const [deck, factory] of [
      ["vscode", "vscodeDeck"],
      ["opencode", "opencodeDeck"],
      ["chrome", "chromeDeck"],
      ["claude-code", "claudeCodeDeck"],
      ["slack", "slackDeck"],
      ["teams", "teamsDeck"],
      ["discord", "discordDeck"],
      ["google-meet", "googleMeetDeck"],
    ]) {
      expect(manifest).toContain(factory)
      expect(skill).toContain(`app-shortcuts:${deck}`)
    }
    expect(manifest).toContain("buttonTypes: {}")
    expect(skill).toContain("no addon-defined button types")
  })

  it("keeps core config skill install instructions and ownership boundaries", () => {
    const skill = read("skills/sirenodeck-config/SKILL.md")
    expect(skill).toContain("XDG_CONFIG_HOME/sirenodeck/config.yml")
    expect(skill).toContain("!include")
    expect(skill.toLowerCase()).toContain("show the proposed yaml")
    expect(skill).toContain("packages/addons/app-shortcuts/skills/")
  })

  it("keeps registry templates focused on external repo submissions", () => {
    const addon = read(".github/ISSUE_TEMPLATE/addon-submission.md")
    const theme = read(".github/ISSUE_TEMPLATE/theme-submission.md")
    expect(addon).toContain("do not upload addon source code")
    expect(addon).toContain("Cover screenshot")
    expect(theme).toContain("do not upload theme source code")
    expect(theme).toContain("Cover screenshot")
  })

  it("keeps the documented theme manifest example schema-valid", () => {
    const docs = read("packages/cli/docs/developer/theme-authoring.mdx")
    const match = docs.match(
      /## Manifest \(sirenodeck\.json\)[\s\S]*?```json\n([\s\S]*?)\n```/,
    )
    expect(match?.[1]).toBeDefined()
    expect(
      ThemeJsonManifestSchema.safeParse(JSON.parse(match?.[1] ?? "null"))
        .success,
    ).toBe(true)
  })
})
