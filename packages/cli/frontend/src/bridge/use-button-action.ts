import { useCallback } from "react"

import type { ButtonActionMessage } from "@/api/protocol-internal"

import { useWebSocketSend } from "./ws-context"

export interface UseButtonActionReturn {
  readonly fire: (gesture?: ButtonActionMessage["gesture"]) => void
}

export const useButtonAction = (
  deckId: string,
  position: number,
): UseButtonActionReturn => {
  const send = useWebSocketSend()

  const fire = useCallback(
    (gesture: ButtonActionMessage["gesture"] = "tap") => {
      if (send === null) return
      send({
        type: "button-action",
        deckId,
        position,
        gesture,
      })
    },
    [send, deckId, position],
  )

  return { fire }
}
