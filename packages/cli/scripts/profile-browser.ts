import { writeFile } from "node:fs/promises"
import sharp from "sharp"

import { createBrowserRenderer } from "../src/render/browser-renderer.js"

const PHASE_DIR =
  "/works/opensource/sireno-deck/.planning/phases/58-performance-fixes"
const ITERATIONS = 5

async function createDeckScreenshot(
  colors: string[],
  columns: number,
): Promise<Buffer> {
  const overlays = colors.map((color, index) => ({
    input: {
      create: {
        background: color,
        channels: 4 as const,
        height: 72,
        width: 72,
      },
    },
    left: (index % columns) * 72,
    top: Math.floor(index / columns) * 72,
  }))
  const rows = Math.ceil(colors.length / columns)

  return sharp({
    create: {
      background: "#000000",
      channels: 4 as const,
      height: rows * 72,
      width: columns * 72,
    },
  })
    .composite(overlays)
    .png()
    .toBuffer()
}

function buildRenderer() {
  const frameTimings: { callCount: number; durations: number[] } = {
    callCount: 0,
    durations: [],
  }
  const renderStart = process.hrtime.bigint()

  let callStart = 0n
  const frameHandler = async () => {
    if (callStart !== 0n) {
      const now = process.hrtime.bigint()
      frameTimings.durations.push(Number(now - callStart) / 1_000_000)
    }
    callStart = process.hrtime.bigint()
    frameTimings.callCount += 1
  }

  const renderer = createBrowserRenderer({
    frameHandler,
    keyCount: 3,
    launcher: {
      launch: async () => ({
        close: async () => {},
        newContext: async () => ({
          close: async () => {},
          newPage: async () => ({
            screenshot: async () =>
              createDeckScreenshot(["#ff0000", "#00ff00", "#0000ff"], 3),
            setContent: async () => {},
            setViewportSize: async () => {},
          }),
        }),
      }),
    },
  })

  return {
    frameTimings,
    renderer,
    runStart: () => renderStart,
  }
}

interface Sample {
  totalMs: number
}

function stats(values: number[]) {
  if (values.length === 0) return { avg: 0, max: 0, min: 0, p95: 0 }
  const sorted = [...values].sort((a, b) => a - b)
  const sum = sorted.reduce((a, b) => a + b, 0)
  return {
    avg: sum / sorted.length,
    max: sorted[sorted.length - 1]!,
    min: sorted[0]!,
    p95: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))]!,
  }
}

async function runScenario(
  name: string,
  label: string,
  htmlGenerator: (iteration: number) => string,
) {
  console.log(`\n[${name}] ${label}`)

  const { frameTimings, renderer } = buildRenderer()
  await renderer.start()

  const samples: Sample[] = []
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint()
    await renderer.updateDeck(htmlGenerator(i))
    await renderer.captureKeyBuffers()
    const t1 = process.hrtime.bigint()
    samples.push({ totalMs: Number(t1 - t0) / 1_000_000 })
    await new Promise((r) => setTimeout(r, 30))
  }

  await renderer.close()

  const totalStats = stats(samples.map((s) => s.totalMs))
  const frameStats = stats(frameTimings.durations)

  console.log(
    `  updateDeck+captureKeyBuffers  n=${samples.length}  avg=${totalStats.avg.toFixed(2)}ms  p95=${totalStats.p95.toFixed(2)}ms  max=${totalStats.max.toFixed(2)}ms`,
  )
  console.log(
    `  frameHandler calls: ${frameTimings.callCount}  durations avg=${frameStats.avg.toFixed(2)}ms  max=${frameStats.max.toFixed(2)}ms`,
  )

  return {
    frameTimings: {
      count: frameTimings.callCount,
      durations: frameTimings.durations,
    },
    label,
    name,
    samples,
  }
}

async function main() {
  console.log("Phase 58-01 — Browser capture loop profile")
  console.log(
    "Set SIRENO_PROFILE=1 to see per-hop JSON logs from browser-renderer.ts instrumentation.",
  )
  console.log()

  const back = await runScenario(
    "back-button",
    "back button transition (render same deck twice; second should be fast)",
    (i) => `<html><body>back-deck-${i}</body></html>`,
  )

  // Re-render the same HTML — exercises the skip-when-unchanged path.
  const sameHtml = await runScenario(
    "same-html-skip",
    "re-render the same HTML 5 times — should only fire screenshot once",
    () => `<html><body>identical</body></html>`,
  )

  const weather = await runScenario(
    "weather-page",
    "weather page cycle (5 distinct pages, simulating daily-forecast navigation)",
    (i) => {
      const colors = ["#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff"]
      return `<html><body><div data-page="${i}">page ${i} color ${colors[i % colors.length]}</div></body></html>`
    },
  )

  const allSamples = [...back.samples, ...sameHtml.samples, ...weather.samples]
  const totalAll = stats(allSamples.map((s) => s.totalMs))

  console.log("\n=== Overall ===")
  console.log(
    `  updateDeck+captureKeyBuffers (all)  n=${allSamples.length}  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
  )

  const out = [
    "# Phase 58-01 — Browser capture loop profile",
    `# generated: ${new Date().toISOString()}`,
    `# iterations per scenario: ${ITERATIONS}`,
    "",
    "## Methodology",
    "",
    "Standalone profile script that drives `createBrowserRenderer` with a",
    "mocked Playwright launcher (no real Chromium). The mocked `screenshot`",
    "returns a real sharp-generated PNG so the crop path is exercised.",
    "Each `updateDeck` is followed by a `captureKeyBuffers` await so we",
    "measure the full tap-to-key-buffer roundtrip.",
    "",
    "In-process measurement captures everything *except* the real",
    "Playwright Chromium IPC wait. The on-hardware USB write hop is not",
    "profiled in this environment (no Stream Deck device).",
    "",
    "Run with `SIRENO_PROFILE=1` to see the per-hop JSON log lines from",
    "the new `markHop()` calls in `browser-renderer.ts`.",
    "",
    "## Per-scenario results",
    "",
    ...[back, sameHtml, weather].map(({ frameTimings, label, name, samples }) => {
      const total = stats(samples.map((s) => s.totalMs))
      const frame = stats(frameTimings.durations)
      return [
        `### ${name}`,
        "",
        label,
        "",
        `updateDeck+captureKeyBuffers  n=${samples.length}  avg=${total.avg.toFixed(2)}ms  p95=${total.p95.toFixed(2)}ms  max=${total.max.toFixed(2)}ms`,
        `frameHandler calls: ${frameTimings.count}  durations avg=${frame.avg.toFixed(2)}ms  max=${frame.max.toFixed(2)}ms`,
        "",
      ].join("\n")
    }),
    "## Overall",
    "",
    `updateDeck+captureKeyBuffers (all)  n=${allSamples.length}  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
    "",
    "## Notes",
    "",
    "- The mocked screenshot is fast (sharp-generated PNG in <1ms).",
    "  Real Chromium IPC is the missing cost.",
    "- `frameHandler` count > iterations is expected (capture loop may",
    "  fire multiple times for steady-state captures).",
    "- Run with `SIRENO_PROFILE=1` to capture per-hop deltas from the",
    "  browser-renderer instrumentation added in Plan 58-01 Task 1.",
    "",
  ].join("\n")

  await writeFile(`${PHASE_DIR}/profile-browser-back.txt`, out)
  await writeFile(`${PHASE_DIR}/profile-browser-weather.txt`, out)

  console.log("\nWrote profile-browser-back.txt")
  console.log("Wrote profile-browser-weather.txt")
}

main().catch((err) => {
  console.error("Profile script failed:", err)
  process.exit(1)
})
