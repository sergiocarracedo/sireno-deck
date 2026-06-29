/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import { ChannelRegistry } from "sireno-deck-2/react";
import { App } from "../App";

beforeEach(() => {
  ChannelRegistry.resetForTests();
  (globalThis as unknown as { __SIRENO_PORT__?: number }).__SIRENO_PORT__ = 55999;
});
afterEach(() => {
  ChannelRegistry.resetForTests();
});

describe("App", () => {
  it("renders the mock deck on first paint", () => {
    const { container } = render(<App />);
    expect(container.querySelectorAll("[data-button-type]")).toHaveLength(2);
  });

  it("clicking a button publishes a button-tap channel event", () => {
    const publishSpy = vi.spyOn(ChannelRegistry.instance(), "publish");
    const { container } = render(<App />);
    const btn = container.querySelector<HTMLButtonElement>('[data-button-type="core:action"]')!;
    fireEvent.click(btn);
    expect(publishSpy).toHaveBeenCalledWith("runtime:button-tap", { buttonId: "b1" });
  });
});
