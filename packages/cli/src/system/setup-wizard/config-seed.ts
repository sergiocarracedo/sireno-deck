import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export interface ConfigSeedResult {
  readonly seeded: boolean
  readonly targetPath: string
  readonly sourcePath: string
}

const here = (): string => dirname(fileURLToPath(import.meta.url))

export const defaultConfigSourcePath = (): string =>
  join(here(), "..", "..", "..", "config", "default-config.yml")

export const seedDefaultConfig = (targetPath: string): ConfigSeedResult => {
  const sourcePath = defaultConfigSourcePath()
  mkdirSync(dirname(targetPath), { recursive: true })
  copyFileSync(sourcePath, targetPath)
  writeFileSync(targetPath, readFileSync(targetPath, "utf8"), {
    mode: 0o600,
  })
  return { seeded: true, targetPath, sourcePath }
}
