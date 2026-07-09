import { useMemo, useRef, useState } from "react"

import { DEVICE_MODELS, type DeviceModelSpec } from "@sireno-deck/cli"

import { createWsClient, serializeHello, type WsClient } from "./bridge"
import { DeckFrame } from "./DeckFrame"
import { SidePanel } from "./SidePanel"

const FALLBACK_DECKS: ReadonlyArray<{ id: string; name: string }> = [
  { id: "main", name: "Main" },
]

export interface ShellProps {
  readonly wsUrl: string
  readonly frontendUrl: string
  readonly initialDeviceModel: string
  readonly token?: string
}

export const Shell = ({
  wsUrl,
  frontendUrl,
  initialDeviceModel,
  token,
}: ShellProps): React.ReactElement => {
  const initialSpec: DeviceModelSpec =
    DEVICE_MODELS.find((m) => m.id === initialDeviceModel) ?? DEVICE_MODELS[0]!

  const [activeDeckId, setActiveDeckId] = useState<string>("main")

  const sidePanelDecks = FALLBACK_DECKS
  const [deviceModel, setDeviceModel] = useState<DeviceModelSpec>(initialSpec)
  const clientRef = useRef<WsClient | null>(null)

  const sendJson = (data: unknown): void => {
    clientRef.current?.send(JSON.stringify(data))
  }

  const handleGesture = (msg: {
    deckId: string
    position: number
    gesture: "tap" | "dbl-tap" | "hold"
  }): void => {
    sendJson(msg)
  }

  useMemo(() => {
    const client = createWsClient({
      url: wsUrl,
      ...(token !== undefined ? { token } : {}),
      wsFactory: (url: string) => {
        const ws = new WebSocket(url)
        ws.addEventListener("open", () => ws.send(serializeHello(token)))
        return ws as unknown as { send: (d: string) => void; close: () => void }
      },
    })
    clientRef.current = client
    return () => client.close()
  }, [wsUrl, token])

  return (
    <div
      data-testid="emulator-shell"
      className="grid h-full grid-cols-[280px_1fr] bg-neutral-950 text-neutral-100"
    >
      <aside className="border-r border-neutral-800 bg-neutral-900/60 p-4 overflow-y-auto">
        <SidePanel
          wsUrl={wsUrl}
          deviceModel={deviceModel}
          onDeviceModelChange={setDeviceModel}
          decks={sidePanelDecks}
          activeDeckId={activeDeckId}
          onSelectDeck={setActiveDeckId}
        />
      </aside>
      <main className="flex items-center justify-center bg-neutral-950 p-8">
        <DeckFrame
          frontendUrl={frontendUrl}
          device={deviceModel}
          deckId={activeDeckId}
          onGesture={handleGesture}
        />
      </main>
    </div>
  )
}
