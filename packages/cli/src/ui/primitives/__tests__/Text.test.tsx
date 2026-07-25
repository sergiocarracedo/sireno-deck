/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render } from "@testing-library/react"

import { Text, resolveTextFit } from "../Text"

const getFitAttr = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-fit")

const getShrinkState = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-shrink-state")

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

class ResizeObserverMock {
  static instances: ResizeObserverMock[] = []
  cb: ResizeObserverCallback
  observed: Element[] = []

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    ResizeObserverMock.instances.push(this)
  }

  observe(target: Element) {
    this.observed.push(target)
  }

  unobserve(target: Element) {
    this.observed = this.observed.filter((t) => t !== target)
  }

  disconnect() {
    this.observed = []
  }

  trigger(entries: Partial<ResizeObserverEntry>[] = []) {
    const target = this.observed[0]
    if (!target) return
    const defaults: ResizeObserverEntry = {
      target,
      contentRect: new DOMRectReadOnly(0, 0, 200, 50),
      borderBoxSize: [] as unknown as ReadonlyArray<ResizeObserverBoxOptions>,
      contentBoxSize: [] as unknown as ReadonlyArray<ResizeObserverBoxOptions>,
      devicePixelContentBoxSize:
        [] as unknown as ReadonlyArray<ResizeObserverBoxOptions>,
    }
    this.cb(
      entries.map((e) => ({ ...defaults, ...e })) as ResizeObserverEntry[],
      this,
    )
  }
}

function mockLayout(
  el: HTMLElement,
  opts: {
    fontSize: number
    scrollWidth?: number
    clientWidth?: number
    scrollHeight?: number
    clientHeight?: number
  },
) {
  const {
    fontSize: naturalFontSize,
    scrollWidth = 0,
    clientWidth = 0,
    scrollHeight = 0,
    clientHeight = 0,
  } = opts
  const inlineFontPx = () =>
    parseFloat(el.style.fontSize) || naturalFontSize
  Object.defineProperty(el, "scrollWidth", {
    configurable: true,
    get: () => {
      const inline = inlineFontPx()
      return (scrollWidth * inline) / naturalFontSize
    },
  })
  Object.defineProperty(el, "clientWidth", {
    configurable: true,
    get: () => clientWidth,
  })
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    get: () => {
      const inline = inlineFontPx()
      return (scrollHeight * inline) / naturalFontSize
    },
  })
  Object.defineProperty(el, "clientHeight", {
    configurable: true,
    get: () => clientHeight,
  })
  const orig = window.getComputedStyle.bind(window)
  vi.spyOn(window, "getComputedStyle").mockImplementation((target, pseudo) => {
    const style = orig(target, pseudo)
    if (target === el) {
      Object.defineProperty(style, "fontSize", {
        configurable: true,
        get: () => `${inlineFontPx()}px`,
      })
      Object.defineProperty(style, "lineHeight", {
        configurable: true,
        get: () => `${inlineFontPx() * 1.2}px`,
      })
    }
    return style
  })
}

