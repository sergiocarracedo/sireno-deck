import { useEffect, useState } from 'react';
import { openWsClient, type WsClient, type WsConnectionState } from '../ws-client';

export function useWsClient(url: string | null): {
  client: WsClient | null;
  connection: WsConnectionState;
} {
  const [client, setClient] = useState<WsClient | null>(null);
  const [connection, setConnection] = useState<WsConnectionState>('connecting');

  useEffect(() => {
    if (!url) {
      setConnection('closed');
      return;
    }
    const c = openWsClient({ url });
    setClient(c);
    const off = c.onConnection(setConnection);
    return () => {
      off();
      c.close();
    };
  }, [url]);

  return { client, connection };
}