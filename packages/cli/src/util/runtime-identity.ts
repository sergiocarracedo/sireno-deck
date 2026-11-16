import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { VERSION } from "../version"
import { fingerprintBuildInputs } from "./build-fingerprint"

declare const __SIRENO_BUILD_ID__: string | undefined

const development = process.env.SIRENO_DEV_MODE === "true"
let buildId: string | null = null
if (typeof __SIRENO_BUILD_ID__ !== "undefined") {
  buildId = __SIRENO_BUILD_ID__
} else if (development) {
  try {
    buildId = fingerprintBuildInputs(
      resolve(dirname(fileURLToPath(import.meta.url)), "../.."),
    )
  } catch {
    // A missing source tree cannot establish a build identity.
  }
}

export const runtimeIdentity = {
  version: `${VERSION}${development ? "-dev" : ""}`,
  buildId,
} as const
