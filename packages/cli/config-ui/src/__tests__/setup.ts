import "@testing-library/jest-dom/vitest"
import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

if (
  typeof HTMLElement !== "undefined" &&
  HTMLElement.prototype.getAnimations === undefined
) {
  HTMLElement.prototype.getAnimations = () => [] as Animation[]
}

afterEach(() => {
  cleanup()
})
