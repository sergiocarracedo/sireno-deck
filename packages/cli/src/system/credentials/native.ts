import { createHash } from "node:crypto"
import { CredentialStoreError, type CredentialBackend } from "./store"

type NativeEntry = {
  getSecret(): Promise<number[] | null>
  setSecret(value: Uint8Array): Promise<void>
  deleteCredential(): Promise<boolean>
}
type EntryFactory = (account: string) => Promise<NativeEntry>

const accountFor = (addon: string, name: string): string =>
  createHash("sha256")
    .update(JSON.stringify([addon, name]))
    .digest("hex")

/** Entries contain no user-provided names in native-store metadata. */
export const createNativeCredentialBackend = (
  createEntry: EntryFactory = async (account) => {
    const { AsyncEntry } = await import("@napi-rs/keyring")
    return new AsyncEntry("sirenodeck.credentials.v1", account, {
      linux: { store: "secret-service" },
    })
  },
): CredentialBackend => {
  const entry = async (addon: string, name: string): Promise<NativeEntry> => {
    try {
      return await createEntry(accountFor(addon, name))
    } catch {
      throw new CredentialStoreError("unavailable")
    }
  }
  return {
    availability: async () => {
      try {
        const probe = await createEntry(
          accountFor("sirenodeck", "availability-probe"),
        )
        await probe.getSecret()
        return "available"
      } catch {
        return "unavailable"
      }
    },
    get: async (addon, name) => {
      const item = await entry(addon, name)
      try {
        const bytes = await item.getSecret()
        return bytes === null
          ? undefined
          : new TextDecoder("utf-8", { fatal: true }).decode(
              Uint8Array.from(bytes),
            )
      } catch {
        throw new CredentialStoreError("operation-failed")
      }
    },
    set: async (addon, name, value) => {
      const item = await entry(addon, name)
      try {
        await item.setSecret(new TextEncoder().encode(value))
      } catch {
        throw new CredentialStoreError("operation-failed")
      }
    },
    delete: async (addon, name) => {
      const item = await entry(addon, name)
      try {
        await item.deleteCredential()
      } catch {
        throw new CredentialStoreError("operation-failed")
      }
    },
  }
}
