import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { z } from "zod"

const ALGORITHM = "aes-256-gcm"
const IV_BYTES = 12
const KEY_BYTES = 32
const KEY_NAME = "calendar.storage-key"

export interface StorageCredentials {
  availability(): Promise<"available" | "locked" | "unavailable">
  get(name: string): Promise<string | undefined>
  set(name: string, value: string): Promise<void>
}

const container = z
  .object({
    version: z.literal(1),
    alg: z.literal(ALGORITHM),
    iv: z.string(),
    tag: z.string(),
    data: z.string(),
  })
  .strict()

type Container = z.infer<typeof container>

const parseContainer = (raw: string): Container | null => {
  try {
    const parsed = container.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

const encrypt = (key: Buffer, value: unknown): string => {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ])
  return JSON.stringify({
    version: 1,
    alg: ALGORITHM,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  })
}

const decrypt = (key: Buffer, parsed: Container): unknown => {
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(parsed.iv, "base64"),
  )
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ])
  return JSON.parse(plain.toString("utf8"))
}

/**
 * The storage key lives in the operating system's credential store, so the
 * files on disk are useless without the user's unlocked keyring.
 */
const loadKey = async (
  credentials: StorageCredentials | undefined,
): Promise<Buffer | null> => {
  if (!credentials) return null
  try {
    if ((await credentials.availability()) !== "available") return null
    const stored = await credentials.get(KEY_NAME)
    if (stored === undefined) {
      const key = randomBytes(KEY_BYTES)
      await credentials.set(KEY_NAME, key.toString("base64"))
      // Confirm the store actually kept the key. A store that silently drops
      // it would hand out a different key on the next run, and the encrypted
      // file could never be read again.
      const confirmed = await credentials.get(KEY_NAME)
      if (confirmed !== key.toString("base64")) return null
      return key
    }
    const key = Buffer.from(stored, "base64")
    if (key.length !== KEY_BYTES) return null
    return key
  } catch {
    return null
  }
}

/**
 * JSON file storage that encrypts its contents with a key held in the
 * credential store. Files written before encryption existed are read as
 * plaintext and rewritten encrypted on the next save.
 */
export const createSecureJsonStorage = (options: {
  path: string
  credentials?: StorageCredentials
}) => {
  let keyPromise: Promise<Buffer | null> | undefined
  const key = (): Promise<Buffer | null> =>
    (keyPromise ??= loadKey(options.credentials))

  const write = async (contents: string): Promise<void> => {
    await mkdir(dirname(options.path), { recursive: true, mode: 0o700 })
    const temporary = `${options.path}.${randomBytes(12).toString("hex")}.tmp`
    try {
      await writeFile(temporary, contents, { mode: 0o600, flag: "wx" })
      await rename(temporary, options.path)
    } catch (error) {
      await unlink(temporary).catch(() => {})
      throw error
    }
  }

  return {
    async load(): Promise<unknown> {
      let raw: string
      try {
        raw = await readFile(options.path, "utf8")
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined
        throw error
      }
      const containerValue = parseContainer(raw)
      const encryptionKey = await key()
      if (containerValue === null) {
        // A file written before encryption existed, or a store without a
        // credential backend available.
        const legacy = JSON.parse(raw) as unknown
        if (encryptionKey !== null) await write(encrypt(encryptionKey, legacy))
        return legacy
      }
      if (encryptionKey === null)
        throw new Error(
          "Calendar storage is locked; unlock the credential store",
        )
      try {
        return decrypt(encryptionKey, containerValue)
      } catch {
        throw new Error("Invalid calendar storage")
      }
    },
    async save(value: unknown): Promise<void> {
      const encryptionKey = await key()
      await write(
        encryptionKey === null
          ? JSON.stringify(value)
          : encrypt(encryptionKey, value),
      )
    },
  }
}
