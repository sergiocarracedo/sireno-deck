import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WebSocket from "ws";

import {
  PROTOCOL_VERSION,
  buttonActionMessageSchema,
  helloAckMessageSchema,
  stateMessageSchema,
} from "../protocol";
import { startWsBridge, type WsBridge } from "../ws-bridge";

let bridge: WsBridge | null = null;

afterEach(async () => {
  if (bridge !== null) {
    await bridge.close();
    bridge = null;
  }
});

const openClient = (port: number, token?: string): Promise<WebSocket> =>
  new Promise((resolve, reject) => {
    const socket = new WebSocket(`ws://127.0.0.1:${port}`);
    socket.on("open", () => {
      socket.send(
        JSON.stringify({
          type: "hello",
          version: PROTOCOL_VERSION,
          ...(token !== undefined ? { token } : {}),
        }),
      );
      resolve(socket);
    });
    socket.on("error", reject);
  });

describe("ws bridge", () => {
  it("starts on 127.0.0.1 with random port", async () => {
    bridge = await startWsBridge();
    expect(bridge.port).toBeGreaterThan(0);
    expect(bridge.url).toBe(`ws://127.0.0.1:${bridge.port}`);
  });

  it("completes handshake with hello + sends hello-ack", async () => {
    bridge = await startWsBridge();
    const socket = await openClient(bridge.port);
    const ack = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        resolve(parsed);
        socket.close();
      });
    });
    const result = helloAckMessageSchema.safeParse(ack);
    expect(result.success).toBe(true);
  });

  it("closes with 4001 on token mismatch", async () => {
    bridge = await startWsBridge({ expectedToken: "secret" });
    const code = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${bridge!.port}`);
      socket.on("open", () => {
        socket.send(JSON.stringify({ type: "hello", version: PROTOCOL_VERSION, token: "wrong" }));
      });
      socket.on("close", (code) => resolve(code));
      socket.on("error", reject);
    });
    expect(code).toBe(4001);
  });

  it("broadcast sends to all connected clients", async () => {
    bridge = await startWsBridge();
    const a = await openClient(bridge.port);
    const b = await openClient(bridge.port);
    const received: unknown[] = [];
    const handler = (raw: WebSocket.RawData) => {
      const parsed = JSON.parse(raw.toString());
      if (parsed.type === "state") received.push(parsed);
    };
    a.on("message", handler);
    b.on("message", handler);
    await new Promise((r) => setTimeout(r, 30));
    const msg = stateMessageSchema.parse({ type: "state", channels: { cpu: { usage: 0.5 } } });
    bridge.broadcast(msg);
    await new Promise((r) => setTimeout(r, 30));
    expect(received.length).toBe(2);
    a.close();
    b.close();
  });

  it("onMessage receives button-action after handshake", async () => {
    bridge = await startWsBridge();
    const handler = new Promise<unknown>((resolve) => {
      bridge!.onMessage((message) => resolve(message));
      openClient(bridge!.port).then((s) => {
        setTimeout(() => {
          s.send(
            JSON.stringify(
              buttonActionMessageSchema.parse({
                type: "button-action",
                deckId: "main",
                position: 0,
                gesture: "tap",
              }),
            ),
          );
        }, 50);
      });
    });
    const msg = await handler;
    expect((msg as { type: string }).type).toBe("button-action");
  });

  it("onConnection fires after hello", async () => {
    bridge = await startWsBridge();
    const connPromise = new Promise<boolean>((resolve) => {
      bridge!.onConnection(() => resolve(true));
    });
    await openClient(bridge.port);
    const ok = await Promise.race([
      connPromise,
      new Promise<boolean>((r) => setTimeout(() => r(false), 200)),
    ]);
    expect(ok).toBe(true);
  });

  it("rejects invalid json with 4002", async () => {
    bridge = await startWsBridge();
    const code = await new Promise<number>((resolve, reject) => {
      const socket = new WebSocket(`ws://127.0.0.1:${bridge!.port}`);
      socket.on("open", () => socket.send("not-json"));
      socket.on("close", (c) => resolve(c));
      socket.on("error", reject);
    });
    expect(code).toBe(4002);
  });

  it("close stops the server", async () => {
    bridge = await startWsBridge();
    const port = bridge.port;
    await bridge.close();
    bridge = null;
    const stillUp = await new Promise<boolean>((resolve) => {
      const socket = new WebSocket(`ws://127.0.0.1:${port}`);
      socket.on("error", () => resolve(false));
      socket.on("open", () => {
        socket.close();
        resolve(true);
      });
      setTimeout(() => resolve(false), 200);
    });
    expect(stillUp).toBe(false);
  });
});

