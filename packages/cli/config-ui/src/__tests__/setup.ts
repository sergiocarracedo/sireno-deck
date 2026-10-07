import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

if (typeof window !== "undefined" && window.matchMedia === undefined) {
  window.matchMedia = (media) => ({
    matches: false,
    media,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

if (typeof ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
}

if (
  typeof HTMLElement !== "undefined" &&
  HTMLElement.prototype.getAnimations === undefined
) {
  HTMLElement.prototype.getAnimations = () => [] as Animation[]
}

afterEach(() => {
  cleanup()
})
