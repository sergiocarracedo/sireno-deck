/**
 * PaperShader — shaders.com mesh-gradient backdrop for the hero.
 *
 * Implementation of the "shaders.com or similar" hero effect: a slowly
 * drifting four-color radial mesh-gradient rendered to a WebGL canvas by
 * @paper-design/shaders-react (the React SDK that powers shaders.com).
 *
 * Falls back to a static CSS radial gradient when JS is disabled or
 * `prefers-reduced-motion` is set, so the page still looks intentional
 * without the JS island.
 */
import { useEffect, useState } from "react"
import { MeshGradient } from "@paper-design/shaders-react"

const DARK_COLORS = ["#071116", "#075985", "#2888c0", "#7c3aed", "#4f46e5"]
const LIGHT_COLORS = ["#f3fcf4", "#bae6fd", "#1676a6", "#c4b5fd", "#7c3aed"]

const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export const PaperShader = () => {
  const [paused, setPaused] = useState(false)
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    typeof document === "undefined"
      ? "dark"
      : document.documentElement.dataset.theme === "light"
        ? "light"
        : "dark",
  )

  useEffect(() => {
    setPaused(prefersReducedMotion())
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setPaused(mq.matches)
    mq.addEventListener("change", onChange)

    const root = document.documentElement
    const themeObserver = new MutationObserver(() => {
      setTheme(root.dataset.theme === "light" ? "light" : "dark")
    })
    themeObserver.observe(root, {
      attributes: true,
      attributeFilter: ["data-theme"],
    })

    return () => {
      mq.removeEventListener("change", onChange)
      themeObserver.disconnect()
    }
  }, [])

  return (
    <MeshGradient
      width={1440}
      height={900}
      colors={theme === "light" ? LIGHT_COLORS : DARK_COLORS}
      distortion={0.85}
      swirl={0.18}
      grainMixer={0.0}
      grainOverlay={0.1}
      speed={paused ? 0 : 0.45}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  )
}

export default PaperShader
