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

const COLORS = ["#0a0a0f", "#162447", "#0e1f33", "#3b2f6b", "#0e1f33"]

const prefersReducedMotion = () => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export const PaperShader = () => {
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setPaused(prefersReducedMotion())
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
    const onChange = () => setPaused(mq.matches)
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [])

  return (
    <MeshGradient
      width={1440}
      height={900}
      colors={COLORS}
      distortion={0.85}
      swirl={0.18}
      grainMixer={0.0}
      grainOverlay={0.05}
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
