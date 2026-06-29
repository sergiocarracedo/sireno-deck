/** @vitest-environment jsdom */
import { render, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Deck } from "../components/Deck";

const DECK = {
  id: "main",
  name: "Home",
  buttons: [
    { id: "b0", type: "core:change-deck", label: "Media", config: { deck: "media" } },
    { id: "b1", type: "core:action", label: "Run", config: { command: "echo" } },
  ],
};

const mediaButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('[data-button-type="core:change-deck"]')!;
const runButton = (container: HTMLElement) =>
  container.querySelector<HTMLButtonElement>('[data-button-type="core:action"]')!;

describe("Deck", () => {
  it("renders a button per entry with the right data-button-type", () => {
    const { container } = render(<Deck deck={DECK} />);
    expect(container.querySelectorAll("[data-button-type]")).toHaveLength(2);
  });

  it("clicking a core:change-deck button calls onNavigate with the target deck id", () => {
    const onNavigate = vi.fn();
    const { container } = render(<Deck deck={DECK} onNavigate={onNavigate} />);
    fireEvent.click(mediaButton(container));
    expect(onNavigate).toHaveBeenCalledWith("media");
  });

  it("clicking a non-navigation button calls onAction with tap gesture", () => {
    const onAction = vi.fn();
    const { container } = render(<Deck deck={DECK} onAction={onAction} />);
    fireEvent.click(runButton(container));
    expect(onAction).toHaveBeenCalledWith("b1", "tap");
  });
});
