import { describe, expect, it } from "vitest"

import { packageManagerArgs } from "../package-manager"

describe("packageManagerArgs", () => {
  it.each([
    ["pnpm", ["add", "--global", "demo"]],
    ["npm", ["install", "--global", "demo"]],
    ["yarn", ["global", "add", "demo"]],
  ] as const)("builds global %s arguments", (manager, expected) => {
    expect(packageManagerArgs(manager, "demo", true)).toEqual(expected)
  })

  it("uses add commands for local packages", () => {
    expect(packageManagerArgs("pnpm", "demo", false)).toEqual([
      "add",
      "--save-exact",
      "demo",
    ])
  })
})
