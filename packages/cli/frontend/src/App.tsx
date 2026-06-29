import { useEffect, useRef, useState } from "react";
import { token } from "virtual:sireno/token";
import { activeTheme } from "virtual:sireno/themes/manifest";

import { ChannelRegistry } from "sireno-deck-2/react";
import { ThemeProvider, type ThemeContextValue } from "@/themes/index";
import { ThemeUiPresentationProvider } from "@sireno-deck-2/cli";
import { createWsClient, type WsClient } from "./bridge/client";
import { Deck } from "./components/Deck";

interface DeckButton {
  id: string;
  type: string;
  config: Record<string, unknown>;
}

interface DeckState {
  id: string;
  name: string;
  buttons: DeckButton[];
}

const EMPTY_DECK: DeckState = {
  id: "",
  name: "",
  buttons: [],
};

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ?? "ws://127.0.0.1:52937") as string;

const resolvePortFromWindow = (): number | undefined => {
  if (typeof window === "undefined") return undefined;
  return (window as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__;
};

const wsUrl = (): string => {
  const port = resolvePortFromWindow();
  if (port !== undefined) return `ws://127.0.0.1:${port}`;
  return ENV_WS_URL;
};

const buildThemeContext = (): ThemeContextValue => {
  if (activeTheme) {
    return {
      name: activeTheme.name,
      cssPath: "",
      frontendPath: activeTheme.frontendPath,
      theme: {
        name: activeTheme.name,
        apiVersion: 3,
        source: { kind: "builtin", resolvedPath: activeTheme.frontendPath },
        cssPath: "",
        frontendPath: activeTheme.frontendPath,
      },
    };
  }
  return {
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
  };
};

let _wsClientInitialized = false;

export const App = () => {
  const [deck, setDeck] = useState<DeckState>(EMPTY_DECK);
  const [theme] = useState<ThemeContextValue>(() => buildThemeContext());
  const clientRef = useRef<WsClient | null>(null);

  useEffect(() => {
    if (_wsClientInitialized) return;
    _wsClientInitialized = true;
    const url = wsUrl();
    const client = createWsClient({
      url,
      ...(token !== "" ? { token } : {}),
      onMessage: (message) => {
        if (message.type === "deck-config") {
          const surface = (message.surfaces as Record<string, { name?: string; buttons?: DeckButton[] }>)[message.deckId];
          if (surface && Array.isArray(surface.buttons)) {
            setDeck({
              id: message.deckId,
              name: surface.name ?? message.deckId,
              buttons: surface.buttons,
            });
          }
        }
        if (message.type === "state") {
          for (const [channel, payload] of Object.entries(message.channels)) {
            ChannelRegistry.instance().publish(channel, payload);
          }
        }
      },
    });
    clientRef.current = client;
    client.connect();
    return () => {
      _wsClientInitialized = false;
      client.close();
    };
  }, []);

  return (
    <ThemeProvider value={theme}>
      <ThemeUiPresentationProvider value={{}}>
        <main className="bg-bg text-fg flex min-h-screen items-center justify-center">
          <Deck
            deck={deck}
            onNavigate={() => {
              /* wired via deck-config */
            }}
            onAction={(buttonId) => {
              ChannelRegistry.instance().publish("runtime:button-tap", { buttonId });
            }}
          />
        </main>
      </ThemeUiPresentationProvider>
    </ThemeProvider>
  );
};