/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import { Text, resolveTextFit } from "../Text"

// ponytail: jsdom does not implement ResizeObserver; the autofit hook uses it
// only to re-measure on container resize, so a no-op stub is enough.
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const getFitAttr = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-fit")

const getEllipsisAttr = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-ellipsis")

const getAutofitState = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-autofit-state")

afterEach(() => {
  cleanup()
})

describe("resolveTextFit", () => {
  it("defaults undefined to fit mode without ellipsis", () => {
    expect(resolveTextFit(undefined)).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
  })

  it("maps string aliases to the unified fit model", () => {
    expect(resolveTextFit("ellipsis")).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: true,
      minSize: undefined,
    })
    expect(resolveTextFit("clipped")).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
    expect(resolveTextFit("hidden")).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
    expect(resolveTextFit("shrink")).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
  })

  it("maps autofit string alias to type autofit with xs floor and no ellipsis", () => {
    expect(resolveTextFit("autofit")).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: 12,
    })
  })

  it("normalizes fit object: clamps lines and defaults flags", () => {
    expect(resolveTextFit({ type: "fit", lines: 2 })).toEqual({
      type: "fit",
      lines: 2,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
  })

  it("honors ellipsis flag on fit object", () => {
    expect(resolveTextFit({ type: "fit", ellipsis: true })).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: true,
      minSize: undefined,
    })
  })

  it("clamps lines to [1, 3]", () => {
    expect(resolveTextFit({ type: "fit", lines: 0 })).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
    expect(resolveTextFit({ type: "fit", lines: -3 })).toEqual({
      type: "fit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
    expect(resolveTextFit({ type: "fit", lines: 99 })).toEqual({
      type: "fit",
      lines: 3,
      reserveSpace: false,
      ellipsis: false,
      minSize: undefined,
    })
  })

  it("propagates reserveSpace when set", () => {
    expect(
      resolveTextFit({ type: "fit", lines: 3, reserveSpace: true }),
    ).toEqual({
      type: "fit",
      lines: 3,
      reserveSpace: true,
      ellipsis: false,
      minSize: undefined,
    })
  })

  it("resolves autofit minSize from number and TextSize aliases", () => {
    expect(resolveTextFit({ type: "autofit", minSize: 10 })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: 10,
    })
    expect(resolveTextFit({ type: "autofit", minSize: "xs" })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: 12,
    })
    expect(resolveTextFit({ type: "autofit", minSize: "5xl" })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: 48,
    })
  })

  it("defaults autofit minSize to xs (12px) and ellipsis to false", () => {
    expect(resolveTextFit({ type: "autofit" })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: false,
      minSize: 12,
    })
  })

  it("honors autofit ellipsis flag", () => {
    expect(resolveTextFit({ type: "autofit", ellipsis: true })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      ellipsis: true,
      minSize: 12,
    })
  })
})

describe("Text render — fit aliases", () => {
  it("uses overflow-hidden whitespace-nowrap text-ellipsis for fit='ellipsis'", () => {
    const { container } = render(<Text fit="ellipsis" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("text-ellipsis")
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).toContain("whitespace-nowrap")
    expect(getFitAttr(container)).toBe("fit-1")
    expect(getEllipsisAttr(container)).toBe("true")
  })

  it("clips without ellipsis for fit='clipped'", () => {
    const { container } = render(<Text fit="clipped" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).toContain("whitespace-nowrap")
    expect(root.className).not.toContain("text-ellipsis")
    expect(getEllipsisAttr(container)).toBe("false")
  })

  it("defaults to clipped fit when fit is omitted", () => {
    const { container } = render(<Text text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).not.toContain("text-ellipsis")
    expect(getFitAttr(container)).toBe("fit-1")
    expect(getEllipsisAttr(container)).toBe("false")
  })

  it("maps legacy 'hidden' alias to clipped fit", () => {
    const { container } = render(<Text fit="hidden" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).not.toContain("text-ellipsis")
    expect(getFitAttr(container)).toBe("fit-1")
  })

  it("maps legacy 'shrink' alias to clipped fit", () => {
    const { container } = render(<Text fit="shrink" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("overflow-hidden")
    expect(root.className).not.toContain("text-ellipsis")
    expect(getFitAttr(container)).toBe("fit-1")
  })
})

describe("Text render — multi-line fit", () => {
  it("uses multi-line clamp for fit object with lines>1 and ellipsis", () => {
    const { container } = render(
      <Text
        fit={{ type: "fit", lines: 2, reserveSpace: true, ellipsis: true }}
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
})

describe("Text render — autofit", () => {
  it("marks autofit state on render", () => {
    const { container } = render(<Text fit="autofit" text="hello" />)
    expect(getFitAttr(container)).toBe("autofit-1")
    expect(getEllipsisAttr(container)).toBe("false")
    expect(getAutofitState(container)).toBeOneOf(["fit", "ellipsis", "clipped"])
  })
})

describe("Text render — reserveSpace", () => {
  it("applies min-height for reserveSpace: true with default lineHeight=1", () => {
    const { container } = render(
      <Text fit={{ type: "fit", lines: 3, reserveSpace: true }} text="" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("scales min-height by custom lineHeight", () => {
    const { container } = render(
      <Text
        fit={{ type: "fit", lines: 2, reserveSpace: true }}
        lineHeight={1.5}
        text=""
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("reserves full height even when content is short", () => {
    const { container } = render(
      <Text fit={{ type: "fit", lines: 4, reserveSpace: true }} text="hi" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("does not apply min-height when reserveSpace is false", () => {
    const { container } = render(
      <Text fit={{ type: "fit", lines: 2, reserveSpace: false }} text="" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })

  it("does not apply min-height when reserveSpace is omitted", () => {
    const { container } = render(
      <Text fit={{ type: "fit", lines: 2 }} text="" />,
    )
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
