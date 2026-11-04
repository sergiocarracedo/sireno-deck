import { createHash } from "node:crypto"
import { chmod, lstat, mkdir } from "node:fs/promises"
import { homedir } from "node:os"
import { isAbsolute, join } from "node:path"

export const addonDataRoot = (): string => {
  if (process.platform === "win32") {
    const local = process.env["LOCALAPPDATA"]
    if (!local || !isAbsolute(local))
      throw new Error("LOCALAPPDATA is unavailable")
    return join(local, "sirenodeck")
  }
  if (process.platform === "darwin") {
    return join(homedir(), "Library", "Application Support", "sirenodeck")
  }
  const xdg = process.env["XDG_DATA_HOME"]
  return join(
    xdg && isAbsolute(xdg) ? xdg : join(homedir(), ".local", "share"),
    "sirenodeck",
  )
}

export const createAddonDataDirectory = (
  name: string,
  root?: string,
): (() => Promise<string>) => {
  let result: Promise<string> | undefined
  return () => {
    result ??= (async () => {
      const base = root ?? addonDataRoot()
      if (!isAbsolute(base)) throw new Error("Addon data root must be absolute")
      const addons = join(base, "addons")
      const directory = join(
        addons,
        createHash("sha256").update(name).digest("hex"),
      )
      await mkdir(base, { recursive: true, mode: 0o700 })
      for (const path of [addons, directory]) {
        await mkdir(path, { mode: 0o700 }).catch(
          (error: NodeJS.ErrnoException) => {
            if (error.code !== "EEXIST") throw error
          },
        )
        if (!(await lstat(path)).isDirectory())
          throw new Error(`Not a directory: ${path}`)
        if (process.platform !== "win32") await chmod(path, 0o700)
      }
      return directory
    })()
    return result
  }
}
