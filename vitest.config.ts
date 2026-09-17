import { fileURLToPath } from "node:url"
import { resolve } from "node:path"

import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

const here = fileURLToPath(new URL(".", import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./packages/cli/src", import.meta.url)),
      "@sirenodeck/sirenodeck": resolve(here, "packages/cli/src/index.ts"),
      "@sirenodeck/sirenodeck/": resolve(here, "packages/cli/src/") + "/",
      "sirenodeck/react": resolve(here, "packages/cli/src/api/react/index.ts"),
      "virtual:sireno/token": fileURLToPath(
        new URL(
          "./packages/cli/frontend/src/__mocks__/token.ts",
          import.meta.url,
        ),
      ),
      "virtual:sireno/theme": fileURLToPath(
        new URL(
          "./packages/cli/frontend/src/__mocks__/theme.ts",
          import.meta.url,
        ),
      ),
      "virtual:sireno/themes/manifest": fileURLToPath(
        new URL(
          "./packages/cli/frontend/src/__mocks__/themes-manifest.tsx",
          import.meta.url,
        ),
      ),
      "virtual:sireno/addons/registry": fileURLToPath(
        new URL(
          "./packages/cli/frontend/src/__mocks__/addons-registry.ts",
          import.meta.url,
        ),
      ),
    },
  },
  test: {
    globals: false,
    environment: "node",
    // ponytail: several suites drive the real pipeline — spawning a bridge,
    // supervisors and watchers — and then wait on it with real timers. Under
    // vitest's default 5s these passed on an idle laptop and failed a dozen
    // assertions the moment the machine was also running a browser and a chat
    // app, reporting a load average as a code defect. A generous ceiling costs
    // nothing on a green run (a passing test still finishes as fast as it can)
    // and only shows up when something is genuinely wedged.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    include: [
      "packages/cli/src/**/__tests__/**/*.test.{ts,tsx}",
      "packages/cli/frontend/src/**/__tests__/**/*.test.{ts,tsx}",
      "packages/cli/config-ui/src/**/__tests__/**/*.test.{ts,tsx}",
    ],
    environmentMatchGlobs: [
      ["packages/cli/frontend/**", "jsdom"],
      ["packages/cli/config-ui/**", "jsdom"],
    ],
    setupFiles: ["./packages/cli/config-ui/src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      include: [
        "packages/cli/src/**/*.{ts,tsx}",
        "packages/cli/frontend/src/**/*.{ts,tsx}",
        "packages/cli/config-ui/src/**/*.{ts,tsx}",
      ],
      exclude: [
        "packages/cli/src/**/__tests__/**",
        "packages/cli/frontend/src/**/__tests__/**",
        "packages/cli/frontend/src/**/__mocks__/**",
        "packages/cli/config-ui/src/**/__tests__/**",
        "packages/cli/config-ui/src/**/__mocks__/**",
      ],
    },
  },
})
