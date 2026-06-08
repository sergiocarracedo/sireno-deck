import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import type { ReactElement } from "react"

import { Text } from "./Text"

const LOGO_DATA_URL = `data:image/png;base64,${readFileSync(
  fileURLToPath(new URL("../assets/logo72x72.png", import.meta.url)),
).toString("base64")}`

const { version: CLI_VERSION } = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../package.json", import.meta.url)),
    "utf8",
  ),
)

export { LOGO_DATA_URL, CLI_VERSION }

export function LogoVersion(): ReactElement {
  return (
    <div
      className="sireno-logo-version flex h-full w-full flex-col items-center justify-center gap-0.5"
      data-sireno-logo-version="true"
    >
      <img
        alt="Sireno Deck"
        className="shrink-0"
        src={LOGO_DATA_URL}
        style={{ height: 48, width: 48 }}
      />
      <Text size="xs" tone="foreground">
        v{CLI_VERSION}
      </Text>
    </div>
  )
}
