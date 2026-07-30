/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import {
  ButtonFrame,
  ThemeUiPresentationProvider,
  type ThemeUiPresentation,
} from "@/ui"

describe("ui/ButtonFrame override", () => {
  it("uses themeUi.buttonFrame when provided", () => {
    const override: ThemeUiPresentation = {
      buttonFrame: (props) => (
        <div data-test-override="true" data-variant={props.variant}>
          {props.children}
        </div>
      ),
    }
    const { container } = render(
      <ThemeUiPresentationProvider presentation={override}>
        <ButtonFrame buttonType="test:btn" variant="default">
          <span>child</span>
        </ButtonFrame>
      </ThemeUiPresentationProvider>,
    )
    const overrideEl = container.querySelector('[data-test-override="true"]')
    expect(overrideEl).not.toBeNull()
    expect(overrideEl?.textContent).toContain("child")
    expect(overrideEl?.getAttribute("data-variant")).toBe("default")
  })

  it("falls back to default frame when no override is provided", () => {
    const { container } = render(
      <ThemeUiPresentationProvider>
        <ButtonFrame buttonType="test:btn" variant="default">
          <span>child</span>
        </ButtonFrame>
      </ThemeUiPresentationProvider>,
    )
    const frame = container.querySelector('[data-sireno-button-frame="true"]')
    expect(frame).not.toBeNull()
    expect(frame?.textContent).toContain("child")
  })
})
