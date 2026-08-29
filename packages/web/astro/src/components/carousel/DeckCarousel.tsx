import { useEffect, useRef, useState } from "react"

export interface CarouselSlide {
  id: string
  imageSrc: string
  eyebrow: string
  title: string
  body: string
}

interface Props {
  slides: CarouselSlide[]
  intervalMs?: number
}

export const DeckCarouselClient = ({ slides, intervalMs = 7000 }: Props) => {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = slides.length
  const go = (i: number) => {
    setIndex(((i % total) + total) % total)
  }
  const next = () => go(index + 1)
  const prev = () => go(index - 1)

  useEffect(() => {
    if (paused) return
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % total)
    }, intervalMs)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [index, paused, intervalMs, total])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next()
      else if (e.key === "ArrowLeft") prev()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  })

  const current = slides[index]

  return (
    <div
      className="relative w-full"
      role="region"
      aria-roledescription="carousel"
      aria-label="Sireno Deck showcase"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl shadow-2xl"
        style={{
          border: "1px solid var(--color-border)",
          background: "var(--color-surface)",
        }}
      >
        {slides.map((slide, i) => (
          <img
            key={slide.id}
            src={slide.imageSrc}
            alt={slide.title}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            aria-hidden={i === index ? "false" : "true"}
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
            style={{
              opacity: i === index ? 1 : 0,
              pointerEvents: i === index ? "auto" : "none",
            }}
          />
        ))}
      </div>

      <div className="mt-6 flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold tracking-[0.25em] uppercase"
            style={{ color: "var(--color-accent)" }}
            aria-live="polite"
          >
            {current?.eyebrow}
            <span className="ml-3" style={{ color: "var(--color-muted)" }}>
              {index + 1} / {total}
            </span>
          </p>
          <h3 className="mt-2 text-2xl font-semibold leading-tight text-fg">
            {current?.title}
          </h3>
          <p
            className="mt-2 max-w-xl text-base leading-relaxed"
            style={{ color: "var(--color-muted)" }}
          >
            {current?.body}
          </p>
        </div>
        <div className="flex gap-2 pt-1 shrink-0">
          <button
            type="button"
            onClick={prev}
            aria-label="Previous slide"
            className="rounded-full h-10 w-10 grid place-items-center transition"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-fg)",
            }}
          >
            <span aria-hidden="true">←</span>
          </button>
          <button
            type="button"
            onClick={next}
            aria-label="Next slide"
            className="rounded-full h-10 w-10 grid place-items-center transition"
            style={{
              border: "1px solid var(--color-border)",
              color: "var(--color-fg)",
            }}
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-center gap-2">
        {slides.map((slide, i) => (
          <button
            type="button"
            key={slide.id}
            onClick={() => go(i)}
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            aria-current={i === index ? "true" : "false"}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? 32 : 8,
              background:
                i === index ? "var(--color-accent)" : "var(--color-border)",
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default DeckCarouselClient
