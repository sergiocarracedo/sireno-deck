import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { DeckButton, IconLabelSurface, Text } from "../lib/DeckPrimitives"
import { colors } from "../../../astro/src/design/tokens.generated"

/**
 * HeroLoop — animated deck UI at the landing page top.
 *
 * A 5×3 deck grid cycles through three configurations over a 6-second loop:
 * default dark → blue accent → green success. The deck is always visible;
 * the variant transitions are smooth cross-fades driven by frame interpolation.
 */
export const HeroLoop = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const loopFrames = durationInFrames
  const cycle = loopFrames / 3

  // Which configuration are we in?
  const phase = Math.floor((frame % loopFrames) / cycle)

  // Smooth progress through the current phase (0 → 1)
  const phaseFrame = frame % cycle
  const fadeIn = interpolate(phaseFrame, [0, fps * 0.5], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  })

  // Variant per phase
  const variants: Array<"default" | "blue" | "green"> = ["default", "blue", "green"]

  const currentVariant = variants[phase]

  // Deck config: 15 tiles in 5×3
  const tiles = [
    { id: 0, label: "Mute", icon: "🔇", variant: "default" as const },
    { id: 1, label: "OBS", icon: "📹", variant: "default" as const },
    { id: 2, label: "Spotify", icon: "🎧", variant: "blue" as const },
    { id: 3, label: "Terminal", icon: ">_", variant: "default" as const },
    { id: 4, label: "Browser", icon: "🌐", variant: "default" as const },
    { id: 5, label: "Discord", icon: "💬", variant: "blue" as const },
    { id: 6, label: "Mail", icon: "✉️", variant: "default" as const },
    { id: 7, label: "Timer", icon: "⏱", variant: "green" as const, highlighted: true },
    { id: 8, label: "Calc", icon: "🔢", variant: "default" as const },
    { id: 9, label: "Files", icon: "📁", variant: "default" as const },
    { id: 10, label: "Slack", icon: "💼", variant: "blue" as const },
    { id: 11, label: "Music", icon: "🎵", variant: "green" as const },
    { id: 12, label: "VPN", icon: "🔒", variant: "default" as const },
    { id: 13, label: "Lights", icon: "💡", variant: "default" as const },
    { id: 14, label: "Cam", icon: "📷", variant: "default" as const },
  ]

  const tileSize = 120
  const gap = 12
  const gridWidth = 5 * tileSize + 4 * gap
  const gridHeight = 3 * tileSize + 2 * gap
  const startX = (1920 - gridWidth) / 2
  const startY = (1080 - gridHeight) / 2

  return (
    <AbsoluteFill style={{ background: colors.background }}>
      {/* Ambient glow behind deck */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: gridWidth + 80,
          height: gridHeight + 80,
          borderRadius: 40,
          background:
            currentVariant === "blue"
              ? `radial-gradient(ellipse, ${colors.tintBlue}18 0%, transparent 70%)`
              : currentVariant === "green"
                ? `radial-gradient(ellipse, ${colors.tintGreen}18 0%, transparent 70%)`
                : `radial-gradient(ellipse, ${colors.frame}12 0%, transparent 70%)`,
          filter: "blur(20px)",
          opacity: fadeIn,
          transition: "background 0.5s ease",
        }}
      />

      {/* 5×3 grid */}
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
        {tiles.map((tile) => (
          <DeckButton
            key={tile.id}
            variant={tile.variant}
            isHolding={false}
            style={{ opacity: fadeIn }}
          >
            <IconLabelSurface
              icon={
                <Text size={28} weight={400} style={{ lineHeight: 1 }}>
                  {tile.icon}
                </Text>
              }
              label={tile.label}
            />
          </DeckButton>
        ))}
      </div>

      {/* Bottom label */}
      <div
        style={{
          position: "absolute",
          bottom: 60,
          left: 0,
          right: 0,
          textAlign: "center",
          opacity: fadeIn,
        }}
      >
        <span
          style={{
            fontFamily: "IBM Plex Sans, sans-serif",
            fontSize: 13,
            fontWeight: 100,
            color: colors.frame,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Sireno Deck · Declarative · Overlay Decks · Themable
        </span>
      </div>
    </AbsoluteFill>
  )
}
