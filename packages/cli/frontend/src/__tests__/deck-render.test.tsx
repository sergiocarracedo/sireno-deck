/** @vitest-environment jsdom */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Deck } from "../components/Deck";

const DECK = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core:action", label: "Run", config: { command: "echo" } },
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
    const frame = container.querySelector('[data-button-type="core:action"] [data-sireno-button-frame="true"]');
    expect(frame).not.toBeNull();
  });
});
