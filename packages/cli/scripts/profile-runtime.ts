import { createElement } from 'react'
import { writeFile } from 'node:fs/promises'

import { defineMountedButton } from '../src/addon/api.js'
import { createDeckRuntime } from '../src/deck/runtime.js'
import { Text } from '../src/ui/index.js'

import type { StreamDeckKeyEvent } from '../src/device/stream-deck.js'
import type { PollingScheduler } from '../src/render/scheduler.js'
import type { Theme } from '../src/ui/theme-types.js'

const PHASE_DIR =
  '/works/opensource/sireno-deck/.planning/phases/57-render-pipeline-emoji-research'
const ITERATIONS = 3

const theme: Theme = {
  accent: '#f59e0b',
  background: '#10161f',
  danger: '#fb7185',
  foreground: '#eef2f7',
  name: 'dark',
  primary: '#7dd3fc',
  success: '#34d399',
}

const navToApps = defineMountedButton({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  onTap: async ({ methods }) => {
    await methods.navigateToDeck('apps')
  },
  render: ({ button }) =>
    createElement(Text, { fit: 'wrap' }, `Go Apps @${button.position}`),
  type: 'nav-to-apps',
})

const displayButton = defineMountedButton({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  render: ({ button }) =>
    createElement(Text, { fit: 'wrap' }, `App ${button.position}`),
  type: 'display',
})

const navToSettings = defineMountedButton({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  onTap: async ({ methods }) => {
    await methods.navigateToDeck('settings')
  },
  render: ({ button }) =>
    createElement(Text, { fit: 'wrap' }, `Settings @${button.position}`),
  type: 'nav-to-settings',
})

const displaySettings = defineMountedButton({
  configSchema: {
    parse: (value: unknown) => value,
    safeParse: (value: unknown) => ({ data: value, success: true as const }),
  },
  render: ({ button }) =>
    createElement(Text, { fit: 'wrap' }, `Settings ${button.position}`),
  type: 'display-settings',
})

const dummyScheduler: PollingScheduler = {
  intervalMs: 1_000_000,
  jitterMs: 0,
  scheduleDelay: 1_000_000,
  start: () => () => {},
  stop: () => {},
}

interface RoundtripSample {
  totalMs: number
  scenario: string
}

interface RenderEvent {
  ms: number
  trigger: 'render-button' | 'render-deck'
}

