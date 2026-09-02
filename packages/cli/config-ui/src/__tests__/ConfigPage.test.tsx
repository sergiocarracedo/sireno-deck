/** @vitest-environment jsdom */
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"

import { ConfigPage } from "../pages/ConfigPage"

const mockFetch = vi.fn()

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("ConfigPage", () => {
  it("renders loading state initially", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<ConfigPage configPath={null} />)
    expect(screen.getByText("loading…")).toBeInTheDocument()
  })

  it("fetches /api/config on mount", () => {
    mockFetch.mockImplementation(() => new Promise(() => {}))
    render(<ConfigPage configPath={null} />)
    expect(mockFetch).toHaveBeenCalledWith("/api/config")
  })

  it("renders config path above content when provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve("deck:\n  name: Test"),
    })
    render(<ConfigPage configPath="/home/user/.config/sireno/config.yaml" />)
    await waitFor(() => {
      expect(screen.getByTestId("config-page-path").textContent).toBe(
        "/home/user/.config/sireno/config.yaml",
      )
    })
  })

  it("renders fetched config content", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve("deck:\n  name: Test"),
    })
    render(<ConfigPage configPath={null} />)
    await waitFor(() => {
      expect(screen.getByTestId("config-page").textContent).toBe(
        "deck:\n  name: Test",
      )
    })
  })

  it("renders error state when fetch fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
    })
    render(<ConfigPage configPath={null} />)
    await waitFor(() => {
      expect(screen.getByText(/Failed: HTTP 404/)).toBeInTheDocument()
    })
  })

  it("renders without path when configPath is null", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: () => Promise.resolve("content"),
    })
    render(<ConfigPage configPath={null} />)
    await waitFor(() => {
      expect(screen.queryByTestId("config-page-path")).not.toBeInTheDocument()
    })
  })
})
