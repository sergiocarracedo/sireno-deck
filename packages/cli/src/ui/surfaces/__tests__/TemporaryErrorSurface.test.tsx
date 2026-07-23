/** @vitest-environment jsdom */
import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import {
  ThemeUiPresentationProvider,
  type ThemeUiPresentation,
} from "../../theme-presentation"
import { TemporaryErrorSurface } from "../TemporaryErrorSurface"

describe("TemporaryErrorSurface", () => {
  it("renders the inline error header and details body", () => {
    const { container } = render(
      <TemporaryErrorSurface
        source="icon://triangle-alert"
        details="missing-requirement: clipboard"
      />,
    )
    const root = container.querySelector(
      "[data-sireno-surface='temporary-error']",
    )
    expect(root).not.toBeNull()
    expect(root?.textContent).toContain("Error")
    expect(root?.textContent).toContain("missing-requirement: clipboard")
  })

  it("uses a custom label when provided", () => {
    const { container } = render(
      <TemporaryErrorSurface label="Failed" details="something broke" />,
    )
    expect(container.textContent).toContain("Failed")
  })

  it("falls back to the placeholder text when details is empty", () => {
    const { container } = render(<TemporaryErrorSurface details="" />)
    expect(container.textContent).toContain("check logs")
  })

  it("renders the icon with a sireno-ui-icon element", () => {
    const { container } = render(
      <TemporaryErrorSurface source="icon://triangle-alert" details="x" />,
    )
    const icon = container.querySelector("[data-sireno-ui-icon='true']")
    expect(icon).not.toBeNull()
  })

  it("honors themeUi.surfaces.temporaryError override", () => {
    const override: ThemeUiPresentation = {
      surfaces: {
        temporaryError: (props) => (
          <div data-sireno-test-override="true">{props.details}</div>
        ),
      },
    }
    const { container } = render(
      <ThemeUiPresentationProvider presentation={override}>
        <TemporaryErrorSurface details="raw" />
      </ThemeUiPresentationProvider>,
    )
    expect(
      container.querySelector("[data-sireno-test-override='true']"),
    ).not.toBeNull()
    expect(container.textContent).toContain("raw")
  })
})
