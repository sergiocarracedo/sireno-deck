import { createContext, useContext, type ReactNode } from "react"

import type { WsMessage } from "@/api/protocol-internal"

export interface WebSocketSend {
  send(message: WsMessage): void
}

const WebSocketContext = createContext<WebSocketSend | null>(null)

export interface WebSocketProviderProps {
  readonly value: WebSocketSend | null
  readonly children: ReactNode
}

export const WebSocketProvider = ({
  value,
  children,
}: WebSocketProviderProps) => (
  <WebSocketContext.Provider value={value}>
    {children}
  </WebSocketContext.Provider>
)

export const useWebSocketSend = (): WebSocketSend | null =>
  useContext(WebSocketContext)
