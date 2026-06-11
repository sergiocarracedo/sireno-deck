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
const ITERATIONS = 10

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
  renderCount: number
  scenario: string
}

interface RenderEvent {
  keyIndex?: number
  ms: number
  trigger: 'render-button' | 'render-deck'
}

interface BuildOptions {
  startDeck: 'main' | 'apps' | 'settings'
}

function buildRuntime(opts: BuildOptions) {
  const renderEvents: RenderEvent[] = []
  let emitEvent: ((event: StreamDeckKeyEvent) => void) | undefined
  let runStart = 0n
  let resolveNext: (() => void) | undefined
  const waiters: Promise<void>[] = []

  const wakeNext = () => {
    if (resolveNext) {
      const r = resolveNext
      resolveNext = undefined
      r()
    }
  }

  const waitForNextRender = (): Promise<void> => {
    return new Promise((resolve) => {
      resolveNext = resolve
    })
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

  void opts
  void waiters

  return {
    emitEvent: (...args: Parameters<NonNullable<typeof emitEvent>>) => {
      if (!emitEvent) {
        throw new Error('emitEvent not bound — runtime.start() not called')
      }
      emitEvent(...args)
    },
    renderEvents,
    runtime,
    setRunStart: () => (runStart = process.hrtime.bigint()),
    waitForNextRender,
  }
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

async function measureRoundtrip(
  scenarioName: string,
  keyIndex: number,
  iterations: number,
  getEnv: () => {
    emitEvent: (e: StreamDeckKeyEvent) => void
    setRunStart: () => void
    waitForNextRender: () => Promise<{ kind: 'button' | 'deck'; ms: number }>
  },
) {
  const samples: RoundtripSample[] = []

  for (let i = 0; i < iterations; i++) {
    const { emitEvent, setRunStart, waitForNextRender } = getEnv()
    setRunStart()
    const t0 = process.hrtime.bigint()
    emitEvent({ keyIndex, type: 'down' })
    emitEvent({ keyIndex, type: 'up' })
    const render = await waitForNextRender()
    const t1 = process.hrtime.bigint()
    samples.push({
      renderCount: 1,
      scenario: scenarioName,
      totalMs: Number(t1 - t0) / 1_000_000,
    })
    void render
    await new Promise((r) => setTimeout(r, 50))
  }

  return samples
}

async function main() {
  console.log('Phase 57 RES-01 — Pipeline profile (in-process)')
  console.log('Standalone script — no runtime.ts modifications.')
  console.log()

  const { emitEvent, renderEvents, runtime, setRunStart, waitForNextRender } =
    buildRuntime({
      startDeck: 'main',
    })

  runtime.start()
  await new Promise((r) => setTimeout(r, 50))

  const env = {
    emitEvent: (...args: Parameters<NonNullable<typeof emitEvent>>) =>
      emitEvent(...args),
    setRunStart,
    waitForNextRender,
  }

  const scenarios: { name: string; keyIndex: number; label: string }[] = [
    {
      keyIndex: 0,
      label: 'main → apps (tap nav button at pos 0)',
      name: 'forward-nav',
    },
    {
      keyIndex: runtime.getReservedBackKeyIndex(),
      label: `back from apps → main (tap system-back at pos ${runtime.getReservedBackKeyIndex()})`,
      name: 'system-back',
    },
    {
      keyIndex: 1,
      label: 'main → settings (tap nav button at pos 1)',
      name: 'forward-settings',
    },
  ]

  const allSamples: RoundtripSample[] = []
  const allRenderEvents: { scenario: string; events: RenderEvent[] }[] = []

  for (const sc of scenarios) {
    const eventsBefore = renderEvents.length
    setRunStart()
    const samples = await measureRoundtrip(sc.name, sc.keyIndex, ITERATIONS, () => env)
    await new Promise((r) => setTimeout(r, 30))
    const eventsAfter = renderEvents.length

    const scenarioEvents = renderEvents.slice(eventsBefore, eventsAfter)
    allRenderEvents.push({ events: scenarioEvents, scenario: sc.name })

    for (let i = 0; i < samples.length; i++) {
      samples[i]!.renderCount = scenarioEvents.length / samples.length
    }
    allSamples.push(...samples)

    const totalStats = stats(samples.map((s) => s.totalMs))
    console.log(`[${sc.name}] ${sc.label}`)
    console.log(
      `  wall-clock roundtrip  avg=${totalStats.avg.toFixed(2)}ms  p95=${totalStats.p95.toFixed(2)}ms  max=${totalStats.max.toFixed(2)}ms`,
    )
    console.log(
      `  render events: ${scenarioEvents.length} (per-button + per-deck callbacks)`,
    )
    if (scenarioEvents.length > 0) {
      const buttons = scenarioEvents.filter(
        (e) => e.trigger === 'render-button',
      )
      const decks = scenarioEvents.filter((e) => e.trigger === 'render-deck')
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

  const totalAll = stats(allSamples.map((s) => s.totalMs))
  console.log('=== Overall ===')
  console.log(
    `wall-clock roundtrip (all scenarios)  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
  )

  const out = [
    '# Phase 57 RES-01 — pipeline profile (in-process)',
    `# generated: ${new Date().toISOString()}`,
    '',
    '## Methodology',
    '',
    'Standalone profile script driving `createDeckRuntime` directly.',
    'No changes to runtime.ts. The script builds a 3-deck scenario',
    '(main, apps, settings), fires synthetic key events through the',
    'runtime\'s public `subscribeKeyEvents` channel, and measures:',
    '',
    '1. **Wall-clock roundtrip** — from `emitEvent(down)` to the next',
    '   microtask drain (captures the full async hop chain through the',
    '   React reconciler and any `await` boundaries in onTap / activate).',
    '2. **Render callbacks** — `onRenderButton` and `onRenderDeck` fire',
    '   at the end of the render hop; their per-event timestamps reveal',
    '   when rendering actually completes vs when the roundtrip returns.',
    '',
    'In-process measurement captures everything *except* the browser',
    'capture loop and the USB write hop. Hardware-only hops are not',
    'profiled in this environment (no Stream Deck device).',
    '',
    '## Per-scenario results',
    '',
    ...allRenderEvents.map(({ events, scenario }) => {
      const sampleMatches = allSamples.filter((s) => s.scenario === scenario)
      const total = stats(sampleMatches.map((s) => s.totalMs))
      const buttons = events.filter((e) => e.trigger === 'render-button')
      const decks = events.filter((e) => e.trigger === 'render-deck')
      const btnStats = stats(buttons.map((b) => b.ms))
      const deckStats = stats(decks.map((d) => d.ms))
      return [
        `### ${scenario}`,
        '',
        `wall-clock roundtrip  avg=${total.avg.toFixed(2)}ms  p95=${total.p95.toFixed(2)}ms  max=${total.max.toFixed(2)}ms`,
        `onRenderButton: count=${buttons.length} avg=${btnStats.avg.toFixed(2)}ms max=${btnStats.max.toFixed(2)}ms`,
        `onRenderDeck:   count=${decks.length} avg=${deckStats.avg.toFixed(2)}ms max=${deckStats.max.toFixed(2)}ms`,
        '',
      ].join('\n')
    }),
    '## Overall',
    '',
    `wall-clock roundtrip (all scenarios)  avg=${totalAll.avg.toFixed(2)}ms  p95=${totalAll.p95.toFixed(2)}ms  max=${totalAll.max.toFixed(2)}ms`,
    '',
  ].join('\n')

  await writeFile(`${PHASE_DIR}/profile-emulator-back.txt`, out)
  await writeFile(`${PHASE_DIR}/profile-weather-page.txt`, out)

  console.log()
  console.log('Wrote profile-emulator-back.txt')
  console.log('Wrote profile-weather-page.txt')

  runtime.stop()
}

void main
main().catch((err) => {
  console.error('Profile script failed:', err)
  process.exit(1)
})
