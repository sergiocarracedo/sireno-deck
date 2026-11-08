import { describe, expect, it } from "vitest"
import {
  CredentialStoreError,
  MAX_CREDENTIAL_BYTES,
  scopeCredentials,
  type CredentialBackend,
} from "../store"

const fakeBackend = (): CredentialBackend => {
  const values = new Map<string, string>()
  const key = (addon: string, name: string) => JSON.stringify([addon, name])
  return {
    availability: async () => "available",
    get: async (addon, name) => values.get(key(addon, name)),
    set: async (addon, name, value) => {
      values.set(key(addon, name), value)
    },
    delete: async (addon, name) => {
      values.delete(key(addon, name))
    },
  }
}

describe("addon-scoped credentials", () => {
  it("isolates addons and supports replacement and idempotent deletion", async () => {
    const backend = fakeBackend()
    const first = scopeCredentials(backend, "first")
    const second = scopeCredentials(backend, "second")
    await first.set("account", "old")
    await second.set("account", "other")
    await first.set("account", "new")
    expect(await first.get("account")).toBe("new")
    expect(await second.get("account")).toBe("other")
    await first.delete("account")
    await first.delete("account")
    expect(await first.get("account")).toBeUndefined()
    expect(await second.get("account")).toBe("other")
  })

  it("checks UTF-8 bytes and never includes secrets in errors", async () => {
    const scoped = scopeCredentials(fakeBackend(), "calendar")
    await scoped.set("token", "x".repeat(MAX_CREDENTIAL_BYTES))
    await expect(
      scoped.set("token", "é".repeat(MAX_CREDENTIAL_BYTES)),
    ).rejects.toMatchObject({ code: "too-large" })
    await expect(scoped.get("secret/name")).rejects.toBeInstanceOf(
      CredentialStoreError,
    )
  })
})
