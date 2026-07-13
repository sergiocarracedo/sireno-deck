import type { ReactElement } from "react"

import * as lucideIcons from "lucide-react"
import { type LucideIcon } from "lucide-react"

import { EMOJI_RE, ICON_FALLBACK, isIconSource } from "../../core/icon-source"
import { useAssetCache } from "../contexts/AssetCacheContext"
import { useThemeUiPresentation } from "../theme-presentation"
import { cn } from "../utils/cn"

const TONE_CLASS = {
  accent: "text-accent",
  danger: "text-danger",
  foreground: "text-foreground",
  primary: "text-primary",
  success: "text-success",
  background: "text-background",
  "foreground-contrast": "text-foreground-contrast",
} as const

export type IconTone = keyof typeof TONE_CLASS

export interface IconProps {
  readonly source?: string
  readonly size?: number
  readonly tone?: IconTone
  readonly fill?: boolean
}

const TONE_FALLBACK: IconTone = "danger"

function renderLucide(
  props: { size?: number; tone?: IconTone; fill?: boolean },
  LucideComponent: LucideIcon,
): ReactElement {
  const size = props.size ?? 20
  return (
    <LucideComponent
      className={cn([
        "inline-block shrink-0",
        TONE_CLASS[props.tone ?? "foreground"],
      ])}
      data-sireno-icon-source="generic"
      data-sireno-ui-icon="true"
      focusable="false"
      size={size}
      strokeWidth={1.8}
      fill={props.fill ? "currentColor" : "none"}
    />
  )
}

function renderEmoji(
  emoji: string,
  props: { size?: number; tone?: IconTone },
): ReactElement {
  const size = props.size ?? 20
  return (
    <span
      className={cn([
        "inline-block shrink-0 leading-none",
        TONE_CLASS[props.tone ?? "foreground"],
      ])}
      data-sireno-icon-source="emoji"
      data-sireno-ui-icon="true"
      style={{ fontSize: `${size}px` }}
    >
      {emoji}
    </span>
  )
}

const LUCIDE_ICON_EXPORTS = Object.fromEntries(
  Object.entries(lucideIcons).filter((entry): entry is [string, LucideIcon] => {
    const [exportName, value] = entry
    return (
      typeof value === "object" &&
      exportName[0] === exportName[0]?.toUpperCase()
    )
  }),
) satisfies Record<string, LucideIcon>

function toLucideExportName(name: string): string {
  return name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(
      (segment) => segment[0]!.toUpperCase() + segment.slice(1).toLowerCase(),
    )
    .join("")
}

function resolveLucideIcon(name: string): LucideIcon | undefined {
  const exportName = toLucideExportName(name)
  return LUCIDE_ICON_EXPORTS[exportName]
}

/**
 * Last-resort fallback. Renders the alert-circle Lucide icon with a
 * danger tone so the user sees something went wrong. Never throws —
 * even if the fallback icon name itself can't be resolved (it always
 * can), we return an empty span.
 */
function renderFallbackIcon(props: {
  size?: number
  tone?: IconTone
}): ReactElement {
  const fallbackProps = { ...props, tone: props.tone ?? TONE_FALLBACK }
  const icon = resolveLucideIcon("alert-circle")
  if (icon !== undefined) return renderLucide(fallbackProps, icon)
  return <></>
}

/**
 * Warn once per offending source string about an invalid icon. This keeps
 * the console quiet for legitimate icon:// / asset:// / emoji sources while
 * still surfacing typos like icon://arrowleft that the user might miss.
 */
const warnedSources = new Set<string>()
const warnInvalidIcon = (source: string): void => {
  if (warnedSources.has(source)) return
  warnedSources.add(source)
  console.warn(
    `[Icon] invalid icon source "${source}" — using fallback ${ICON_FALLBACK}. Expected icon://<name>, asset://<id>, or a single emoji.`,
  )
}

export function Icon(props: IconProps): ReactElement {
  const themeUi = useThemeUiPresentation()

  if (themeUi?.primitives?.icon) {
    return themeUi.primitives.icon(props)
  }

  const source = props.source
  const size = props.size ?? 20

  if (typeof source !== "string" || source.length === 0) {
    return renderFallbackIcon(props)
  }

  if (!isIconSource(source)) {
    warnInvalidIcon(source)
    return renderFallbackIcon(props)
  }

  if (EMOJI_RE.test(source)) {
    return renderEmoji(source, props)
  }

  if (source.startsWith("icon://")) {
    const name = source.slice("icon://".length)
    const LucideComponent = resolveLucideIcon(name)
    if (LucideComponent === undefined) {
      warnInvalidIcon(source)
      return renderFallbackIcon(props)
    }
    return renderLucide(props, LucideComponent)
  }

  if (source.startsWith("asset://")) {
    const id = source.slice("asset://".length)
    const cache = useAssetCache()
    const src = cache.get(id)
    if (src === undefined) {
      warnInvalidIcon(source)
      return renderFallbackIcon(props)
    }
    return (
      <img
        alt=""
        className={cn(["inline-block shrink-0"])}
        data-sireno-icon-source="asset"
        data-sireno-ui-icon="true"
        src={src}
        style={{
          height: `${size}px`,
          objectFit: "contain",
          width: `${size}px`,
        }}
      />
    )
  }

  return renderFallbackIcon(props)
}

/** @internal exposed for tests */
export const _testHelpers = {
  EMOJI_RE,
  ICON_FALLBACK,
  isIconSource,
  resolveLucideIcon,
  toLucideExportName,
  renderFallbackIcon,
}
