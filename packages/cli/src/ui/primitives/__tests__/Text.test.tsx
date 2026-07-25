/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { Text, resolveTextFit } from "../Text"

const getFitAttr = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-fit")

const getShrinkState = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-shrink-state")

afterEach(() => {
  cleanup()
})

describe("resolveTextFit", () => {
  it("defaults undefined to hidden mode", () => {
    expect(resolveTextFit(undefined)).toEqual({
      type: "hidden",
      lines: 1,
      reserveSpace: false,
    })
  })

  it("returns string aliases as-is", () => {
    const cases = ["ellipsis", "shrink", "hidden"] as const
    for (const fit of cases) {
      expect(resolveTextFit(fit)).toEqual({
        type: fit,
        lines: 1,
        reserveSpace: false,
      })
    }
  })

  it("normalizes ellipsis object: clamps lines to [1, 3], defaults reserveSpace to false", () => {
    expect(resolveTextFit({ type: "ellipsis", lines: 2 })).toEqual({
      type: "ellipsis",
      lines: 2,
      reserveSpace: false,
    })
  })

  it("clamps lines > 3 to 3 and lines < 1 to 1", () => {
    expect(resolveTextFit({ type: "ellipsis", lines: 0 })).toEqual({
      type: "ellipsis",
      lines: 1,
      reserveSpace: false,
    })
    expect(resolveTextFit({ type: "ellipsis", lines: -3 })).toEqual({
      type: "ellipsis",
      lines: 1,
      reserveSpace: false,
    })
    expect(resolveTextFit({ type: "ellipsis", lines: 99 })).toEqual({
      type: "ellipsis",
      lines: 3,
      reserveSpace: false,
    })
  })

  it("propagates reserveSpace when set", () => {
    expect(
      resolveTextFit({ type: "ellipsis", lines: 3, reserveSpace: true }),
    ).toEqual({
      type: "ellipsis",
      lines: 3,
      reserveSpace: true,
    })
  })
})

describe("Text render — string fit (backward-compat)", () => {
  it("uses overflow-hidden whitespace-nowrap text-ellipsis for fit='ellipsis'", () => {
    const { container } = render(<Text fit="ellipsis" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("text-ellipsis")
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).toContain("whitespace-nowrap")
    expect(getFitAttr(container)).toBe("ellipsis-1")
  })

  it("uses webkit-box multi-line clamp for ellipsis with lines>1", () => {
    const { container } = render(
      <Text
        fit={{ type: "ellipsis", lines: 2, reserveSpace: true }}
        text="hello"
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).toContain("sireno-text-fit-multiline")
    expect(root.className).not.toContain("text-ellipsis")
    expect(root.className).not.toContain("whitespace-nowrap")
    const inlineStyle = root.style as CSSStyleDeclaration & {
      WebkitBoxOrient?: string
      WebkitLineClamp?: string
    }
    expect(inlineStyle.getPropertyValue("--sireno-text-lines")).toBe("2")
    expect(inlineStyle.overflow).toBe("hidden")
  })

  it("defaults to hidden when fit is omitted", () => {
    const { container } = render(<Text text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(getFitAttr(container)).toBe("hidden-1")
  })

  it("uses sireno-text-fit-shrink for fit='shrink'", () => {
    const { container } = render(<Text fit="shrink" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("sireno-text-fit-shrink")
    expect(getShrinkState(container)).toBe("pending")
  })
})

describe("Text render — reserveSpace", () => {
  it("applies min-height for reserveSpace: true with default lineHeight=1", () => {
    const { container } = render(
      <Text fit={{ type: "ellipsis", lines: 3, reserveSpace: true }} text="" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("scales min-height by custom lineHeight", () => {
    const { container } = render(
      <Text
        fit={{ type: "ellipsis", lines: 2, reserveSpace: true }}
        lineHeight={1.5}
        text=""
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("reserves full height even when content is short", () => {
    const { container } = render(
      <Text
        fit={{ type: "ellipsis", lines: 4, reserveSpace: true }}
        text="hi"
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("does not apply min-height when reserveSpace is false", () => {
    const { container } = render(
      <Text
        fit={{ type: "ellipsis", lines: 2, reserveSpace: false }}
        text=""
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })

  it("does not apply min-height when reserveSpace is omitted", () => {
    const { container } = render(
      <Text fit={{ type: "ellipsis", lines: 2 }} text="" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })

  it("does not apply min-height for non-ellipsis modes", () => {
    const { container } = render(<Text fit="hidden" text="" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })
})

describe("Text render — xxs size", () => {
  it("SIZE_CLASS.xxs maps to text-[8px]", () => {
    const { container } = render(<Text size="xxs" text="hi" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("text-[8px]")
    expect(root.getAttribute("data-sireno-text-size")).toBe("xxs")
  })

  it("renders <xxs>...</xxs> rich tag with text-[8px] class", () => {
    const { container } = render(<Text text="<xxs>tiny</xxs>" />)
    const span = container.querySelector(
      'span[data-sireno-rich-text-tag="xxs"]',
    )
    expect(span).not.toBeNull()
    expect(span?.className).toContain("text-[8px]")
    expect(span?.textContent).toBe("tiny")
  })
})

describe("Text rich-text tags", () => {
  it("renders <strong>...</strong> as a bold span", () => {
    const { container } = render(<Text text="<strong>HH</strong>" />)
    const span = container.querySelector("span.sireno-rich-text-node")
    expect(span).not.toBeNull()
    expect(span?.className).toContain("sireno-rich-text-strong")
    expect(span?.getAttribute("data-sireno-rich-text-tag")).toBe("strong")
    expect(span?.textContent).toBe("HH")
  })

  it("preserves nested tags inside <strong>", () => {
    const { container } = render(<Text text="<strong><4xl>HH</4xl></strong>" />)
    const strong = container.querySelector(
      'span[data-sireno-rich-text-tag="strong"]',
    )
    expect(strong?.className).toContain("sireno-rich-text-strong")
    const inner = strong?.querySelector('span[data-sireno-rich-text-tag="4xl"]')
    expect(inner).not.toBeNull()
  })

  it("renders *text* highlight with the strong class and primary tone", () => {
    const { container } = render(<Text text="*highlight*" />)
    const span = container.querySelector(
      'span[data-sireno-rich-text-tag="highlight"]',
    )
    expect(span?.className).toContain("sireno-rich-text-strong")
    expect(span?.className).toContain("text-primary")
    expect(span?.textContent).toBe("highlight")
  })
})
