import { describe, expect, it, vi } from "vitest"
import { createNativeCredentialBackend } from "../native"

describe("native credential adapter", () => {
  it("stores, retrieves and deletes opaque scoped secrets", async () => {
    const values = new Map<string, Uint8Array>()
    const factory = vi.fn(async (account: string) => ({
      getSecret: async () =>
        values.has(account) ? [...values.get(account)!] : null,
      setSecret: async (value: Uint8Array) => {
        values.set(account, value)
      },
      deleteCredential: async () => values.delete(account),
    }))
    const store = createNativeCredentialBackend(factory)
    expect(await store.availability()).toBe("available")
    await store.set("calendar", "private-account", "secret 🌍")
    expect(await store.get("calendar", "private-account")).toBe("secret 🌍")
    expect(await store.get("another", "private-account")).toBeUndefined()
    expect(
      factory.mock.calls.every(([id]) => !id.includes("private-account")),
    ).toBe(true)
    await store.delete("calendar", "private-account")
    expect(await store.get("calendar", "private-account")).toBeUndefined()
  })

  it("sanitizes failures without misreporting missing entries", async () => {
    const store = createNativeCredentialBackend(async () => ({
      getSecret: async () => {
        throw new Error("sensitive-native-message")
      },
      setSecret: async () => {
        throw new Error("sensitive-native-message")
      },
      deleteCredential: async () => {
        throw new Error("sensitive-native-message")
      },
    }))
    expect(await store.availability()).toBe("unavailable")
    await expect(store.get("addon", "key")).rejects.toThrow(
      "Credential store: operation-failed",
    )
    await expect(store.delete("addon", "key")).rejects.toThrow(
      "Credential store: operation-failed",
    )
  })
})
