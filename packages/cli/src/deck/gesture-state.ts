import { DOUBLE_TAP_DELAY_MS } from '@/addon/api'

export { DOUBLE_TAP_DELAY_MS }

export type ButtonGestureState = {
  pendingDblTapTimer?: NodeJS.Timeout
  holdTimer?: NodeJS.Timeout
  holdTriggered?: boolean
}

export type DispatchGestureEndCallbacks = {
  onTap: () => Promise<void> | void
  onDblTap?: () => Promise<void> | void
  onHold?: () => Promise<void> | void
  reportError: (err: unknown) => void
  keyIndex: number
}

export async function dispatchGestureEnd(
  state: ButtonGestureState | undefined,
  callbacks: DispatchGestureEndCallbacks,
  stateKey: string,
  gestureStates: Map<string, ButtonGestureState>,
): Promise<void> {
  if (state?.holdTriggered) {
    gestureStates.delete(stateKey)
    return
  }

  if (state?.pendingDblTapTimer) {
    clearTimeout(state.pendingDblTapTimer)
    gestureStates.delete(stateKey)
    if (callbacks.onDblTap) {
      try {
        await callbacks.onDblTap()
      } catch (error) {
        callbacks.reportError(error)
      }
    }
    return
  }

  const timer = setTimeout(() => {
    gestureStates.delete(stateKey)
    void Promise.resolve(callbacks.onTap())
      .then(() => undefined)
      .catch(callbacks.reportError)
  }, DOUBLE_TAP_DELAY_MS)
  gestureStates.set(stateKey, { ...state, pendingDblTapTimer: timer })
}
