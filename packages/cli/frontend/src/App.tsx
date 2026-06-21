import { useEffect, useMemo, useState } from 'react';
import type { DeckConfigMessage, Message } from '../../src/render/protocol';
import { Deck } from './Deck';
import { openWsClient, readWsUrlFromLocation, type WsConnectionState, type WsClient } from './ws-client';

export function App() {
  const wsUrl = useMemo(() => readWsUrlFromLocation(), []);
  const [client, setClient] = useState<WsClient | null>(null);
  const [conn, setConn] = useState<WsConnectionState>('connecting');
  const [deck, setDeck] = useState<DeckConfigMessage | null>(null);

  useEffect(() => {
    if (!wsUrl) {
      // eslint-disable-next-line no-console
      console.warn('[app] no ws query param (?ws=...) — running offline');
      setConn('closed');
      return;
    }
    const c = openWsClient({ url: wsUrl });
    setClient(c);
    const offConn = c.onConnection(setConn);
    const offMsg = c.onMessage((msg: Message) => {
      if (msg.type === 'deck-config') setDeck(msg);
    });
    return () => {
      offConn();
      offMsg();
      c.close();
    };
  }, [wsUrl]);

  if (!wsUrl) {
    return <div style={offlineStyle}>offline — no WS URL in query string</div>;
  }
  if (conn === 'connecting') {
    return <div style={offlineStyle}>connecting to {wsUrl}…</div>;
  }
  if (conn === 'closed') {
    return <div style={offlineStyle}>disconnected — retrying…</div>;
  }
  if (!deck) {
    return <div style={offlineStyle}>awaiting deck-config…</div>;
  }
  return <Deck deckConfig={deck} />;
}

const offlineStyle: React.CSSProperties = {
  width: '100vw',
  height: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'var(--sireno-surface, #1a1a1a)',
  color: 'var(--sireno-text, #f5f5f5)',
  fontFamily: 'system-ui, sans-serif',
  fontSize: 16,
};