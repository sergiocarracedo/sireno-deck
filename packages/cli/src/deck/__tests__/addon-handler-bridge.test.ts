import { describe, expect, it, vi } from "vitest";
import { resolve as resolvePath } from "node:path";

import { createPubSub } from "@/core/pub-sub";
import { createStore } from "@/core/store";
import { createLogger } from "@/util/logger";
import { createActionExecutor } from "@/action/executor";

import type { ScannedAddon } from "@/cli/commands/addon-registry";
import { getHostContext } from "../host-context";
import { createRuntime } from "../runtime";
import { bridgeAddonBackends } from "../addon-handler-bridge";

const silentLogger = () => createLogger({ level: "silent" });

const fixturePath = resolvePath(__dirname, "__fixtures__/fake-media-backend.ts");

const baseScanned: ReadonlyArray<ScannedAddon> = [
  {
    name: "fake-media",
    types: ["fake-media:player"],
    frontendEntry: null,
    publishIntervalMs: null,
    pollerEntry: null,
    buttonTypes: {},
    deckTypes: {},
    source: "json",
    globalBackendEntry: fixturePath,
  },
];

const makeBridge = () => ({
  broadcast: vi.fn(),
  sendToCaller: vi.fn(),
  onMessage: () => () => undefined,
  onConnection: () => () => undefined,
  close: async () => undefined,
});

const makeStatePublisher = () => ({
  registerChannel: vi.fn(),
  setActiveDeck: vi.fn(),
  stopAll: vi.fn(),
});

const setup = () => {
  const pubSub = createPubSub();
  const store = createStore();
  const decks = [{ id: "main", name: "Main", buttons: [], isMain: true }];
  const runtime = createRuntime({
    decks,
    pubSub,
    store,
    logger: silentLogger(),
  });
  const executor = createActionExecutor({ host: getHostContext() });
  return { runtime, pubSub, store, executor, decks };
};

describe("bridgeAddonBackends", () => {
  it("registers each globalBackend poller with the state publisher", async () => {
    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: baseScanned,
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    expect(statePublisher.registerChannel).toHaveBeenCalledTimes(1);
    const [call] = (statePublisher.registerChannel as ReturnType<typeof vi.fn>).mock.calls;
    expect(call).toBeDefined();
    const [arg] = call as [
      {
        channel: string;
        addonName: string;
        intervalMs: number;
        poll: () => unknown;
      },
    ];
    expect(arg.channel).toBe("fake-media:state");
    expect(arg.addonName).toBe("fake-media");
    expect(arg.intervalMs).toBe(2000);
    expect(arg.poll()).toEqual({ title: "track", artist: "artist" });
  });

  it("routes ctx.publish from onLoad to the WS bridge on the primary channel", async () => {
    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: baseScanned,
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    expect(bridge.broadcast).toHaveBeenCalledWith({
      type: "state",
      channels: { "fake-media:state": { initial: true } },
    });
  });

  it("does not call pubSub for ctx.publish when a poller is registered", async () => {
    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    const subSpy = vi.fn();
    pubSub.subscribe("addon:fake-media", subSpy);

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: baseScanned,
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    expect(subSpy).not.toHaveBeenCalled();
  });

  it("falls back to pubSub for ctx.publish when no poller is defined", async () => {
    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const subSpy = vi.fn();
    pubSub.subscribe("addon:fake-media", subSpy);
    const signal = new AbortController().signal;

    const fixtureNoPoller = resolvePath(
      __dirname,
      "__fixtures__/fake-backend-no-poller.ts",
    );

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: [
        {
          ...baseScanned[0]!,
          globalBackendEntry: fixtureNoPoller,
        },
      ],
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    expect(subSpy).toHaveBeenCalledWith({ initial: true });
    expect(statePublisher.registerChannel).not.toHaveBeenCalled();
    expect(bridge.broadcast).not.toHaveBeenCalled();
  });

  it("ignores addons without globalBackendEntry", async () => {
    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: [
        { ...baseScanned[0]!, globalBackendEntry: null },
      ],
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    expect(statePublisher.registerChannel).not.toHaveBeenCalled();
    expect(bridge.broadcast).not.toHaveBeenCalled();
  });

  it("ctx.poll(id) runs the matching poller and broadcasts the result", async () => {
    const { __resetCapturedCtx, __getCapturedCtx } = await import(
      "./__fixtures__/fake-media-backend"
    );
    __resetCapturedCtx();

    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: baseScanned,
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    const ctx = __getCapturedCtx();
    expect(ctx).not.toBeNull();
    bridge.broadcast.mockClear();

    await ctx!.poll("state");

    expect(bridge.broadcast).toHaveBeenCalledTimes(1);
    expect(bridge.broadcast).toHaveBeenCalledWith({
      type: "state",
      channels: { "fake-media:state": { title: "track", artist: "artist" } },
    });
  });

  it("ctx.poll with an unknown id is a silent no-op", async () => {
    const { __resetCapturedCtx, __getCapturedCtx } = await import(
      "./__fixtures__/fake-media-backend"
    );
    __resetCapturedCtx();

    const { runtime, pubSub, store, executor, decks } = setup();
    const bridge = makeBridge();
    const statePublisher = makeStatePublisher();
    const signal = new AbortController().signal;

    await bridgeAddonBackends({
      runtime,
      decks,
      scanned: baseScanned,
      executor,
      pubSub,
      store,
      signal,
      statePublisher,
      bridge,
    });

    const ctx = __getCapturedCtx();
    bridge.broadcast.mockClear();

    await ctx!.poll("nonexistent");

    expect(bridge.broadcast).not.toHaveBeenCalled();
  });
});