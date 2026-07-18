/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import {
  Text,
  resolveTextFit,
  type ResolvedTextFit,
  type TextFit,
} from "../Text"

const getFitAttr = (container: HTMLElement) =>
  container.firstElementChild?.getAttribute("data-sireno-text-fit")

afterEach(() => {
  cleanup()
})

describe("resolveTextFit", () => {
  it("defaults undefined to wrap mode", () => {
    expect(resolveTextFit(undefined)).toEqual({ kind: "mode", mode: "wrap" })
  })

  it("returns string aliases as mode", () => {
    const cases: TextFit[] = ["wrap", "ellipsis", "shrink", "hidden"]
    for (const fit of cases) {
      expect(resolveTextFit(fit)).toEqual({ kind: "mode", mode: fit })
    }
  })

  it("normalizes line-clamp object: floors fractional lines, defaults reserveSpace to false", () => {
    expect(
      resolveTextFit({ type: "line-clamp", lines: 2 }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 2,
      reserveSpace: false,
    })

    expect(
      resolveTextFit({ type: "line-clamp", lines: 2.7 }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 2,
      reserveSpace: false,
    })
  })

  it("clamps lines to [1, 6]", () => {
    expect(
      resolveTextFit({ type: "line-clamp", lines: 0 }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 1,
      reserveSpace: false,
    })
    expect(
      resolveTextFit({ type: "line-clamp", lines: -3 }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 1,
      reserveSpace: false,
    })
    expect(
      resolveTextFit({ type: "line-clamp", lines: 99 }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 6,
      reserveSpace: false,
    })
  })

  it("propagates reserveSpace when set", () => {
    expect(
      resolveTextFit({ type: "line-clamp", lines: 3, reserveSpace: true }),
    ).toEqual<ResolvedTextFit>({
      kind: "line-clamp",
      lines: 3,
      reserveSpace: true,
    })
  })
})

describe("Text render — backward-compat string fit", () => {
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
    expect(root.className).not.toContain("text-ellipsis")
    expect(root.className).not.toContain("whitespace-nowrap")
    const inlineStyle = root.style as CSSStyleDeclaration & {
      WebkitBoxOrient?: string
      WebkitLineClamp?: string
    }
    expect(inlineStyle.display).toBe("-webkit-box")
    expect(inlineStyle.WebkitBoxOrient).toBe("vertical")
    expect(inlineStyle.WebkitLineClamp).toBe("2")
    expect(inlineStyle.overflow).toBe("hidden")
    expect(inlineStyle.textOverflow).toBe("ellipsis")
  })

  it("defaults to wrap when fit is omitted", () => {
    const { container } = render(<Text text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("whitespace-normal")
    expect(getFitAttr(container)).toBe("wrap")
  })

  it("uses sireno-text-fit-shrink for fit='shrink'", () => {
    const { container } = render(<Text fit="shrink" text="hello" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("sireno-text-fit-shrink")
    expect(root.getAttribute("data-sireno-text-shrink-state")).toBe("pending")
  })
})

describe("Text render — line-clamp object fit", () => {
  it("applies line-clamp-2 for { type: 'line-clamp', lines: 2 }", () => {
    const { container } = render(
      <Text fit={{ type: "line-clamp", lines: 2 }} text="hello" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("line-clamp-2")
    expect(getFitAttr(container)).toBe("line-clamp-2")
  })

  it("applies line-clamp-6 for lines=6", () => {
    const { container } = render(
      <Text fit={{ type: "line-clamp", lines: 6 }} text="hello" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("line-clamp-6")
    expect(getFitAttr(container)).toBe("line-clamp-6")
  })

  it("clamps lines > 6 to 6", () => {
    const { container } = render(
      <Text fit={{ type: "line-clamp", lines: 99 }} text="hello" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("line-clamp-6")
    expect(getFitAttr(container)).toBe("line-clamp-6")
  })

  it("clamps lines < 1 to 1", () => {
    const { container } = render(
      <Text fit={{ type: "line-clamp", lines: 0 }} text="hello" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.className).toContain("line-clamp-1")
  })
})

describe("Text render — reserveSpace", () => {
  it("applies min-height for reserveSpace: true with default lineHeight=1", () => {
    const { container } = render(
      <Text
        fit={{ type: "line-clamp", lines: 3, reserveSpace: true }}
        text=""
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("3em")
  })

  it("scales min-height by custom lineHeight", () => {
    const { container } = render(
      <Text
        fit={{ type: "line-clamp", lines: 2, reserveSpace: true }}
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
        fit={{ type: "line-clamp", lines: 4, reserveSpace: true }}
        text="hi"
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("4em")
  })

  it("does not apply min-height when reserveSpace is false", () => {
    const { container } = render(
      <Text
        fit={{ type: "line-clamp", lines: 2, reserveSpace: false }}
        text=""
      />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })

  it("does not apply min-height when reserveSpace is omitted", () => {
    const { container } = render(
      <Text fit={{ type: "line-clamp", lines: 2 }} text="" />,
    )
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })

  it("does not apply min-height for non-line-clamp modes", () => {
    const { container } = render(<Text fit="ellipsis" text="" />)
    const root = container.firstElementChild as HTMLElement
    expect(root.style.minHeight).toBe("")
  })
})
