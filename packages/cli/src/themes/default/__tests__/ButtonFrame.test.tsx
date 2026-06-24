/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest";

import { ButtonFrame } from "../ButtonFrame.tsx";

describe("themes/default/ButtonFrame", () => {
  it("renders children and applies default tokens", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = document.createElement("div");
    container.appendChild(root);

    const React = require("react");
    const ReactDOM = require("react-dom/client");
    const act = require("react-dom/test-utils").act;

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: false,
          isTapping: false,
          isHolding: false,
          holdProgress: 0,
          buttonType: "test:btn",
          onPointerDown: () => undefined,
          onPointerUp: () => undefined,
          onPointerLeave: () => undefined,
          onClick: () => undefined,
          onDoubleClick: () => undefined,
          onContextMenu: () => undefined,
          children: React.createElement("span", null, "Hello"),
        }),
      );
    });

    const button = root.querySelector("button");
    expect(button).not.toBeNull();
    expect(button?.getAttribute("data-button-type")).toBe("test:btn");
    expect(button?.className).toContain("bg-bar");
    expect(button?.className).toContain("text-fg");
    expect(button?.textContent).toContain("Hello");
  });

  it("renders hold ring SVG when isHolding is true", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = document.createElement("div");
    container.appendChild(root);

    const React = require("react");
    const ReactDOM = require("react-dom/client");
    const act = require("react-dom/test-utils").act;

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: true,
          isTapping: false,
          isHolding: true,
          holdProgress: 0.5,
          buttonType: "test:hold",
          onPointerDown: () => undefined,
          onPointerUp: () => undefined,
          onPointerLeave: () => undefined,
          onClick: () => undefined,
          onDoubleClick: () => undefined,
          onContextMenu: () => undefined,
          children: React.createElement("span", null, "Hold"),
        }),
      );
    });

    const svg = root.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector("circle")).not.toBeNull();
  });

  it("applies tap animation class when isTapping is true", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = document.createElement("div");
    container.appendChild(root);

    const React = require("react");
    const ReactDOM = require("react-dom/client");
    const act = require("react-dom/test-utils").act;

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: false,
          isTapping: true,
          isHolding: false,
          holdProgress: 0,
          buttonType: "test:tap",
          onPointerDown: () => undefined,
          onPointerUp: () => undefined,
          onPointerLeave: () => undefined,
          onClick: () => undefined,
          onDoubleClick: () => undefined,
          onContextMenu: () => undefined,
          children: React.createElement("span", null, "Tap"),
        }),
      );
    });

    const button = root.querySelector("button");
    expect(button?.className).toContain("sireno-tap");
  });
});
