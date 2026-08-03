/** @vitest-environment jsdom */

import { describe, expect, it, beforeEach, vi } from "vitest"

import { ButtonFrame } from "@/ui"

describe("ui/ButtonFrame", () => {
  beforeEach(() => {
    // Inject the five required variant CSS vars so the component finds real
    // values. Tests assert against these exact variable names.
    const style = document.createElement("style")
    style.textContent = `
      :root {
        --sireno-variant-default-bg: rgb(46, 53, 64);
        --sireno-variant-default-border: rgb(83, 115, 139);
        --sireno-variant-default-fg: rgb(238, 242, 247);
        --sireno-variant-default-glow: rgba(125, 211, 252, 0.6);
        --sireno-variant-highlighted-bg: rgba(125, 211, 252, 0.25);
        --sireno-variant-highlighted-border: rgba(125, 211, 252, 0.55);
        --sireno-variant-highlighted-fg: rgb(238, 242, 247);
        --sireno-variant-highlighted-glow: rgba(125, 211, 252, 0.6);
        --sireno-variant-warning-bg: rgba(195, 245, 255, 0.25);
        --sireno-variant-warning-border: rgba(195, 245, 255, 0.55);
        --sireno-variant-warning-fg: rgb(238, 242, 247);
        --sireno-variant-warning-glow: rgba(195, 245, 255, 0.6);
        --sireno-variant-success-bg: rgba(52, 211, 153, 0.25);
        --sireno-variant-success-border: rgba(52, 211, 153, 0.55);
        --sireno-variant-success-fg: rgb(238, 242, 247);
        --sireno-variant-success-glow: rgba(52, 211, 153, 0.6);
        --sireno-variant-error-bg: rgba(255, 180, 171, 0.15);
        --sireno-variant-error-border: rgba(255, 180, 171, 0.45);
        --sireno-variant-error-fg: rgb(255, 180, 171);
        --sireno-variant-error-glow: rgba(255, 180, 171, 0.6);
        --sireno-variant-neon-pink-bg: rgba(255, 92, 208, 0.4);
        --sireno-variant-neon-pink-border: rgba(255, 92, 208, 0.85);
        --sireno-variant-neon-pink-fg: rgb(255, 5, 208);
        --sireno-variant-neon-pink-glow: rgba(255, 5, 208, 0.8);
        --sireno-variant-cyan-bg: rgba(34, 211, 238, 0.15);
        --sireno-variant-cyan-border: rgba(34, 211, 238, 0.45);
        --sireno-variant-cyan-fg: rgb(34, 211, 238);
        --sireno-variant-magenta-bg: rgba(232, 121, 249, 0.15);
        --sireno-variant-magenta-border: rgba(232, 121, 249, 0.45);
        --sireno-variant-magenta-fg: rgb(232, 121, 249);
        --sireno-variant-amber-bg: rgba(251, 191, 36, 0.15);
        --sireno-variant-amber-border: rgba(251, 191, 36, 0.45);
        --sireno-variant-amber-fg: rgb(251, 191, 36);
        --sireno-variant-lime-bg: rgba(163, 230, 53, 0.15);
        --sireno-variant-lime-border: rgba(163, 230, 53, 0.45);
        --sireno-variant-lime-fg: rgb(163, 230, 53);
      }
    `
    document.head.appendChild(style)
  })

  const renderButtonFrame = (
    variant: string,
  ): {
    frame: HTMLElement | null
  } => {
    const container = document.createElement("div")
    document.body.appendChild(container)
    const root = document.createElement("div")
    container.appendChild(root)

    const React = require("react")
    const ReactDOM = require("react-dom/client")
    const act = require("react-dom/test-utils").act

    act(() => {
      ReactDOM.createRoot(root).render(
        React.createElement(ButtonFrame, {
          pressed: false,
          isTapping: false,
          isHolding: false,
          holdProgress: 0,
          buttonType: "test:btn",
          variant,
          children: React.createElement("span", null, variant),
        }),
      )
    })

    const frame = root.querySelector('[data-sireno-button-frame="true"]')
    return { frame: frame as HTMLElement | null }
  }

  it("renders children inside a div with default variant", () => {
    const { frame } = renderButtonFrame("default")
    expect(frame).not.toBeNull()
    expect(frame?.getAttribute("data-variant")).toBe("default")
    expect(frame?.className).toContain("rounded-2xl")
    expect(frame?.textContent).toContain("default")
    const style = frame?.getAttribute("style") ?? ""
    expect(style).toContain("--sireno-variant-default-bg")
  })

  it.each(["highlighted", "warning", "success", "error"] as const)(
    "resolves %s variant via CSS vars",
    (variant) => {
      const { frame } = renderButtonFrame(variant)
      expect(frame).not.toBeNull()
      expect(frame?.getAttribute("data-variant")).toBe(variant)
      const style = frame?.getAttribute("style") ?? ""
      expect(style).toContain(`--sireno-variant-${variant}-bg`)
      expect(style).toContain(`--sireno-variant-${variant}-border`)
      expect(style).toContain(`--sireno-variant-${variant}-fg`)
    },
  )

  it("resolves theme-declared extra variants like neon-pink", () => {
    const { frame } = renderButtonFrame("neon-pink")
    expect(frame).not.toBeNull()
    const style = frame?.getAttribute("style") ?? ""
    expect(style).toContain("--sireno-variant-neon-pink-bg")
  })

  it.each(["cyan", "magenta", "amber", "lime"] as const)(
    "resolves buttonColor variant %s via CSS vars (no console.warn)",
    (variant) => {
      const warnSpy = vi
        .spyOn(console, "warn")
        .mockImplementation(() => undefined)
      const { frame } = renderButtonFrame(variant)
      expect(frame).not.toBeNull()
      const style = frame?.getAttribute("style") ?? ""
      expect(style).toContain(`--sireno-variant-${variant}-bg`)
      expect(style).toContain(`--sireno-variant-${variant}-border`)
      expect(style).toContain(`--sireno-variant-${variant}-fg`)
      expect(warnSpy).not.toHaveBeenCalled()
      warnSpy.mockRestore()
    },
  )

  it("falls back to default CSS vars when variant is unknown", () => {
    const warnSpy = vi
      .spyOn(console, "warn")
      .mockImplementation(() => undefined)
    const { frame } = renderButtonFrame("totally-unknown")
    const style = frame?.getAttribute("style") ?? ""
    expect(style).toContain("--sireno-variant-totally-unknown-bg")
    expect(style).toContain("--sireno-variant-default-bg")
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("totally-unknown"),
    )
    warnSpy.mockRestore()
  })
})
