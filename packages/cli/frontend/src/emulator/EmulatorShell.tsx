import { useEffect, useState } from 'react';
import { DeviceSelector } from './DeviceSelector';
import { IframeCanvas } from './IframeCanvas';
import { SUPPORTED_DEVICES, deviceByName, type DeviceLayout } from './devices';
import { openWsClient, type WsClient } from '../ws-client';
import type { Message } from '../../../src/render/protocol';

const STORAGE_KEY = 'sireno-emulator-device';

export function EmulatorShell() {
  const initialDevice =
    typeof window !== 'undefined'
      ? deviceByName(window.localStorage.getItem(STORAGE_KEY))
      : SUPPORTED_DEVICES[2];
  const [device, setDevice] = useState<DeviceLayout>(initialDevice);
  const [client, setClient] = useState<WsClient | null>(null);
  const [conn, setConn] = useState<'connecting' | 'open' | 'closed'>('connecting');
  const [currentDeck, setCurrentDeck] = useState<string>('(awaiting)');
  const [actionLog, setActionLog] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, device.name);
    }
  }, [device]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const ws = params.get('ws');
    if (!ws) {
      setConn('closed');
      return;
    }
    const c = openWsClient({ url: ws });
    setClient(c);
    const offConn = c.onConnection(setConn);
    const offMsg = c.onMessage((msg: Message) => {
      if (msg.type === 'deck-config') setCurrentDeck(msg.deckId);
    });
    return () => {
      offConn();
      offMsg();
      c.close();
    };
  }, []);

  const onAction = (msg: Message) => {
    if (msg.type !== 'button-action') return;
    setActionLog((log) => [
      `${msg.action} key=${msg.keyIndex} @${msg.at}`,
      ...log.slice(0, 19),
    ]);
  };

  const wsUrl =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('ws') ?? ''
      : '';

  return (
    <div style={shellStyle}>
      <header style={headerStyle}>
        <DeviceSelector
          current={device}
          onChange={setDevice}
        />
        <div style={statusStyle}>
          <span style={pillStyle(pillColor(conn))}>{conn}</span>
          <span style={{ marginLeft: 8 }}>deck: {currentDeck}</span>
        </div>
      </header>
      <main style={mainStyle}>
        <IframeCanvas
          wsUrl={wsUrl}
          device={device}
          send={(msg) => client?.send(msg) ?? console.warn('no ws client', msg)}
          onAction={onAction}
        />
      </main>
      <footer style={footerStyle}>
        <strong style={{ marginRight: 8 }}>action log:</strong>
        {actionLog.length === 0 ? (
          <em style={{ color: 'var(--sireno-text-muted, #888)' }}>
            click a button in the deck above to send a button-action over WS
          </em>
        ) : (
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {actionLog.map((line, i) => (
              <li key={i} style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {line}
              </li>
            ))}
          </ul>
        )}
      </footer>
    </div>
  );
}

function pillColor(conn: 'connecting' | 'open' | 'closed'): string {
  if (conn === 'open') return 'var(--sireno-success, #4ade80)';
  if (conn === 'connecting') return 'var(--sireno-accent, #fbbf24)';
  return 'var(--sireno-danger, #f87171)';
}

const shellStyle = {
  minHeight: '100vh',
  background: 'var(--sireno-surface, #1a1a1a)',
  color: 'var(--sireno-text, #f5f5f5)',
  display: 'flex',
  flexDirection: 'column' as const,
  fontFamily: 'system-ui, sans-serif',
};

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderBottom: '1px solid var(--sireno-border, #444)',
};

const statusStyle = {
  padding: '8px 12px',
  fontSize: 13,
  display: 'flex',
  alignItems: 'center',
};

function pillStyle(color: string): React.CSSProperties {
  return {
    padding: '2px 8px',
    borderRadius: 4,
    background: color,
    color: '#000',
    fontWeight: 600,
    fontSize: 11,
    textTransform: 'uppercase' as const,
  };
}

const mainStyle = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
};

const footerStyle = {
  borderTop: '1px solid var(--sireno-border, #444)',
  padding: '12px 16px',
  fontSize: 13,
  minHeight: 80,
  maxHeight: 200,
  overflowY: 'auto' as const,
};