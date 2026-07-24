/** @vitest-environment jsdom */
import { act, render } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createWsClientMock } = vi.hoisted(() => ({
  createWsClientMock: vi.fn(),
}))

vi.mock("../bridge/client", () => ({
  createWsClient: createWsClientMock,
}))

import { App } from "../App"

interface CapturedHandlers {
  readonly onMessage: (message: unknown) => void
}

const buildMockWsClient = () => {
  const handlers: CapturedHandlers = { onMessage: () => {} }
  const client = {
    connect: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    subscribeChannels: vi.fn(),
  }
  createWsClientMock.mockImplementation(
    (options: { onMessage?: (m: unknown) => void }) => {
      if (options.onMessage) handlers.onMessage = options.onMessage
      return client
    },
  )
  return { handlers, client }
}

describe("App asset-timing gate", () => {
  beforeEach(() => {
    createWsClientMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders loading skeleton until the assets message arrives", () => {
    const { handlers } = buildMockWsClient()
    const { queryByTestId } = render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    )

    expect(queryByTestId("deck-loading")).not.toBeNull()

    act(() => {
      handlers.onMessage({
        type: "deck-config",
        deckId: "main",
        surfaces: {
          main: {
            name: "Main",
            buttons: [
              {
                id: "b0",
                type: "core:action",
                config: { label: "Run" },
              },
            ],
          },
        },
      })
    })

    expect(queryByTestId("deck-loading")).not.toBeNull()

    act(() => {
      handlers.onMessage({
        type: "assets",
        assets: [{ id: "icon-run", src: "data:image/png;base64,AAAA" }],
      })
    })

    expect(queryByTestId("deck-loading")).toBeNull()
  })
})
