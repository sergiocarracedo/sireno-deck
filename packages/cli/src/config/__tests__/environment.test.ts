import { describe, expect, it } from "vitest"
import {
  MissingEnvironmentVariableError,
  resolveEnvironmentVariables,
} from "../environment"

describe("environment variable substitution", () => {
  it("resolves string values recursively without parsing or recursively expanding them", () => {
    const value = {
      "${env:KEY}": [
        "${env:FIRST}",
        "prefix-${env:SECOND}-${env:FIRST}",
        42,
        false,
      ],
    }
    expect(
      resolveEnvironmentVariables(value, {
        FIRST: "${env:SECOND}",
        SECOND: "x: [1, 2]",
      }),
    ).toEqual({
      "${env:KEY}": [
        "${env:SECOND}",
        "prefix-x: [1, 2]-${env:SECOND}",
        42,
        false,
      ],
    })
  })

  it("accepts empty variables and leaves unrelated interpolation syntax alone", () => {
    expect(
      resolveEnvironmentVariables("${env:EMPTY}/${OTHER}", { EMPTY: "" }),
    ).toBe("/${OTHER}")
  })

  it("reports a missing variable and its path without exposing values", () => {
    expect(() =>
      resolveEnvironmentVariables(
        { addons: [{ token: "${env:MISSING}" }] },
        {},
      ),
    ).toThrow(new MissingEnvironmentVariableError("MISSING", "addons[0].token"))
  })
})
