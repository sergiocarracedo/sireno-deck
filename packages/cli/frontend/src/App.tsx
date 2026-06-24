import { useEffect, useState } from "react";
import { token } from "virtual:sireno/token";
import { activeTheme } from "virtual:sireno/themes/manifest";

import { ChannelRegistry } from "sireno-deck-2/react";
import { ThemeProvider, type ThemeContextValue } from "@/themes/index.ts";
import { createWsClient } from "./bridge/client.ts";
import { Deck } from "./components/Deck.tsx";

interface MockButton {
  id: string;
  type: string;
  label: string;
  config: Record<string, unknown>;
}

const MOCK_DECK = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core:action", label: "Run", config: { command: "echo hi" } },
  ] as MockButton[],
};

const wsUrl = (): string => {
  if (typeof window === "undefined") return "ws://127.0.0.1:0";
  const port = (window as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__;
  return port !== undefined ? `ws://127.0.0.1:${port}` : "ws://127.0.0.1:0";
};

const buildThemeContext = (): ThemeContextValue | null => {
  if (!activeTheme) return null;
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
};

export const App = () => {
  const [deck, setDeck] = useState(MOCK_DECK);
  const [theme, setTheme] = useState<ThemeContextValue | null>(() => buildThemeContext());

  useEffect(() => {
    const url = wsUrl();
    const client = createWsClient({
      url,
      ...(token !== "" ? { token } : {}),
      onMessage: (message) => {
        if (message.type === "deck-config") {
          const surfaces = message.surfaces as Record<string, { buttons?: MockButton[] }>;
          const buttons = surfaces["buttons"];
          if (Array.isArray(buttons)) {
            setDeck((prev) => ({ ...prev, buttons }));
          }
        }
        if (message.type === "state") {
          for (const [channel, payload] of Object.entries(message.channels)) {
            ChannelRegistry.instance().publish(channel, payload);
          }
        }
      },
    });
    client.connect();
    return () => client.close();
  }, []);

  if (!theme) {
    return (
      <main className="bg-bg text-fg flex min-h-screen items-center justify-center font-mono text-xs uppercase tracking-widest text-muted">
        No theme configured
      </main>
    );
  }

  return (
    <ThemeProvider value={theme}>
      <main className="bg-bg text-fg flex min-h-screen flex-col items-center justify-center gap-6 p-8">
        <header className="font-mono text-xs uppercase tracking-widest text-muted">
          {deck.name} · ws: {token === "" ? "dev" : "authed"} · theme: {theme.name}
        </header>
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
    </ThemeProvider>
  );
};
