import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  type ButtonGestureState,
  DOUBLE_TAP_DELAY_MS,
  type DispatchGestureEndCallbacks,
  dispatchGestureEnd,
} from '../gesture-state'

const FLUSH_BUFFER_MS = 50

const keyIndex = 0

function makeCallbacks(
  overrides: Partial<DispatchGestureEndCallbacks> = {},
): { callbacks: DispatchGestureEndCallbacks; onTap: ReturnType<typeof vi.fn>; onDblTap: ReturnType<typeof vi.fn>; reportError: ReturnType<typeof vi.fn> } {
  const onTap = vi.fn(async () => undefined)
  const onDblTap = vi.fn(async () => undefined)
  const reportError = vi.fn()
  return {
    callbacks: {
      onTap,
      onDblTap,
      reportError,
      keyIndex,
      ...overrides,
    },
    onTap,
    onDblTap,
    reportError,
  }
}

describe('dispatchGestureEnd', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires onTap exactly once after DOUBLE_TAP_DELAY_MS for a single press (no-dbltap path)', async () => {
    const gestureStates = new Map<string, ButtonGestureState>()
    const { callbacks, onTap, reportError } = makeCallbacks({
      onDblTap: undefined,
    })

    await dispatchGestureEnd(undefined, callbacks, 'k0', gestureStates)
    expect(onTap).not.toHaveBeenCalled()
    expect(gestureStates.get('k0')?.pendingDblTapTimer).toBeDefined()

    await vi.advanceTimersByTimeAsync(DOUBLE_TAP_DELAY_MS + FLUSH_BUFFER_MS)

    expect(onTap).toHaveBeenCalledTimes(1)
    expect(reportError).not.toHaveBeenCalled()
    expect(gestureStates.has('k0')).toBe(false)
  })

  it('fires onTap 0 times when a button without onDblTap is double-pressed within the window', async () => {
    const gestureStates = new Map<string, ButtonGestureState>()
    const { callbacks, onTap, reportError } = makeCallbacks({
      onDblTap: undefined,
    })

    await dispatchGestureEnd(undefined, callbacks, 'k0', gestureStates)
    expect(gestureStates.get('k0')?.pendingDblTapTimer).toBeDefined()

    await vi.advanceTimersByTimeAsync(100)
    const secondState = gestureStates.get('k0')
    expect(secondState?.pendingDblTapTimer).toBeDefined()

    await dispatchGestureEnd(secondState, callbacks, 'k0', gestureStates)

    await vi.advanceTimersByTimeAsync(DOUBLE_TAP_DELAY_MS + FLUSH_BUFFER_MS)

    expect(onTap).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(gestureStates.has('k0')).toBe(false)
  })

  it('fires onDblTap exactly once when a button with both callbacks is double-pressed', async () => {
    const gestureStates = new Map<string, ButtonGestureState>()
    const { callbacks, onTap, onDblTap, reportError } = makeCallbacks()

    await dispatchGestureEnd(undefined, callbacks, 'k0', gestureStates)
    const pendingState = gestureStates.get('k0')
    expect(pendingState?.pendingDblTapTimer).toBeDefined()

    await vi.advanceTimersByTimeAsync(100)
    await dispatchGestureEnd(pendingState, callbacks, 'k0', gestureStates)

    expect(onDblTap).toHaveBeenCalledTimes(1)
    expect(onTap).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(gestureStates.has('k0')).toBe(false)
  })

  it('does nothing when state.holdTriggered is true (hold won the race)', async () => {
    const gestureStates = new Map<string, ButtonGestureState>([
      ['k0', { holdTriggered: true }],
    ])
    const { callbacks, onTap, onDblTap, reportError } = makeCallbacks()

    await dispatchGestureEnd(gestureStates.get('k0'), callbacks, 'k0', gestureStates)
    await vi.advanceTimersByTimeAsync(DOUBLE_TAP_DELAY_MS + FLUSH_BUFFER_MS)

    expect(onTap).not.toHaveBeenCalled()
    expect(onDblTap).not.toHaveBeenCalled()
    expect(reportError).not.toHaveBeenCalled()
    expect(gestureStates.has('k0')).toBe(false)
  })

  it('keeps gesture state isolated across keys when two buttons are pressed concurrently', async () => {
    const gestureStates = new Map<string, ButtonGestureState>()

    const tapOnly = makeCallbacks({ onDblTap: undefined })
    const dblTapOnly = makeCallbacks({ onTap: vi.fn(async () => undefined) })

    await dispatchGestureEnd(undefined, tapOnly.callbacks, 'a', gestureStates)
    await dispatchGestureEnd(undefined, dblTapOnly.callbacks, 'b', gestureStates)
    expect(gestureStates.get('a')?.pendingDblTapTimer).toBeDefined()
    expect(gestureStates.get('b')?.pendingDblTapTimer).toBeDefined()

    await vi.advanceTimersByTimeAsync(100)

    await dispatchGestureEnd(gestureStates.get('a'), tapOnly.callbacks, 'a', gestureStates)
    await dispatchGestureEnd(gestureStates.get('b'), dblTapOnly.callbacks, 'b', gestureStates)

    await vi.advanceTimersByTimeAsync(DOUBLE_TAP_DELAY_MS + FLUSH_BUFFER_MS)

    expect(tapOnly.onTap).not.toHaveBeenCalled()
    expect(dblTapOnly.onDblTap).toHaveBeenCalledTimes(1)
    expect(gestureStates.has('a')).toBe(false)
    expect(gestureStates.has('b')).toBe(false)
  })

  it('preserves holdTimer and holdTriggered when scheduling onTap (Phase 56 spread discipline)', async () => {
    const gestureStates = new Map<string, ButtonGestureState>()
    const holdTimer = setTimeout(() => undefined, 999_999)
    const preExistingState: ButtonGestureState = {
      holdTimer,
      holdTriggered: false,
    }
    gestureStates.set('k0', preExistingState)

    const { callbacks } = makeCallbacks({ onDblTap: undefined })

    await dispatchGestureEnd(preExistingState, callbacks, 'k0', gestureStates)

    const after = gestureStates.get('k0')
    expect(after).toBeDefined()
    expect(after?.holdTimer).toBe(holdTimer)
    expect(after?.holdTriggered).toBe(false)
    expect(after?.pendingDblTapTimer).toBeDefined()

    clearTimeout(holdTimer)
    if (after?.pendingDblTapTimer) clearTimeout(after.pendingDblTapTimer)
  })
})
