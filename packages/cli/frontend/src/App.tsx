import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useWsClient } from './hooks/useWsClient';
import type { DeckConfigMessage, Message } from '../../src/render/protocol';

export function App() {
  const wsUrl = readWsUrlFromLocation();
  const { connection, client } = useWsClient(wsUrl);
  const [deck, setDeck] = useState<DeckConfigMessage | null>(null);

  useEffect(() => {
    if (!client) return;
    const off = client.onMessage((msg: Message) => {
      if (msg.type === 'deck-config') {
        const cfg = msg;
        setDeck(cfg);
        const isOverlay =
          cfg.navMode === 'replace';
        const path = `/decks/${encodeURIComponent(cfg.deckId)}`;
        if (isOverlay) window.history.replaceState(null, '', path);
        else if (window.location.pathname !== path) {
          window.history.pushState(null, '', path);
        }
      }
    });
    return off;
  }, [client]);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--sireno-surface, #1a1a1a)' }}>
      {connection === 'connecting' && (
        <div style={offlineStyle}>connecting to {wsUrl}…</div>
      )}
      {connection === 'closed' && (
        <div style={offlineStyle}>disconnected — retrying…</div>
      )}
      {connection === 'open' && !deck && (
        <div style={offlineStyle}>awaiting deck-config…</div>
      )}
      <Outlet context={{ deck }} />
    </div>
  );
}

function readWsUrlFromLocation(): string | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('ws');
}

const offlineStyle: React.CSSProperties = {
  padding: 24,
  color: 'var(--sireno-text, #f5f5f5)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
};