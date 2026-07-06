/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChannelRegistry } from "@sireno-deck/cli";

import { Deck } from "../components/Deck";

const DECK = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core-buttons:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core-buttons:action", label: "Run", config: { command: "echo" } },
  ],
};

describe("Deck", () => {
  it("renders a button per entry with the right data-button-type", () => {
    const { container } = render(<Deck deck={DECK} />);
    expect(container.querySelectorAll("[data-button-type]")).toHaveLength(2);
  });

  it("renders pressed/isHolding state from the gestures prop", () => {
    const { container } = render(
      <Deck
        deck={DECK}
        gestures={{
          b1: { pressed: true, isTapping: false, isHolding: true, holdProgress: 0.5 },
        }}
      />,
    );
    const frame = container.querySelector('[data-button-type="core-buttons:action"] [data-sireno-button-frame="true"]');
    expect(frame).not.toBeNull();
  });

  it("publishes to the per-button runtime:gesture channel when a gesture arrives", () => {
    ChannelRegistry.resetForTests();
    render(<Deck deck={DECK} />);

    const b0Received: Array<unknown> = [];
    const b1Received: Array<unknown> = [];
    const unsub0 = ChannelRegistry.instance().subscribe("runtime:gesture:b0", (p) =>
      b0Received.push(p),
    );
    const unsub1 = ChannelRegistry.instance().subscribe("runtime:gesture:b1", (p) =>
      b1Received.push(p),
    );

    act(() => {
      ChannelRegistry.instance().publish("runtime:gesture:b1", { gesture: "tap", at: 1 });
    });

    expect(b1Received).toHaveLength(1);
    expect(b0Received).toHaveLength(0);

    unsub0();
    unsub1();
  });
});
