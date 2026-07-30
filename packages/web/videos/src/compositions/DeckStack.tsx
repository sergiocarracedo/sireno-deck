import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { colors } from "../../../astro/src/design/tokens.generated"

/**
 * Cross-fade between three decks stacked front-to-back to communicate the
 * deck-as-stack concept (root + overlay decks).
 */
const decks = [
  { title: "Root", subtitle: "Always-on" },
  { title: "Spotify", subtitle: "Overlay" },
  { title: "Stand-up", subtitle: "Overlay" },
] as const

export const DeckStack = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const tileSize = 200
  const gap = 14
  const gridWidth = 5 * tileSize + 4 * gap

  const deckSpan = durationInFrames / decks.length
  const currentDeckIndex = Math.min(Math.floor(frame / deckSpan), decks.length - 1)
  const localFrame = frame - currentDeckIndex * deckSpan

  const deckOpacity = (i: number) => {
    if (i === currentDeckIndex) return 1
    if (i === currentDeckIndex - 1) {
      return interpolate(localFrame, [0, fps * 0.5], [1, 0], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      })
    }
    if (i === currentDeckIndex + 1) {
      return interpolate(localFrame, [deckSpan - fps * 0.5, deckSpan], [0, 1], {
        extrapolateRight: "clamp",
        extrapolateLeft: "clamp",
      })
    }
    return 0
  }

  const labelOpacity = interpolate(frame, [fps, fps * 1.5], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  })

  return (
    <AbsoluteFill style={{ background: colors.background }}>
      {decks.map((deck, deckIndex) => (
        <AbsoluteFill
          key={deckIndex}
          style={{
            justifyContent: "center",
            alignItems: "center",
            opacity: deckOpacity(deckIndex),
          }}
        >
          <div
            style={{
              position: "absolute",
              left: (1920 - gridWidth) / 2 - deckIndex * 60,
              top: (1080 - 3 * tileSize - 2 * gap) / 2 - deckIndex * 40,
              width: gridWidth,
              height: 3 * tileSize + 2 * gap,
              background: `hsl(220, 20%, ${10 + deckIndex * 2}%)`,
              borderRadius: 24,
              padding: gap,
              display: "grid",
              gridTemplateColumns: `repeat(5, ${tileSize}px)`,
              gridTemplateRows: `repeat(3, ${tileSize}px)`,
              gap,
              boxShadow: "0 30px 60px rgba(0,0,0,0.4)",
              transform: `scale(${1 - deckIndex * 0.05})`,
              transformOrigin: "center",
            }}
          >
            {Array.from({ length: 15 }, (_, i) => (
              <div
                key={i}
                style={{
                  borderRadius: 14,
                  background: "#1a2030",
                }}
              />
            ))}
          </div>
        </AbsoluteFill>
      ))}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 80,
          opacity: labelOpacity,
        }}
      >
        <div
          style={{
            color: colors.frame,
            fontSize: 32,
            letterSpacing: "0.04em",
          }}
        >
          {decks[currentDeckIndex]?.title}
          <span style={{ opacity: 0.6, marginLeft: 12 }}>{decks[currentDeckIndex]?.subtitle}</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  )
}
