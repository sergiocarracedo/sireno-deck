/** @vitest-environment jsdom */

import { describe, expect, it } from "vitest"
import { render } from "@testing-library/react"

import {
  IconLabelProgressSurface,
  ThemeUiPresentationProvider,
  type ThemeUiPresentation,
} from "@/ui"

describe("ui/IconLabelProgressSurface override", () => {
  it("does not infinitely recurse when an override delegates to base", () => {
    const override: ThemeUiPresentation = {
      surfaces: {
        iconLabelProgress: (props, _ctx, base) =>
          base ? (
            base(props) // ponytail: unreachable — the builder always injects base
          ) : (
            <div data-sireno-surface="icon-label-progress">{props.label}</div>
          ),
      },
    }
    const { container } = render(
      <ThemeUiPresentationProvider presentation={override}>
        <IconLabelProgressSurface
          source="icon://volume-2"
          label="Volume"
          progress={40}
          visible={false}
        />
      </ThemeUiPresentationProvider>,
    )
    const surface = container.querySelector(
      '[data-sireno-surface="icon-label-progress"]',
    )
    expect(surface).not.toBeNull()
    expect(surface?.textContent).toContain("Volume")
  })
})
