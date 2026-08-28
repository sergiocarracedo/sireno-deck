/**
 * DeckPrimitives — Sireno Deck button primitives rendered with inline styles.
 *
 * These are direct implementations of the deck's visual primitives, mirroring
 * packages/cli/src/ui/primitives/* but without any Tailwind dependency.
 * Values come from tokens.generated.ts so they stay in sync with the source theme.
 *
 * Phase D goal: verify the visual output matches the running deck by rendering
 * real ButtonFrame-shaped tiles in Remotion compositions.
 */

import type { ReactNode } from "react"
import { colors } from "../../../astro/src/design/tokens.generated"

// ─── chip ────────────────────────────────────────────────────────────────────

export interface ChipProps {
  children?: ReactNode
  variant?: "default" | "active"
  style?: React.CSSProperties
}

export const Chip = ({ children, variant = "default", style }: ChipProps) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      borderRadius: 9999,
      padding: "2px 8px",
      fontSize: 9,
      fontWeight: 300,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      background: variant === "active" ? colors.primary + "22" : colors.frame + "33",
      color: variant === "active" ? colors.primary : colors.foreground,
      border: `1px solid ${variant === "active" ? colors.primary + "55" : colors.frame + "44"}`,
      ...style,
    }}
  >
    {children}
  </div>
)

// ─── icon ─────────────────────────────────────────────────────────────────────

export interface IconProps {
  src?: string
  children?: ReactNode
  size?: number
  style?: React.CSSProperties
}

export const Icon = ({ src, children, size = 32, style }: IconProps) => (
  <div
    style={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontSize: size * 0.5,
      borderRadius: 6,
      background: colors.frame + "33",
      color: colors.foreground,
      ...style,
    }}
  >
    {src ? (
      <img src={src} style={{ width: "100%", height: "100%", objectFit: "contain" }} alt="" />
    ) : (
      children
    )}
  </div>
)

// ─── text ─────────────────────────────────────────────────────────────────────

export interface TextProps {
  children?: ReactNode
  weight?: 100 | 300 | 400 | 500 | 700
  size?: number
  style?: React.CSSProperties
}

export const Text = ({ children, weight = 100, size = 12, style }: TextProps) => (
  <span
    style={{
      fontFamily: "IBM Plex Sans, sans-serif",
      fontSize: size,
      fontWeight: weight,
      color: colors.foreground,
      lineHeight: 1.4,
      ...style,
    }}
  >
    {children}
  </span>
)

// ─── label ────────────────────────────────────────────────────────────────────

export interface LabelProps {
  children?: ReactNode
  auxiliary?: boolean
  style?: React.CSSProperties
}

export const Label = ({ children, auxiliary = false, style }: LabelProps) => (
  <span
    style={{
      fontFamily: "IBM Plex Sans, sans-serif",
      fontSize: auxiliary ? 8 : 12,
      fontWeight: auxiliary ? 300 : 100,
      letterSpacing: auxiliary ? 1.2 : 0,
      color: colors.foreground,
      lineHeight: 1.4,
      textAlign: "center",
      ...style,
    }}
  >
    {children}
  </span>
)

// ─── tapIndicator ─────────────────────────────────────────────────────────────

export interface TapIndicatorProps {
  progress?: number
  style?: React.CSSProperties
}

export const TapIndicator = ({ progress = 0, style }: TapIndicatorProps) => (
  <div
    style={{
      position: "absolute",
      bottom: 4,
      left: "50%",
      transform: "translateX(-50%)",
      width: 24,
      height: 3,
      borderRadius: 2,
      background: colors.frame + "55",
      overflow: "hidden",
      ...style,
    }}
  >
    <div
      style={{
        width: `${Math.min(progress, 1) * 100}%`,
        height: "100%",
        background: colors.accent,
        borderRadius: 2,
        transition: "width 0.05s linear",
      }}
    />
  </div>
)

// ─── DeckButton ───────────────────────────────────────────────────────────────

export type DeckButtonVariant = "default" | "error" | "blue" | "green" | "purple"

const DEGREES_PER_CIRCLE = 360

const VARIANT_STYLES: Record<
  DeckButtonVariant,
  { background: string; border: string; color: string }
> = {
  default: {
    background: colors.background,
    border: colors.frame,
    color: colors.foreground,
  },
  error: {
    background: colors.danger + "26",
    border: colors.danger + "73",
    color: colors.danger,
  },
  blue: {
    background: colors.primary + "40",
    border: colors.primary + "8c",
    color: colors.primary,
  },
  green: {
    background: colors.success + "40",
    border: colors.success + "8c",
    color: colors.success,
  },
  purple: {
    background: colors.accent + "40",
    border: colors.accent + "8c",
    color: colors.accent,
  },
}

export interface DeckButtonProps {
  children?: ReactNode
  variant?: DeckButtonVariant
  isHolding?: boolean
  holdProgress?: number
  style?: React.CSSProperties
  onClick?: () => void
}

export const DeckButton = ({
  children,
  variant = "default",
  isHolding = false,
  holdProgress = 0,
  style,
  onClick,
}: DeckButtonProps) => {
  const v = VARIANT_STYLES[variant]
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: 14,
        padding: 4,
        background: v.background,
        border: `1.5px solid ${v.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        cursor: onClick ? "pointer" : "default",
        opacity: isHolding ? 0.85 : 1,
        transform: isHolding ? "scale(0.97)" : "scale(1)",
        transition: "transform 0.1s ease, opacity 0.1s ease",
        boxSizing: "border-box",
        ...style,
      }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
    >
      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>

      {/* Hold progress ring */}
      {isHolding && (
        <div
          style={{
            background: `conic-gradient(${v.border} ${holdProgress * DEGREES_PER_CIRCLE}deg, transparent ${holdProgress * DEGREES_PER_CIRCLE}deg)`,
            borderRadius: 14,
            inset: 0,
            opacity: 0.5,
            position: "absolute",
          }}
        />
      )}
    </div>
  )
}

// ─── surface: iconLabel ───────────────────────────────────────────────────────

export interface IconLabelSurfaceProps {
  icon?: ReactNode
  label?: string
  chip?: ReactNode
  style?: React.CSSProperties
}

export const IconLabelSurface = ({ icon, label, chip, style }: IconLabelSurfaceProps) => (
  <div
    style={{
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: 4,
      height: "100%",
      justifyContent: "center",
      width: "100%",
      ...style,
    }}
  >
    {icon && <div style={{ marginBottom: 2 }}>{icon}</div>}
    {label && (
      <span
        style={{
          color: colors.foreground,
          fontFamily: "IBM Plex Sans, sans-serif",
          fontSize: 10,
          fontWeight: 100,
          lineHeight: 1.3,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    )}
    {chip}
  </div>
)
