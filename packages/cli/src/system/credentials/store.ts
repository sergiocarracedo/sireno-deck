/** Windows Credential Manager's generic credential blob limit, in bytes. */
export const MAX_CREDENTIAL_BYTES = 2560

export type CredentialErrorCode =
  | "unavailable"
  | "locked"
  | "too-large"
  | "invalid-name"
  | "operation-failed"

/** Error messages must not include credential values or native error details. */
export class CredentialStoreError extends Error {
  constructor(readonly code: CredentialErrorCode) {
    super(`Credential store: ${code}`)
    this.name = "CredentialStoreError"
  }
}

/** A backend receives the addon scope from the host, not from addon code. */
export interface CredentialBackend {
  availability(): Promise<"available" | "locked" | "unavailable">
  get(addon: string, name: string): Promise<string | undefined>
  set(addon: string, name: string, value: string): Promise<void>
  delete(addon: string, name: string): Promise<void>
}

export interface AddonCredentials {
  availability(): Promise<"available" | "locked" | "unavailable">
  get(name: string): Promise<string | undefined>
  set(name: string, value: string): Promise<void>
  delete(name: string): Promise<void>
}

const validateName = (name: string): void => {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(name)) {
    throw new CredentialStoreError("invalid-name")
  }
}

/** Bind an addon identity so callers cannot choose another namespace. */
export const scopeCredentials = (
  backend: CredentialBackend,
  addon: string,
): AddonCredentials => {
  return {
    availability: () => backend.availability(),
    get: async (name) => {
      validateName(name)
      return backend.get(addon, name)
    },
    set: async (name, value) => {
      validateName(name)
      if (Buffer.byteLength(value, "utf8") > MAX_CREDENTIAL_BYTES) {
        throw new CredentialStoreError("too-large")
      }
      await backend.set(addon, name, value)
    },
    delete: async (name) => {
      validateName(name)
      await backend.delete(addon, name)
    },
  }
}

/** Fail closed until a native credential backend is installed and available. */
export const unavailableCredentialBackend: CredentialBackend = {
  availability: async () => "unavailable",
  get: async () => {
    throw new CredentialStoreError("unavailable")
  },
  set: async () => {
    throw new CredentialStoreError("unavailable")
  },
  delete: async () => {
    throw new CredentialStoreError("unavailable")
  },
}
