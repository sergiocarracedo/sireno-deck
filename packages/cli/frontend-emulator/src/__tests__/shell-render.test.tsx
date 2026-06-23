import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DEVICE_MODELS } from "@sireno-deck-2/cli";

import { Shell } from "../Shell.tsx";

const mk2 = DEVICE_MODELS.find((m) => m.id === "mk2")!;
const plus = DEVICE_MODELS.find((m) => m.id === "plus")!;

describe("Shell", () => {
  it("renders the emulator shell with side panel and deck frame", () => {
    render(<Shell wsUrl="ws://127.0.0.1:52937" initialDeviceModel="mk2" />);
    expect(screen.getByTestId("emulator-shell")).toBeInTheDocument();
    expect(screen.getByTestId("ws-url")).toHaveTextContent("ws://127.0.0.1:52937");
    expect(screen.getByTestId("deck-frame")).toHaveAttribute(
      "data-key-count",
      String(mk2.keyCount),
    );
  });

  it("renders a key per slot in the deck frame", () => {
    render(<Shell wsUrl="ws://127.0.0.1:52937" initialDeviceModel="mk2" />);
    for (let i = 0; i < mk2.keyCount; i++) {
      expect(screen.getByTestId(`deck-key-${i}`)).toBeInTheDocument();
    }
  });

  it("renders device model selector with all options", () => {
    render(<Shell wsUrl="ws://127.0.0.1:52937" initialDeviceModel="mk2" />);
    const select = screen.getByTestId("device-model-select");
    expect(select).toBeInTheDocument();
    const options = Array.from(select.querySelectorAll("option"));
    expect(options).toHaveLength(DEVICE_MODELS.length);
    expect(options.map((o) => o.value)).toEqual(DEVICE_MODELS.map((m) => m.id));
  });

  it("renders the active deck in the deck list with data-active", () => {
    render(<Shell wsUrl="ws://127.0.0.1:52937" initialDeviceModel="mk2" />);
    const items = screen.getAllByTestId("deck-list")[0]!.querySelectorAll("button");
    expect(items[0]!.getAttribute("data-active")).toBe("true");
    expect(items[1]!.getAttribute("data-active")).toBe("false");
    void plus;
  });
});