describe("ws bridge channel cache", () => {
  it("broadcast of state message caches channels for new clients", async () => {
    bridge = await startWsBridge();
    bridge.broadcast({ type: "state", channels: { cpu: { usage: 0.5 } } });
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["cpu"] }),
    );
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed);
      });
      setTimeout(() => resolve(null), 200);
    });
    expect(reply).toEqual({ type: "state", channels: { cpu: { usage: 0.5 } } });
    socket.close();
  });

  it("consecutive broadcasts merge channels without dropping others", async () => {
    bridge = await startWsBridge();
    bridge.broadcast({ type: "state", channels: { a: 1, b: 2 } });
    bridge.broadcast({ type: "state", channels: { a: 2 } });
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["a", "b"] }),
    );
    const reply = await new Promise<Record<string, unknown>>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed as Record<string, unknown>);
      });
      setTimeout(() => resolve({}), 200);
    });
    expect(reply.channels).toEqual({ a: 2, b: 2 });
    socket.close();
  });

  it("non-state broadcasts do not touch channel cache", async () => {
    bridge = await startWsBridge();
    bridge.broadcast({ type: "state", channels: { cpu: 1 } });
    bridge.broadcast({ type: "deck-config", deckId: "main", surfaces: {} } as unknown as Parameters<typeof bridge.broadcast>[0]);
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["cpu"] }),
    );
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed);
      });
      setTimeout(() => resolve(null), 200);
    });
    expect(reply).toEqual({ type: "state", channels: { cpu: 1 } });
    socket.close();
  });

  it("subscribe-channels replies only to the requesting socket", async () => {
    bridge = await startWsBridge();
    bridge.broadcast({ type: "state", channels: { shared: 1 } });
    const a = await openClient(bridge.port);
    const b = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    let bReceived = false;
    b.on("message", (raw) => {
      const parsed = JSON.parse(raw.toString());
      if (parsed.type === "state") bReceived = true;
    });
    a.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["shared"] }),
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(bReceived).toBe(false);
    a.close();
    b.close();
  });

  it("subscribe-channels with no cached or registered channels sends nothing", async () => {
    bridge = await startWsBridge();
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["unknown"] }),
    );
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed);
      });
      setTimeout(() => resolve(null), 100);
    });
    expect(reply).toBeNull();
    socket.close();
  });

  it("subscribe-channels invokes registered pollFn for uncached channels", async () => {
    bridge = await startWsBridge();
    const pollFn = vi.fn(() => ({ temp: 22 }));
    bridge.registerCacheablePoller("weather:current", pollFn);
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["weather:current"] }),
    );
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed);
      });
      setTimeout(() => resolve(null), 200);
    });
    expect(pollFn).toHaveBeenCalledTimes(1);
    expect(reply).toEqual({ type: "state", channels: { "weather:current": { temp: 22 } } });
    socket.close();
  });

  it("subscribe-channels serves cached values without invoking pollFn", async () => {
    bridge = await startWsBridge();
    const pollFn = vi.fn(() => ({ temp: 22 }));
    bridge.registerCacheablePoller("weather:current", pollFn);
    bridge.broadcast({ type: "state", channels: { "weather:current": { temp: 20 } } });
    const socket = await openClient(bridge.port);
    await new Promise((r) => setTimeout(r, 30));
    socket.send(
      JSON.stringify({ type: "subscribe-channels", channels: ["weather:current"] }),
    );
    const reply = await new Promise<unknown>((resolve) => {
      socket.on("message", (raw) => {
        const parsed = JSON.parse(raw.toString());
        if (parsed.type === "state") resolve(parsed);
      });
      setTimeout(() => resolve(null), 200);
    });
    expect(pollFn).not.toHaveBeenCalled();
    expect(reply).toEqual({ type: "state", channels: { "weather:current": { temp: 20 } } });
    socket.close();
  });
});

describe("unused", () => {
  it("beforeEach noop", () => {
    expect(true).toBe(true);
  });
});

void beforeEach;
