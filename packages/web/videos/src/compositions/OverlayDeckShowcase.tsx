import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { DeckButton, IconLabelSurface, Text } from "../lib/DeckPrimitives"
import { colors } from "../../../astro/src/design/tokens.generated"

/**
 * OverlayDeckShowcase — demonstrates overlay deck activation.
 *
 * A 5×3 deck shows the "Spotify" overlay: the highlighted tile shows the
 * active overlay state. The spotlight sweeps across tiles over the duration.
 */
export const OverlayDeckShowcase = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const tileSize = 120
  const gap = 12
  const gridWidth = 5 * tileSize + 4 * gap
  const gridHeight = 3 * tileSize + 2 * gap
  const startX = (1920 - gridWidth) / 2
  const startY = (1080 - gridHeight) / 2

  // Label fades in after 1s
  const labelOpacity = interpolate(frame, [fps, fps * 1.5], [0, 1], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  })

  // Spotlight sweeps across all 15 tiles; tile 7 (center) gets the "overlay" treatment
  const sweepFrame = (frame / durationInFrames) * 15
  const spotlightIndex = Math.floor(sweepFrame) % 15

  const tiles = [
    { id: 0, label: "⏮", icon: "⏮", variant: "default" as const },
    { id: 1, label: "⏯", icon: "⏯", variant: "default" as const },
    { id: 2, label: "⏭", icon: "⏭", variant: "default" as const },
    { id: 3, label: "🔇", icon: "🔇", variant: "default" as const },
    { id: 4, label: "🔊", icon: "🔊", variant: "default" as const },
    { id: 5, label: "🎧", icon: "🎧", variant: "default" as const },
    { id: 6, label: "❤️", icon: "❤️", variant: "default" as const },
    { id: 7, label: "Spotify", icon: "🎵", variant: "green" as const, isOverlay: true },
    { id: 8, label: "🔀", icon: "🔀", variant: "default" as const },
    { id: 9, label: "🔁", icon: "🔁", variant: "default" as const },
    { id: 10, label: "🎶", icon: "🎶", variant: "default" as const },
    { id: 11, label: "📋", icon: "📋", variant: "default" as const },
    { id: 12, label: "⚙️", icon: "⚙️", variant: "default" as const },
    { id: 13, label: "🔗", icon: "🔗", variant: "default" as const },
    { id: 14, label: "ℹ️", icon: "ℹ️", variant: "default" as const },
  ]

  return (
    <AbsoluteFill style={{ background: colors.background }}>
      {/* Header */}
      <div
        style={{
          position: "absolute",
          top: 60,
          left: 0,
          right: 0,
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: 11,
            fontWeight: 300,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: colors.tintGreen,
          }}
        >
          Overlay deck: Spotify
        </p>
      </div>

      {/* Deck grid */}
      <div
        style={{
          position: "absolute",
          left: startX,
          top: startY,
          display: "grid",
          gridTemplateColumns: `repeat(5, ${tileSize}px)`,
          gridTemplateRows: `repeat(3, ${tileSize}px)`,
          gap,
        }}
      >
        {tiles.map((tile) => {
          const isSpotlight = tile.id === spotlightIndex
          const isOverlay = tile.isOverlay

          return (
            <DeckButton
              key={tile.id}
              variant={isOverlay ? "green" : tile.variant}
              isHolding={false}
              style={{
                transform: isSpotlight ? "scale(1.06)" : "scale(1)",
                border: isOverlay
                  ? `2px solid ${colors.tintGreen}`
                  : isSpotlight
                    ? `2px solid ${colors.tintBlue}`
                    : undefined,
                boxShadow: isOverlay
                  ? `0 0 20px ${colors.tintGreen}44`
                  : isSpotlight
                    ? `0 0 12px ${colors.tintBlue}33`
                    : undefined,
              }}
            >
              <IconLabelSurface
                icon={
                  <Text size={24} weight={400} style={{ lineHeight: 1 }}>
                    {tile.icon}
                  </Text>
                }
                label={tile.label}
              />
            </DeckButton>
          )
        })}
      </div>

      {/* Explanation label */}
      <div
        style={{
          position: "absolute",
          bottom: 80,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: labelOpacity,
        }}
      >
        <p
          style={{
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: 22,
            fontWeight: 100,
            color: colors.foreground,
            letterSpacing: "0.04em",
          }}
        >
          Overlay decks reshape the deck based on what's focused.
        </p>
      </div>
    </AbsoluteFill>
  )
}
