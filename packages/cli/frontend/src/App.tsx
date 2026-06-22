import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useWsClient } from './hooks/useWsClient';
import type { DeckConfigMessage, Message } from '../../src/render/protocol';

export function App() {
  const wsUrl = readWsUrlFromLocation();
  const { connection, client } = useWsClient(wsUrl);
  const [deck, setDeck] = useState<DeckConfigMessage | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!client) return;
    const off = client.onMessage((msg: Message) => {
      if (msg.type === 'deck-config') {
        const cfg = msg;
        setDeck(cfg);
        const isOverlay = cfg.navMode === 'replace';
        const path = `/decks/${encodeURIComponent(cfg.deckId)}`;
        // Preserve the current query string (?ws=...) so the WS bridge
        // URL survives navigation. Without this the React app disconnects
        // immediately after the first deck-config arrives.
        const target = path + window.location.search;
        if (isOverlay) navigate(target, { replace: true });
        else if (window.location.pathname + window.location.search !== target) {
          navigate(target);
        }
      }
    });
    return off;
  }, [client, navigate]);

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