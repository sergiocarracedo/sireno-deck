/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render, screen } from "@testing-library/react"

import { PaginatedSurface } from "../PaginatedSurface"

function PageA() {
  return <div data-testid="page-a">Page A</div>
}

function PageB() {
  return <div data-testid="page-b">Page B</div>
}

function PageC() {
  return <div data-testid="page-c">Page C</div>
}

describe("PaginatedSurface", () => {
  it("renders a single page without dots", () => {
    const { container } = render(
      <PaginatedSurface pages={{ render: PageA, config: null }} />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()
    expect(container.querySelectorAll("[class*='rounded-full']").length).toBe(0)
  })

  it("renders the first page of a multi-page array", () => {
    render(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
      />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()
    expect(screen.queryByTestId("page-b")).toBeNull()
  })

  it("shows dots for multi-page", () => {
    const { container } = render(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
          { render: PageC, config: null },
        ]}
      />,
    )
    const dots = container.querySelectorAll("[class*='rounded-full']")
    expect(dots.length).toBe(3)
  })

  it("advances page on tap gesture", () => {
    const { rerender } = render(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
      />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()

    rerender(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: 1 }}
      />,
    )
    expect(screen.getByTestId("page-b")).toBeTruthy()
  })

  it("wraps around from last to first page", () => {
    let gestureAt = 0
    const { rerender } = render(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: gestureAt }}
      />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()

    gestureAt = 1
    rerender(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: gestureAt }}
      />,
    )
    expect(screen.getByTestId("page-b")).toBeTruthy()

    gestureAt = 2
    rerender(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: gestureAt }}
      />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()
  })

  it("ignores duplicate gesture timestamp", () => {
    const { rerender } = render(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
      />,
    )
    expect(screen.getByTestId("page-a")).toBeTruthy()

    rerender(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: 1 }}
      />,
    )
    expect(screen.getByTestId("page-b")).toBeTruthy()

    rerender(
      <PaginatedSurface
        pages={[
          { render: PageA, config: null },
          { render: PageB, config: null },
        ]}
        gesture={{ gesture: "tap", at: 1 }}
      />,
    )
    expect(screen.getByTestId("page-b")).toBeTruthy()
  })

  it("accepts single object instead of array", () => {
    render(<PaginatedSurface pages={{ render: PageA, config: null }} />)
    expect(screen.getByTestId("page-a")).toBeTruthy()
  })
})
