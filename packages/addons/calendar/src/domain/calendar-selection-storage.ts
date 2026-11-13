import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { z } from "zod"

const schema = z
  .object({
    version: z.literal(1),
    selections: z.record(z.string(), z.boolean()),
  })
  .strict()

export const createCalendarSelectionStorage = (path: string) => ({
  async load(): Promise<Record<string, boolean>> {
    try {
      return schema.parse(JSON.parse(await readFile(path, "utf8"))).selections
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return {}
      throw error
    }
  },
  async save(selections: Record<string, boolean>): Promise<void> {
    const contents = JSON.stringify(schema.parse({ version: 1, selections }))
    await mkdir(dirname(path), { recursive: true, mode: 0o700 })
    const temporary = `${path}.${randomUUID()}.tmp`
    try {
      await writeFile(temporary, contents, { mode: 0o600, flag: "wx" })
      await rename(temporary, path)
    } catch (error) {
      await unlink(temporary).catch(() => {})
      throw error
    }
  },
})
