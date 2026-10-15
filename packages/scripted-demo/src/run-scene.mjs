import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { spawnSync } from "node:child_process"
import { createServer as createNetServer } from "node:net"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { createRequire } from "node:module"
import { parseScene, resolveScenePaths } from "./scene.mjs"
import { startProxy } from "./proxy.mjs"

const require = createRequire(import.meta.url)
const { chromium } = require("playwright")
const { createServer } = await import("vite")

const wait = (ms) => new Promise((resolveWait) => setTimeout(resolveWait, ms))

const themeCss = (manifestPath, frontendRoot) => {
  const cliRoot = resolve(frontendRoot, "..")
  const compilerPath = resolve(cliRoot, "src/themes/css.ts")
  const componentsPath = join(dirname(manifestPath), "components.css")
  const script = `
    import { existsSync, readFileSync } from "node:fs"
    import { buildThemeCss } from ${JSON.stringify(compilerPath)}
    const parsed = JSON.parse(readFileSync(${JSON.stringify(manifestPath)}, "utf8"))
    const manifest = { ...parsed, fonts: parsed.fonts ?? [] }
    const componentsPath = ${JSON.stringify(componentsPath)}
    process.stdout.write(buildThemeCss(manifest, existsSync(componentsPath) ? [readFileSync(componentsPath, "utf8")] : []))
  `
  const result = spawnSync(
    "pnpm",
    ["--dir", cliRoot, "exec", "tsx", "-e", script],
    { encoding: "utf8" },
  )
  if (result.status !== 0)
    throw new Error(`Could not compile theme CSS: ${result.stderr}`)
  return result.stdout
}

const availablePort = async () => {
  const server = createNetServer()
  await new Promise((resolveListen, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolveListen)
  })
  const address = server.address()
  await new Promise((resolveClose) => server.close(resolveClose))
  if (address === null || typeof address === "string")
    throw new Error("Could not reserve a frontend port")
  return address.port
}

const frontendEnvironment = (scene, proxyUrl) => {
  const environment = {
    ...process.env,
    ...scene.frontend.env,
    SIRENO_WS_PROXY_URL: proxyUrl,
  }
  if (scene.frontend.addons) {
    environment["SIRENO_ADDONS"] = JSON.stringify(
      scene.frontend.addons.map((addon) => ({
        ...addon,
        frontend: {
          ...addon.frontend,
          main: resolve(scene.frontend.root, addon.frontend.main),
        },
      })),
    )
  }
  if (!scene.frontend.theme) return { environment, cleanup: () => {} }
  const themeDirectory = mkdtempSync(join(tmpdir(), "scripted-demo-theme-"))
  mkdirSync(join(themeDirectory, ".sirenodeck"), { recursive: true })
  writeFileSync(
    join(themeDirectory, ".sirenodeck", "theme.css"),
    scene.frontend.theme.css ??
      themeCss(scene.frontend.theme.manifestPath, scene.frontend.root),
  )
  environment["SIRENO_THEME_DIR"] = themeDirectory
  environment["SIRENO_THEME"] = JSON.stringify({
    name: scene.frontend.theme.name ?? "scripted-demo",
    manifestPath: scene.frontend.theme.manifestPath,
    uiOverridesPath: null,
  })
  return {
    environment,
    cleanup: () => rmSync(themeDirectory, { recursive: true, force: true }),
  }
}

const screenshot = async (page, root, path) => {
  const output = resolve(root, path)
  mkdirSync(dirname(output), { recursive: true })
  await page.locator('[data-deck-id="main"]').screenshot({ path: output })
}

export const runScene = async ({ scenePath, outputRoot = process.cwd() }) => {
  const rawScene = parseScene(JSON.parse(readFileSync(scenePath, "utf8")))
  const scene = resolveScenePaths(rawScene, dirname(resolve(scenePath)))
  const proxy = await startProxy(scene)
  const { environment, cleanup } = frontendEnvironment(scene, proxy.url)
  const videoDirectory = mkdtempSync(join(tmpdir(), "scripted-demo-video-"))
  const originalEnvironment = { ...process.env }
  Object.assign(process.env, environment)
  const frontend = await createServer({
    configFile: scene.frontend.configFile,
    root: scene.frontend.root,
    logLevel: "error",
    server: {
      host: "127.0.0.1",
      port: await availablePort(),
      strictPort: true,
    },
    envFile: false,
  })
  for (const key of Object.keys(process.env))
    if (!(key in originalEnvironment)) delete process.env[key]
  Object.assign(process.env, originalEnvironment)
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  })

  try {
    await frontend.listen()
    const address = frontend.httpServer?.address()
    if (
      address === null ||
      address === undefined ||
      typeof address === "string"
    )
      throw new Error("Could not start capture frontend")
    const context = await browser.newContext({
      viewport: scene.viewport ?? { width: 1440, height: 1000 },
      deviceScaleFactor: 1,
      ...(scene.video ? { recordVideo: { dir: videoDirectory } } : {}),
    })
    const page = await context.newPage()
    await page.goto(`http://127.0.0.1:${address.port}${scene.path ?? "/"}`)
    await page.waitForSelector(
      scene.ready?.selector ?? '[data-deck-id="main"] [data-button-type]',
      { timeout: 30_000 },
    )
    if (scene.ready?.text)
      await page
        .getByText(scene.ready.text, { exact: false })
        .waitFor({ timeout: 30_000 })

    const startedAt = Date.now()
    for (const step of [...scene.timeline].sort((a, b) => a.atMs - b.atMs)) {
      await wait(Math.max(0, step.atMs - (Date.now() - startedAt)))
      if (step.kind === "message" || step.target === "frontend")
        proxy.broadcast(step.message)
      if (step.kind === "gesture" && step.target === "service")
        proxy.dispatchToService(step.message)
      if (step.kind === "snapshot")
        await screenshot(page, outputRoot, step.path)
    }
    if (scene.video) {
      await wait(Math.max(0, scene.video.durationMs - (Date.now() - startedAt)))
      const video = page.video()
      await page.close()
      const output = resolve(outputRoot, scene.video.path)
      mkdirSync(dirname(output), { recursive: true })
      cpSync(await video.path(), output)
    }
    await context.close()
  } finally {
    await browser.close()
    await frontend.close()
    await proxy.close()
    cleanup()
    rmSync(videoDirectory, { recursive: true, force: true })
  }
}
