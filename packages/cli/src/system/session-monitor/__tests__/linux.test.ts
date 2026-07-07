import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type pino from "pino";

import {
  createLinuxSessionProvider,
  type LinuxDbusBus,
  type LinuxDbusInterface,
  type LinuxDbusProxyObject,
} from "../linux";

const silentLogger = (): pino.Logger => {
  const noop = (): void => undefined;
  return {
    info: vi.fn(noop),
    warn: vi.fn(noop),
    error: vi.fn(noop),
    debug: vi.fn(noop),
    trace: vi.fn(noop),
    fatal: vi.fn(noop),
    child: vi.fn(),
    level: "silent",
  } as unknown as pino.Logger;
};

const makeBus = (opts: {
  initialLocked: boolean;
  idleMs?: number;
  hasIdle: boolean;
}): { bus: LinuxDbusBus; handlers: Array<(...args: unknown[]) => void> } => {
  const handlers: Array<(...args: unknown[]) => void> = [];
  const screenSaver: LinuxDbusInterface = {
    async GetActive() {
      return opts.initialLocked;
    },
    on(event, handler) {
      if (event === "ActiveChanged") handlers.push(handler);
    },
  };
  const idleIface: LinuxDbusInterface = {
    async GetIdletime() {
      return opts.idleMs ?? 0;
    },
  };
  const proxy: LinuxDbusProxyObject = {
    getInterface(name) {
      if (name === "org.gnome.ScreenSaver") return screenSaver;
      if (name === "org.gnome.Mutter.IdleMonitor") return idleIface;
      throw new Error(`unexpected interface ${name}`);
    },
  };
  const bus: LinuxDbusBus = {
    async getProxyObject(service) {
      if (!opts.hasIdle && service === "org.gnome.Mutter.IdleMonitor") {
        throw new Error("no idle monitor");
      }
      return proxy;
    },
    disconnect: vi.fn(),
  };
  return { bus, handlers };
};

describe("createLinuxSessionProvider", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("initial state reflects GetActive()", async () => {
    const { bus } = makeBus({ initialLocked: false, hasIdle: false });
    const provider = await createLinuxSessionProvider({ dbus: bus, logger: silentLogger() });
    expect(provider.getState()).toBe("unlocked");
    await provider.stop();
  });

  it("initial state is locked when GetActive() returns true", async () => {
    const { bus } = makeBus({ initialLocked: true, hasIdle: false });
    const provider = await createLinuxSessionProvider({ dbus: bus, logger: silentLogger() });
    expect(provider.getState()).toBe("locked");
    await provider.stop();
  });

  it("ActiveChanged signal updates state and notifies subscribers", async () => {
    const { bus, handlers } = makeBus({ initialLocked: false, hasIdle: false });
    const provider = await createLinuxSessionProvider({ dbus: bus, logger: silentLogger() });
    const handler = vi.fn();
    provider.subscribe(handler);
    for (const h of handlers) h(true);
    expect(provider.getState()).toBe("locked");
    expect(handler).toHaveBeenCalledWith("locked");
    await provider.stop();
  });

  it("returns null provider when D-Bus init throws", async () => {
    const failingBus: LinuxDbusBus = {
      async getProxyObject() {
        throw new Error("no session bus");
      },
    };
    const provider = await createLinuxSessionProvider({ dbus: failingBus, logger: silentLogger() });
    expect(provider.getState()).toBe("unknown");
    await provider.stop();
  });

  it("stop() disconnects the bus", async () => {
    const { bus } = makeBus({ initialLocked: false, hasIdle: false });
    const provider = await createLinuxSessionProvider({ dbus: bus, logger: silentLogger() });
    await provider.stop();
    expect(bus.disconnect).toHaveBeenCalled();
  });
});