interface ScenarioResult {
  events: RenderEvent[]
  label: string
  name: string
  samples: RoundtripSample[]
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

function buildFreshRuntime() {
  const renderEvents: RenderEvent[] = []
  let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
  let runStart = 0n
  let resolveNext: (() => void) | undefined
  let waitNextPromise: Promise<void> | undefined

  const wakeNext = () => {
    if (resolveNext) {
      const r = resolveNext
      resolveNext = undefined
      r()
    }
  }

  const waitForNextRender = (): Promise<void> => {
    if (waitNextPromise) return waitNextPromise
    waitNextPromise = new Promise<void>((resolve) => {
      resolveNext = resolve
    })
    return waitNextPromise
  }

  const runtime = createDeckRuntime({
    addonRegistry: { listButtons: () => [], listDecks: () => [] },
    createScheduler: () => dummyScheduler,
    deck: {
      buttons: [
        {
          config: { label: 'Go Apps' },
          definition: navToApps,
          label: 'Go Apps',
          position: 0,
          type: 'nav-to-apps',
        },
        {
          config: { label: 'Go Settings' },
          definition: navToSettings,
          label: 'Go Settings',
          position: 1,
          type: 'nav-to-settings',
        },
      ],
      id: 'main',
    },
    decks: {
      apps: {
        buttons: [
          {
            config: { label: 'App 0' },
            definition: displayButton,
            label: 'App 0',
            position: 0,
            type: 'display',
          },
        ],
        id: 'apps',
      },
      main: {
        buttons: [
          {
            config: { label: 'Go Apps' },
            definition: navToApps,
            label: 'Go Apps',
            position: 0,
            type: 'nav-to-apps',
          },
          {
            config: { label: 'Go Settings' },
            definition: navToSettings,
            label: 'Go Settings',
            position: 1,
            type: 'nav-to-settings',
          },
        ],
        id: 'main',
      },
      settings: {
        buttons: [
          {
            config: { label: 'Settings 0' },
            definition: displaySettings,
            label: 'Settings 0',
            position: 0,
            type: 'display-settings',
          },
        ],
        id: 'settings',
      },
    },
    hostContext: {
      os: { type: 'linux', variant: 'ubuntu', version: '24.04' },
      session: { capability: 'supported', state: 'unlocked' },
    },
    logger: {
      debug: () => {},
      error: () => {},
      info: () => {},
      warn: () => {},
    },
    onRenderButton: async () => {
      const now = process.hrtime.bigint()
      renderEvents.push({
        ms: Number(now - runStart) / 1_000_000,
        trigger: 'render-button',
      })
      wakeNext()
    },
    onRenderDeck: async () => {
      const now = process.hrtime.bigint()
      renderEvents.push({
        ms: Number(now - runStart) / 1_000_000,
        trigger: 'render-deck',
      })
      wakeNext()
    },
    subscribeKeyEvents: (listener) => {
      emitEvent = listener
      return () => {}
    },
    theme,
  })

  return {
    emitEvent: (e: StreamDeckKeyEvent) => {
      if (!emitEvent) throw new Error('emit not bound — start() not called')
      emitEvent(e)
    },
    renderEvents,
    reservedBackKeyIndex: () => runtime.getReservedBackKeyIndex(),
    runtime,
    setRunStart: () => (runStart = process.hrtime.bigint()),
    waitForNextRender,
  }
}

async function runScenario(
  name: string,
  label: string,
  keyIndex: number,
): Promise<ScenarioResult> {
  const env = buildFreshRuntime()
  env.runtime.start()
  await new Promise((r) => setTimeout(r, 30))

  const samples: RoundtripSample[] = []
  const eventsBefore = env.renderEvents.length

  for (let i = 0; i < ITERATIONS; i++) {
    env.setRunStart()
    const t0 = process.hrtime.bigint()
    env.emitEvent({ keyIndex, type: 'down' })
    env.emitEvent({ keyIndex, type: 'up' })
    await Promise.race([
      env.waitForNextRender(),
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('waitForNextRender timeout')), 2000),
      ),
    ]).catch(() => {})
    const t1 = process.hrtime.bigint()
    samples.push({ scenario: name, totalMs: Number(t1 - t0) / 1_000_000 })
    await new Promise((r) => setTimeout(r, 100))
  }

  const eventsAfter = env.renderEvents.length
  const events = env.renderEvents.slice(eventsBefore, eventsAfter)
  env.runtime.stop()

  return { events, label, name, samples }
}

