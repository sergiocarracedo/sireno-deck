import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

export interface ConfigSeedResult {
  readonly seeded: boolean
  readonly targetPath: string
  readonly sourcePath: string
}

const here = (): string => dirname(fileURLToPath(import.meta.url))

// ponytail: seed `starter-config.yml`, NOT `default-config.yml`. The latter is
// the repo's own dev config — it carries `!include demos/*.yml` and
// `src: ./packages/addons/*`, both resolved relative to the config file. Copied
// to ~/.config/sirenodeck/ those paths point at directories that don't exist,
// so the very first `sirenodeck start` after the wizard died with
// "Included file not found". The starter config is self-contained by design.
export const defaultConfigSourcePath = (): string =>
  join(here(), "..", "..", "..", "config", "starter-config.yml")

export const seedDefaultConfig = (targetPath: string): ConfigSeedResult => {
  const sourcePath = defaultConfigSourcePath()
  mkdirSync(dirname(targetPath), { recursive: true })
  copyFileSync(sourcePath, targetPath)
  writeFileSync(targetPath, readFileSync(targetPath, "utf8"), {
    mode: 0o600,
  })
  return { seeded: true, targetPath, sourcePath }
}
