import { describe, expect, it, vi } from "vitest";

import { StatePublisher } from "./state-publisher.ts";

const silentLogger = (): ReturnType<typeof Object> => ({
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
  debug: () => undefined,
  trace: () => undefined,
  fatal: () => undefined,
  child: () => silentLogger(),
  level: "silent" as const,
});

const makeBridge = () => ({
  broadcast: vi.fn(),
  sendToCaller: vi.fn(),
  onMessage: () => () => undefined,
  onConnection: () => () => undefined,
  close: async () => undefined,
});

describe("StatePublisher", () => {
  it("does not start polling until the addon is visible", () => {
    const bridge = makeBridge();
    const publisher = new StatePublisher({ bridge, logger: silentLogger() });
    const poll = vi.fn(() => ({ value: 1 }));
    publisher.registerChannel({
      channel: "test:state",
      addonName: "test-addon",
      intervalMs: 1000,
      poll,
    });
    expect(bridge.broadcast).not.toHaveBeenCalled();
    publisher.stopAll();
  });

  it("starts polling when the addon's deck becomes active", () => {
    const bridge = makeBridge();
    const publisher = new StatePublisher({ bridge, logger: silentLogger() });
    const poll = vi.fn(() => ({ value: 42 }));
    publisher.registerChannel({
      channel: "test:state",
      addonName: "test-addon",
      intervalMs: 1000,
      poll,
    });
    publisher.setActiveDeck({ addonNames: ["test-addon"] });
    expect(bridge.broadcast).toHaveBeenCalledWith({
      type: "state",
      channels: { "test:state": { value: 42 } },
    });
    publisher.stopAll();
  });

  it("stops polling when the addon's deck leaves the active set", () => {
    const bridge = makeBridge();
    const publisher = new StatePublisher({ bridge, logger: silentLogger() });
    const poll = vi.fn(() => ({ value: 1 }));
    publisher.registerChannel({
      channel: "test:state",
      addonName: "test-addon",
      intervalMs: 1000,
      poll,
    });
    publisher.setActiveDeck({ addonNames: ["test-addon"] });
    const beforeStop = (bridge.broadcast as ReturnType<typeof vi.fn>).mock.calls.length;
    publisher.setActiveDeck({ addonNames: ["other-addon"] });
    publisher.setActiveDeck({ addonNames: ["test-addon"] });
    expect(bridge.broadcast).toHaveBeenCalledTimes(beforeStop + 1);
    publisher.stopAll();
  });

  it("supports async poll functions", async () => {
    const bridge = makeBridge();
    const publisher = new StatePublisher({ bridge, logger: silentLogger() });
    publisher.registerChannel({
      channel: "async:state",
      addonName: "async-addon",
      intervalMs: 1000,
      poll: () => Promise.resolve({ ok: true }),
    });
    publisher.setActiveDeck({ addonNames: ["async-addon"] });
    await new Promise((r) => setTimeout(r, 10));
    expect(bridge.broadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "state",
        channels: { "async:state": { ok: true } },
      }),
    );
    publisher.stopAll();
  });

  it("logs warnings when poll throws", () => {
    const bridge = makeBridge();
    const log = silentLogger();
    const warnSpy = vi.spyOn(log, "warn");
    const publisher = new StatePublisher({ bridge, logger: log });
    publisher.registerChannel({
      channel: "broken:state",
      addonName: "broken-addon",
      intervalMs: 1000,
      poll: () => {
        throw new Error("upstream fail");
      },
    });
    publisher.setActiveDeck({ addonNames: ["broken-addon"] });
    expect(warnSpy).toHaveBeenCalledWith(
      expect.objectContaining({ channel: "broken:state" }),
      "state-publisher: poll threw",
    );
    publisher.stopAll();
  });
});
