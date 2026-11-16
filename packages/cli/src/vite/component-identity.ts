import type { Plugin } from "vite"
import { fingerprintBuildInputs } from "../util/build-fingerprint"
import packageJson from "../../package.json" with { type: "json" }

export const componentIdentity = (
  root: string,
  component: "frontend" | "config-ui",
): Plugin => {
  let buildId: string | null = null
  try {
    buildId = fingerprintBuildInputs(root)
  } catch {
    /* unavailable source */
  }
  const version = `${packageJson.version}${process.env.SIRENO_DEV_MODE === "true" ? "-dev" : ""}`
  const identity = JSON.stringify({ component, version, buildId })
  return {
    name: "sireno-component-identity",
    configureServer(server) {
      server.middlewares.use("/assets/sirenodeck-build.json", (_req, res) => {
        res.setHeader("Content-Type", "application/json")
        res.setHeader("Cache-Control", "no-store")
        // HMR can change browser code without restarting the server. Do not
        // claim the startup fingerprint still identifies the running bundle.
        let current: string | null = null
        try {
          current = fingerprintBuildInputs(root)
        } catch {
          /* unavailable source */
        }
        res.end(
          JSON.stringify({
            component,
            version,
            buildId: current === buildId ? buildId : null,
          }),
        )
      })
    },
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "assets/sirenodeck-build.json",
        source: identity,
      })
    },
  }
}
