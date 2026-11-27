import { z } from "zod"
import {
  createSecureJsonStorage,
  type StorageCredentials,
} from "./secure-storage.js"

const schema = z
  .object({
    version: z.literal(1),
    selections: z.record(z.string(), z.boolean()),
  })
  .strict()

export const createCalendarSelectionStorage = (
  path: string,
  credentials?: StorageCredentials,
) => {
  const storage = createSecureJsonStorage({
    path,
    ...(credentials ? { credentials } : {}),
  })
  return {
    async load(): Promise<Record<string, boolean>> {
      const data = await storage.load()
      if (data === undefined) return {}
      return schema.parse(data).selections
    },
    async save(selections: Record<string, boolean>): Promise<void> {
      await storage.save(schema.parse({ version: 1, selections }))
    },
  }
}
