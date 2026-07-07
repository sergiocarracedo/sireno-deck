/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { createWsClientMock } = vi.hoisted(() => ({
  createWsClientMock: vi.fn(),
}));

vi.mock("../bridge/client", () => ({
  createWsClient: createWsClientMock,
}));

import { App } from "../App";

interface CapturedHandlers {
  readonly onMessage: (message: unknown) => void;
}

const LocationProbe = ({ onChange }: { onChange: (path: string) => void }): null => {
  const loc = useLocation();
  onChange(loc.pathname);
  return null;
};

const buildMockWsClient = () => {
  const handlers: CapturedHandlers = { onMessage: () => {} };
  const client = {
    connect: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    subscribeChannels: vi.fn(),
  };
  createWsClientMock.mockImplementation((options: { onMessage?: (m: unknown) => void }) => {
    if (options.onMessage) handlers.onMessage = options.onMessage;
    return client;
  });
  return { handlers, client };
};

describe("App navigation", () => {
  beforeEach(() => {
    createWsClientMock.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("navigates to /decks/:deckId when a deck-config message arrives", () => {
    const { handlers } = buildMockWsClient();
    const paths: string[] = [];

    render(
      <MemoryRouter initialEntries={["/"]}>
        <LocationProbe onChange={(p) => paths.push(p)} />
        <App />
      </MemoryRouter>,
    );

    act(() => {
      handlers.onMessage({
        type: "deck-config",
        deckId: "media",
        surfaces: {
          media: { name: "Media", buttons: [] },
        },
      });
    });

    expect(paths.at(-1)).toBe("/decks/media");
  });

  it("does not navigate when deck-config references an unknown surface", () => {
    const { handlers } = buildMockWsClient();
    const paths: string[] = [];

    render(
      <MemoryRouter initialEntries={["/decks/main"]}>
        <LocationProbe onChange={(p) => paths.push(p)} />
        <App />
      </MemoryRouter>,
    );

    act(() => {
      handlers.onMessage({
        type: "deck-config",
        deckId: "ghost",
        surfaces: {
          main: { name: "Main", buttons: [] },
        },
      });
    });

    expect(paths.at(-1)).toBe("/decks/main");
  });
});