beforeEach(() => {
  ResizeObserverMock.instances = []
  vi.stubGlobal(
    "ResizeObserver",
    ResizeObserverMock as unknown as typeof ResizeObserver,
  )
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

  it("autofit: returns the same shape with minSize", () => {
    expect(resolveTextFit({ type: "autofit", minSize: 10 })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      minSize: 10,
    })
  })

  it("autofit: throws when minSize is missing", () => {
    expect(() => resolveTextFit({ type: "autofit" })).toThrow(/minSize/)
  })

  it("autofit: clamps lines to [1, 3]", () => {
    expect(resolveTextFit({ type: "autofit", minSize: 10, lines: 7 })).toEqual({
      type: "autofit",
      lines: 3,
      reserveSpace: false,
      minSize: 10,
    })
    expect(resolveTextFit({ type: "autofit", minSize: 10, lines: 0 })).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      minSize: 10,
    })
  })

  it("autofit: ignores reserveSpace", () => {
    expect(
      resolveTextFit({ type: "autofit", minSize: 10, reserveSpace: true }),
    ).toEqual({
      type: "autofit",
      lines: 1,
      reserveSpace: false,
      minSize: 10,
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

describe("Text render — autofit", () => {
  it("renders with data-sireno-text-fit='autofit-1' and mounts a ResizeObserver", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10 }} text="hello" />,
    )
    expect(getFitAttr(container)).toBe("autofit-1")
    expect(ResizeObserverMock.instances.length).toBe(1)
    expect(ResizeObserverMock.instances[0].observed.length).toBe(1)
  })

  it("fit state defaults to 'fit' (no inline fontSize clamp) after observer fires on a wide container", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10 }} text="hello" />,
    )
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 500, 50) },
      ])
    })
    const root = container.firstElementChild as HTMLElement
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe("fit")
    expect(root.style.fontSize).toBe("")
  })

  it("fits at minSize with ellipsis state when container is too narrow", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10 }} text="hello" />,
    )
    const root = container.firstElementChild as HTMLElement
    mockLayout(root, { fontSize: 16, scrollWidth: 200, clientWidth: 1 })
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 1, 50) },
      ])
    })
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe("ellipsis")
    expect(root.style.fontSize).toBe("10px")
  })

  it("multi-line: natural 1-line preferred when it fits (no shrink)", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10, lines: 2 }} text="hi" />,
    )
    const root = container.firstElementChild as HTMLElement
    mockLayout(root, {
      fontSize: 16,
      scrollWidth: 80,
      clientWidth: 200,
      scrollHeight: 20,
      clientHeight: 50,
    })
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 200, 50) },
      ])
    })
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe("fit")
    expect(root.style.fontSize).toBe("")
    expect(root.style.WebkitLineClamp).toBe("")
    expect(root.className).toContain("whitespace-nowrap")
  })

  it("multi-line: reduces step-by-step until 1-line fits at minSize", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10, lines: 2 }} text="hi" />,
    )
    const root = container.firstElementChild as HTMLElement
    // scrollWidth scales with fontSize; at natural 16 -> 200, at minSize 10 -> 125
    // clientWidth=130 -> 1-line never fits above 10px
    // scrollHeight=80 (multi-line never fits in 2 lines at any size)
    mockLayout(root, {
      fontSize: 16,
      scrollWidth: 200,
      clientWidth: 130,
      scrollHeight: 80,
      clientHeight: 50,
    })
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 130, 50) },
      ])
    })
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe("fit")
    expect(root.style.fontSize).toBe("10px")
    expect(root.className).toContain("whitespace-nowrap")
  })

it("multi-line: stops reducing once user-lines fit (no further shrink)", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10, lines: 2 }} text="hi" />,
    )
    const root = container.firstElementChild as HTMLElement
    // scrollWidth huge -> 1-line never fits. multi-line fits at size=15
    // scrollHeight=38: at 15 -> 35.625; expected=36; fits
    mockLayout(root, {
      fontSize: 16,
      scrollWidth: 400,
      clientWidth: 80,
      scrollHeight: 38,
      clientHeight: 50,
    })
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 80, 50) },
      ])
    })
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe("fit")
    expect(root.style.fontSize).toBe("15px")
    expect(root.style.getPropertyValue("--sireno-text-lines")).toBe("2")
    expect(root.className).not.toContain("whitespace-nowrap")
  })

  it("multi-line: ellipsis at minSize when nothing fits", () => {
    const { container } = render(
      <Text fit={{ type: "autofit", minSize: 10, lines: 2 }} text="hi" />,
    )
    const root = container.firstElementChild as HTMLElement
    // 1-line never fits (scrollWidth huge); multi-line never fits either
    // scrollHeight=41 at natural 16: at 10 -> 25.625, expected=2*10*1.2=24; 25.625 > 25 (+1 tolerance) doesn't fit
    mockLayout(root, {
      fontSize: 16,
      scrollWidth: 400,
      clientWidth: 80,
      scrollHeight: 41,
      clientHeight: 50,
    })
    act(() => {
      ResizeObserverMock.instances[0].trigger([
        { contentRect: new DOMRectReadOnly(0, 0, 80, 50) },
      ])
    })
    expect(root.getAttribute("data-sireno-text-autofit-state")).toBe(
      "ellipsis",
    )
    expect(root.style.fontSize).toBe("10px")
    expect(root.style.getPropertyValue("--sireno-text-lines")).toBe("2")
  })

  it("disconnects observer on unmount", () => {
    const { unmount } = render(
      <Text fit={{ type: "autofit", minSize: 10 }} text="hello" />,
    )
    const instance = ResizeObserverMock.instances[0]
    expect(instance.observed.length).toBe(1)
    unmount()
    expect(instance.observed.length).toBe(0)
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
