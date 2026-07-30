import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion"
import { colors } from "../../../astro/src/design/tokens.generated"

/**
 * Renders a 5x3 mock deck with a different surface on each tile to advertise
 * the breadth of the deck UI primitives.
 */
const tiles = [
  { label: "Mute", variant: "iconLabel", tint: "#1f2c4d" },
  { label: "Push to talk", variant: "splitAction", tint: "#2a1f4d" },
  { label: "CPU 38%", variant: "iconLabelProgress", tint: "#1f4d3a" },
  { label: "Mic 60", variant: "bars", tint: "#4d3a1f" },
  { label: "Spotify", variant: "iconLabel", tint: "#4d1f3a" },
  { label: "OBS", variant: "iconLabel", tint: "#3a1f4d" },
  { label: "Stand-up", variant: "splitAction", tint: "#1f4d4d" },
  { label: "VPN", variant: "iconLabel", tint: "#4d4d1f" },
  { label: "Lights", variant: "iconLabel", tint: "#4d2a1f" },
  { label: "Cam off", variant: "iconLabel", tint: "#1f3a4d" },
  { label: "Charts", variant: "valueChart", tint: "#1f4d2a" },
  { label: "Errors", variant: "temporaryError", tint: "#4d1f1f" },
  { label: "Notes", variant: "labelValueList", tint: "#2a2a2a" },
  { label: "Calendar", variant: "paginated", tint: "#1f2a4d" },
  { label: "Build", variant: "iconLabelProgress", tint: "#3a4d1f" },
] as const

export const ButtonVariants = () => {
  const frame = useCurrentFrame()
  const { fps, durationInFrames } = useVideoConfig()

  const tileSize = 180
  const gap = 12
  const gridWidth = 5 * tileSize + 4 * gap
  const startX = (1920 - gridWidth) / 2
  const startY = (1080 - 3 * tileSize - 2 * gap) / 2

  const stagger = (i: number) =>
    interpolate(frame, [i * 2, i * 2 + fps], [0, 1], {
      extrapolateRight: "clamp",
      extrapolateLeft: "clamp",
    })

  const cycle = durationInFrames
  const opacity = interpolate(frame, [cycle - fps, cycle], [1, 0], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  })

  return (
    <AbsoluteFill style={{ background: colors.background, opacity }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(5, ${tileSize}px)`,
          gridTemplateRows: `repeat(3, ${tileSize}px)`,
          gap,
          position: "absolute",
          left: startX,
          top: startY,
        }}
      >
        {tiles.map((tile, i) => (
          <div
            key={i}
            style={{
              width: tileSize,
              height: tileSize,
              borderRadius: 14,
              background: tile.tint,
              opacity: stagger(i),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.foreground,
              fontSize: 18,
              fontWeight: 500,
              padding: 12,
              textAlign: "center",
            }}
          >
            {tile.label}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  )
}