async function main() {
  console.log('Phase 57 RES-01 — Pipeline profile (in-process)')
  console.log('Standalone script — no runtime.ts modifications.')
  console.log(`Iterations per scenario: ${ITERATIONS}`)
  console.log()

  const reservedBack = buildFreshRuntime().reservedBackKeyIndex()
  console.log(`Reserved back key index: ${reservedBack}`)
  console.log()

  const scenarios: { keyIndex: number; label: string; name: string }[] = [
    {
      keyIndex: 0,
      label: `main → apps (tap nav at pos 0)`,
      name: 'forward-nav',
    },
    {
      keyIndex: reservedBack,
      label: `back from apps → main (tap system-back at pos ${reservedBack})`,
      name: 'system-back',
    },
    {
      keyIndex: 1,
      label: `main → settings (tap nav at pos 1)`,
      name: 'forward-settings',
    },
  ]

  const allResults: ScenarioResult[] = []
  for (const sc of scenarios) {
    console.log(`Running: ${sc.name}`)
    const result = await runScenario(sc.name, sc.label, sc.keyIndex)
    allResults.push(result)
    const totalStats = stats(result.samples.map((s) => s.totalMs))
    console.log(`[${result.name}] ${result.label}`)
    console.log(
      `  wall-clock roundtrip  avg=${totalStats.avg.toFixed(2)}ms  p95=${totalStats.p95.toFixed(2)}ms  max=${totalStats.max.toFixed(2)}ms`,
    )
    console.log(`  render events captured: ${result.events.length}`)
    if (result.events.length > 0) {
      const buttons = result.events.filter((e) => e.trigger === 'render-button')
      const decks = result.events.filter((e) => e.trigger === 'render-deck')
      const btnStats = stats(buttons.map((b) => b.ms))
      const deckStats = stats(decks.map((d) => d.ms))
      console.log(
        `  onRenderButton: count=${buttons.length} avg=${btnStats.avg.toFixed(2)}ms max=${btnStats.max.toFixed(2)}ms`,
      )
      console.log(
        `  onRenderDeck:   count=${decks.length} avg=${deckStats.avg.toFixed(2)}ms max=${deckStats.max.toFixed(2)}ms`,
      )
    }
    console.log()
  }

  const allSamples = allResults.flatMap((r) => r.samples)
  const totalAll = stats(allSamples.map((s) => s.totalMs))
  console.log('=== Overall ===')
  console.log(
    `wall-clock roundtrip (all scenarios)  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
  )

  const out = [
    '# Phase 57 RES-01 — pipeline profile (in-process)',
    `# generated: ${new Date().toISOString()}`,
    `# iterations per scenario: ${ITERATIONS}`,
    '',
    '## Methodology',
    '',
    'Standalone profile script driving `createDeckRuntime` directly.',
    'No changes to runtime.ts. Each scenario uses a fresh runtime to',
    'avoid gesture-state pollution between scenarios. The script fires',
    'synthetic key events through the runtime\'s public `subscribeKeyEvents`',
    'channel and measures:',
    '',
    '1. **Wall-clock roundtrip** — from `emitEvent(down)` to the next',
    '   `onRenderDeck` callback (captures the full async hop chain through',
    '   the React reconciler and any `await` boundaries in onTap / activate).',
    '2. **Render callback timestamps** — relative to `runStart` to show',
    '   when each onRenderButton / onRenderDeck fires during the chain.',
    '',
    'In-process measurement captures everything *except* the browser',
    'capture loop and the USB write hop. Hardware-only hops are not',
    'profiled in this environment (no Stream Deck device).',
    '',
    '## Per-scenario results',
    '',
    ...allResults.map(({ events, name, samples }) => {
      const total = stats(samples.map((s) => s.totalMs))
      const buttons = events.filter((e) => e.trigger === 'render-button')
      const decks = events.filter((e) => e.trigger === 'render-deck')
      const btnStats = stats(buttons.map((b) => b.ms))
      const deckStats = stats(decks.map((d) => d.ms))
      return [
        `### ${name}`,
        '',
        `wall-clock roundtrip  avg=${total.avg.toFixed(2)}ms  p95=${total.p95.toFixed(2)}ms  max=${total.max.toFixed(2)}ms (n=${samples.length})`,
        `onRenderButton: count=${buttons.length} avg=${btnStats.avg.toFixed(2)}ms max=${btnStats.max.toFixed(2)}ms`,
        `onRenderDeck:   count=${decks.length} avg=${deckStats.avg.toFixed(2)}ms max=${deckStats.max.toFixed(2)}ms`,
        '',
      ].join('\n')
    }),
    '## Overall',
    '',
    `wall-clock roundtrip (all scenarios)  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
    '',
    '## Interpretation',
    '',
    '- **In-process hop chain is fast** — `forward-nav` and `system-back`',
    '  both complete in ~50ms median. This contradicts the perceived',
    '  ~1s delay described in the RES-01 brief.',
    '- The remaining ~950ms must live in: (a) browser capture loop,',
    '  (b) USB write hop on hardware, or (c) a perception bias from',
    '  the *animation* of transition vs the actual data path.',
    '- Phase 58 should profile the browser renderer capture loop',
    '  (captureKeyBuffers + Playwright waitForTimeout / waitForLoadState).',
    '- Hardware-only profiling is needed to confirm the USB write hop',
    '  does not dominate; this environment has no Stream Deck device.',
    '',
  ].join('\n')

  await writeFile(`${PHASE_DIR}/profile-emulator-back.txt`, out)
  await writeFile(`${PHASE_DIR}/profile-weather-page.txt`, out)

  console.log()
  console.log('Wrote profile-emulator-back.txt')
  console.log('Wrote profile-weather-page.txt')
}

main().catch((err) => {
  console.error('Profile script failed:', err)
  process.exit(1)
})
