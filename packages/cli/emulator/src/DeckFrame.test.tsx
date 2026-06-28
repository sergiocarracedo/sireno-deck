import { describe, expect, it } from "vitest";

import { DEVICE_MODELS } from "@sireno-deck-2/cli";

import { render } from "@testing-library/react";

import { DeckFrame } from "./DeckFrame.tsx";

const mk2 = DEVICE_MODELS.find((m) => m.id === "mk2")!;

describe("DeckFrame (emulator)", () => {
  it("renders keyCount cells with correct grid columns", () => {
    const { getByTestId } = render(<DeckFrame frontendUrl="http://127.0.0.1:5173" deckId="main" device={mk2} />);
    const frame = getByTestId("deck-frame");
    expect(frame.getAttribute("data-key-count")).toBe(String(mk2.keyCount));
    expect(frame.getAttribute("data-columns")).toBe(String(mk2.columns));
    expect(frame.querySelectorAll("button[data-key-index]")).toHaveLength(mk2.keyCount);
  });

  it("renders each key with aria-label 'Key N'", () => {
    const { getByTestId } = render(<DeckFrame frontendUrl="http://127.0.0.1:5173" deckId="main" device={mk2} />);
    for (let i = 0; i < mk2.keyCount; i++) {
      expect(getByTestId(`deck-key-${i}`).getAttribute("aria-label")).toBe(`Key ${i}`);
    }
  });
});
