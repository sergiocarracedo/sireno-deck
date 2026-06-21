import { describe, it, expect, afterEach } from 'vitest';
import { WebSocket } from 'ws';
import { createWsBridge, type WsBridgeHandle } from '../ws-bridge.js';
import {
  PROTOCOL_VERSION,
  type ButtonActionMessage,
  type DeckConfigMessage,
} from '../protocol.js';

function silentLogger() {
  const make = () => ({
    child: make,
    info: () => {},
    warn: () => {},
    error: () => {},
    fatal: () => {},
    debug: () => {},
    trace: () => {},
  });
  return make();
}

describe('createWsBridge', () => {
  let bridge: WsBridgeHandle | null = null;
  afterEach(async () => {
    if (bridge) await bridge.close();
    bridge = null;
  });

  it('resolves with an auto-selected port and localhost URL', async () => {
    bridge = await createWsBridge({ logger: silentLogger() as any, port: 0 });
    expect(bridge.port).toBeGreaterThan(0);
    expect(bridge.url).toMatch(/^ws:\/\/127\.0\.0\.1:\d+$/);
  });

  it('receives button-action messages from a connected client', async () => {
    bridge = await createWsBridge({ logger: silentLogger() as any, port: 0 });
    const received: ButtonActionMessage[] = [];
    bridge.onMessage((m) => {
      if (m.type === 'button-action') received.push(m);
    });

    const client = new WebSocket(bridge.url);
    await new Promise<void>((resolve) => client.once('open', () => resolve()));
    const msg: ButtonActionMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'button-action',
      keyIndex: 5,
      action: 'down',
      at: 123,
    };
    client.send(JSON.stringify(msg));

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toHaveLength(1);
    expect(received[0]).toEqual(msg);
    client.close();
  });

  it('broadcast sends to all connected clients', async () => {
    bridge = await createWsBridge({ logger: silentLogger() as any, port: 0 });
    const c1 = new WebSocket(bridge.url);
    const c2 = new WebSocket(bridge.url);
    await Promise.all([
      new Promise<void>((r) => c1.once('open', () => r())),
      new Promise<void>((r) => c2.once('open', () => r())),
    ]);

    const got1: unknown[] = [];
    const got2: unknown[] = [];
    c1.on('message', (d) => got1.push(JSON.parse(d.toString())));
    c2.on('message', (d) => got2.push(JSON.parse(d.toString())));

    const msg: DeckConfigMessage = {
      protocolVersion: PROTOCOL_VERSION,
      type: 'deck-config',
      deckId: 'main',
      surfaces: {},
      navMode: 'push',
    };
    const n = bridge.broadcast(msg);
    expect(n).toBe(2);

    await new Promise((r) => setTimeout(r, 100));
    expect(got1).toHaveLength(1);
    expect(got2).toHaveLength(1);
    c1.close();
    c2.close();
  });

  it('drops malformed messages without crashing', async () => {
    bridge = await createWsBridge({ logger: silentLogger() as any, port: 0 });
    const received: unknown[] = [];
    bridge.onMessage((m) => received.push(m));

    const client = new WebSocket(bridge.url);
    await new Promise<void>((r) => client.once('open', () => r()));
    client.send('not json');
    client.send(JSON.stringify({ protocolVersion: 99, type: 'button-action' }));

    await new Promise((r) => setTimeout(r, 100));
    expect(received).toHaveLength(0);
    client.close();
  });
});