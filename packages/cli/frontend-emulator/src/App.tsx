import { useEffect, useState } from "react";
import {
  ChannelRegistry,
  Deck,
  ThemeProvider,
  createWsClient,
  type ThemeContextValue,
  type DeckButton,
} from "@sireno-deck-2/cli";

import { serializeHello, type WsClient } from "./bridge.ts";

interface DeckState {
  id: string;
  name: string;
  buttons: DeckButton[];
}

const MOCK_DECK: DeckState = {
  id: "main",
  name: "Home",
  buttons: [],
};

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ?? "ws://127.0.0.1:52937") as string;

const buildThemeContext = (): ThemeContextValue => ({
  name: "default",
  cssPath: "",
  frontendPath: "",
  theme: {
    name: "default",
    apiVersion: 3,
    source: { kind: "builtin", resolvedPath: "" },
    cssPath: "",
    frontendPath: "",
  },
});

export interface AppProps {
  readonly wsUrl?: string;
  readonly initialDeviceModel?: string;
}

export const App = ({ wsUrl = ENV_WS_URL }: AppProps = {}): React.ReactElement => {
  const [deck, setDeck] = useState<DeckState>(MOCK_DECK);
  const theme = useState<ThemeContextValue>(() => buildThemeContext())[0];

  useEffect(() => {
    const client: WsClient = createWsClient({
      url: wsUrl,
      wsFactory: (url: string) => {
        const ws = new WebSocket(url);
        ws.addEventListener("open", () => {
          ws.send(serializeHello());
        });
        return ws as unknown as { send: (d: string) => void; close: () => void };
      },
      onMessage: (message: unknown) => {
        const m = message as { type?: string; surfaces?: unknown; channels?: unknown };
        if (m.type === "deck-config" && typeof m.surfaces === "object" && m.surfaces !== null) {
          const surfaces = m.surfaces as Record<string, { buttons?: unknown; id?: string; name?: string }>;
          const surface = surfaces["buttons"] ?? surfaces["main"];
          if (surface && Array.isArray(surface.buttons)) {
            setDeck({
              id: surface.id ?? "main",
              name: surface.name ?? "Home",
              buttons: surface.buttons as DeckButton[],
            });
          }
        }
        if (m.type === "state" && typeof m.channels === "object" && m.channels !== null) {
          for (const [channel, payload] of Object.entries(m.channels)) {
            ChannelRegistry.instance().publish(channel, payload);
          }
        }
      },
    });
    client.connect();
    return () => client.close();
  }, [wsUrl]);

  return (
    <ThemeProvider value={theme}>
      <main className="bg-bg text-fg flex min-h-screen flex-col items-center gap-4 p-6">
        <header className="font-mono text-xs uppercase tracking-widest text-muted">
          {deck.name} · ws: {wsUrl}
        </header>
        {deck.buttons.length === 0 ? (
          <p className="font-mono text-xs uppercase tracking-widest text-muted">
            Awaiting deck-config…
          </p>
        ) : (
          <Deck
            deck={{
              id: deck.id,
              name: deck.name,
              buttons: deck.buttons,
            }}
            onAction={(buttonId, gesture) => {
              ChannelRegistry.instance().publish("runtime:button-tap", { buttonId, gesture });
            }}
            onNavigate={(deckId) => {
              ChannelRegistry.instance().publish("runtime:navigate", { deckId });
            }}
          />
        )}
      </main>
    </ThemeProvider>
  );
};