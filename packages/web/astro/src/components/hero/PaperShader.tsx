/**
 * PaperShader — animated Canvas2D mesh-gradient backdrop for the hero.
 *
 * Dependency-free shader: four-color radial blobs drift on a slow noise-ish
 * path, composited with 'screen'. Honors prefers-reduced-motion by pausing.
 * Replaces the static CSS glow layers that read too faint behind the H1.
 */
import { useEffect, useRef } from "react"

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches

interface Blob {
  x: number
  y: number
  r: number
  c: string
  vx: number
  vy: number
}

const makeBlobs = (): Blob[] => [
  { x: 0.2, y: 0.18, r: 0.55, c: "#162447", vx: 0.0006, vy: 0.0004 },
  { x: 0.78, y: 0.25, r: 0.5, c: "#0b1224", vx: -0.0005, vy: 0.0003 },
  { x: 0.5, y: 0.6, r: 0.7, c: "#20285c", vx: 0.0003, vy: -0.0005 },
  { x: 0.15, y: 0.75, r: 0.45, c: "#123", vx: 0.0004, vy: 0.0002 },
  { x: 0.85, y: 0.7, r: 0.5, c: "#0e0a1a", vx: -0.0004, vy: 0.0002 },
]

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace("#", ""), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export const PaperShader = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let raf = 0
    const reduced = prefersReducedMotion()
    const blobs = makeBlobs()
    const cw = (canvas.width = canvas.clientWidth * devicePixelRatio)
    const ch = (canvas.height = canvas.clientHeight * devicePixelRatio)
    const blobRgba = blobs.map((b) => hexToRgb(b.c))

    let t = 0
    const draw = () => {
      t += 0.005
      ctx.clearRect(0, 0, cw, ch)
      ctx.globalCompositeOperation = "screen"
      for (let i = 0; i < blobs.length; i++) {
        const b = blobs[i]
        if (!reduced) {
          b.x += b.vx
          b.y += b.vy
          if (b.x < 0 || b.x > 1) b.vx *= -1
          if (b.y < 0 || b.y > 1) b.vy *= -1
        }
        const wobbleX = 0.02 * Math.sin(t * 1.1 + i * 2.1)
        const wobbleY = 0.02 * Math.cos(t * 0.9 + i * 1.7)
        const x = (b.x + wobbleX) * cw
        const y = (b.y + wobbleY) * ch
        const r = b.r * Math.min(cw, ch)
        const [rr, gg, bb] = blobRgba[i]
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r)
        grad.addColorStop(0, `rgba(${rr},${gg},${bb},0.45)`)
        grad.addColorStop(1, `rgba(${rr},${gg},${bb},0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(x, y, r, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalCompositeOperation = "source-over"
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    const onResize = () => {
      canvas.width = canvas.clientWidth * devicePixelRatio
      canvas.height = canvas.clientHeight * devicePixelRatio
    }
    window.addEventListener("resize", onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", onResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      style={{ opacity: 0.9, pointerEvents: "none" }}
    />
  )
}

export default PaperShader
