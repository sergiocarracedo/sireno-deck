import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createPubSub } from "@/core/pub-sub.ts";
import { createLogger } from "@/util/logger.ts";

import {
  BrowserRenderer,
  type BrowserLike,
  type ContextLike,
  type PageLike,
  type PlaywrightLike,
} from "./browser-renderer.ts";

const silentLogger = () => createLogger({ level: "silent" });

const ONE_HUNDRED_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000640000006408060000005A57E04C0000005F49444154789C63646060F8FF1F71C0C0C0C8C8C8C8000080080000000000C80000800800000000B27BAD000020E0701000000000049454E44AE426082",
  "hex",
);

const makeMockPlaywright = (): {
  playwright: PlaywrightLike;
  page: PageLike;
  browser: BrowserLike;
  context: ContextLike;
} => {
  const page: PageLike = {
    goto: vi.fn(async () => undefined),
    screenshot: vi.fn(async () => ONE_HUNDRED_PNG),
    close: vi.fn(async () => undefined),
  };
  const context: ContextLike = {
    newPage: vi.fn(async () => page),
    close: vi.fn(async () => undefined),
  };
  const browser: BrowserLike = {
    newContext: vi.fn(async () => context),
    close: vi.fn(async () => undefined),
  };
  const playwright: PlaywrightLike = {
    chromium: {
      launch: vi.fn(async () => browser),
    },
  };
  return { playwright, page, browser, context };
};

describe("BrowserRenderer", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("launches chromium, creates context+page, goto on start", async () => {
    const { playwright, page, browser, context } = makeMockPlaywright();
    const device = { getKeyCount: () => 15, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://test",
      device,
      logger: silentLogger(),
      intervalMs: 1_000_000,
      playwrightFactory: () => playwright,
    });
    await r.start();
    expect(playwright.chromium.launch).toHaveBeenCalledWith({ headless: true });
    expect(browser.newContext).toHaveBeenCalled();
    expect(context.newPage).toHaveBeenCalled();
    expect(page.goto).toHaveBeenCalledWith("http://test", { waitUntil: "networkidle" });
    await r.stop();
  });

  it("a tick screenshots (full crop/write pipeline exercised in integration; here just verify screenshot call)", async () => {
    const { playwright, page } = makeMockPlaywright();
    const device = { getKeyCount: () => 4, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://test",
      device,
      logger: silentLogger(),
      intervalMs: 5,
      playwrightFactory: () => playwright,
    });
    await r.start();
    await vi.advanceTimersByTimeAsync(30);
    expect(page.screenshot).toHaveBeenCalled();
    await r.stop();
  });

  it("screenshot failure skips the write (does not crash)", async () => {
    const { playwright, page } = makeMockPlaywright();
    (page.screenshot as ReturnType<typeof vi.fn>).mockImplementationOnce(async () => {
      throw new Error("boom");
    });
    const device = { getKeyCount: () => 1, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://t",
      device,
      logger: silentLogger(),
      intervalMs: 5,
      playwrightFactory: () => playwright,
    });
    await r.start();
    await vi.advanceTimersByTimeAsync(15);
    expect(page.screenshot).toHaveBeenCalled();
    expect(device.fillKeyBuffer).not.toHaveBeenCalled();
    await r.stop();
  });

  it("stop() closes page + context + browser", async () => {
    const { playwright, page, browser, context } = makeMockPlaywright();
    const device = { getKeyCount: () => 1, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://t",
      device,
      logger: silentLogger(),
      intervalMs: 1_000_000,
      playwrightFactory: () => playwright,
    });
    await r.start();
    await r.stop();
    expect(page.close).toHaveBeenCalled();
    expect(context.close).toHaveBeenCalled();
    expect(browser.close).toHaveBeenCalled();
  });

  it("subscribes to runtime:activeDeck and triggers an event-debounced tick", async () => {
    const { playwright, page } = makeMockPlaywright();
    const pubSub = createPubSub();
    const device = { getKeyCount: () => 1, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://t",
      device,
      logger: silentLogger(),
      intervalMs: 1_000_000,
      eventDebounceMs: 30,
      pubSub,
      playwrightFactory: () => playwright,
    });
    await r.start();
    pubSub.publish("runtime:activeDeck", { deckId: "main" });
    await vi.advanceTimersByTimeAsync(60);
    expect(page.screenshot).toHaveBeenCalled();
    await r.stop();
  });

  it("subscribes to runtime:invalidate and triggers an event-debounced tick", async () => {
    const { playwright, page } = makeMockPlaywright();
    const pubSub = createPubSub();
    const device = { getKeyCount: () => 1, fillKeyBuffer: vi.fn(async () => undefined) };
    const r = new BrowserRenderer({
      frontendUrl: "http://t",
      device,
      logger: silentLogger(),
      intervalMs: 1_000_000,
      eventDebounceMs: 30,
      pubSub,
      playwrightFactory: () => playwright,
    });
    await r.start();
    pubSub.publish("runtime:invalidate", { at: Date.now() });
    await vi.advanceTimersByTimeAsync(60);
    expect(page.screenshot).toHaveBeenCalled();
    await r.stop();
  });
});
