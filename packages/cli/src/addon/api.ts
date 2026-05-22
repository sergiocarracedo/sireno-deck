import { createElement } from "react"

import type { ReactElement, ReactNode } from "react"
import type { ZodType } from "zod"

import type { CommandExecutionResult } from "../action/executor.js"
import type { Theme } from "../config/theme.js"
import type { HostContext } from "../system/host-context.js"

export const SIRENO_ADDON_API_VERSION = 1

export interface AddonButtonEnvelope {
  position: number
  type: string
}

export interface AddonButtonSurfaceContract {
  full_surface?: boolean
  sample_interval_ms?: number
}

export interface AddonDeckEnvelope {
  id: string
  type: string
}

export interface AddonGeneratedButton extends AddonButtonEnvelope, AddonButtonSurfaceContract {
  [key: string]: unknown
}

export interface AddonGeneratedDeck {
  background?: string
  buttons: AddonGeneratedButton[]
  id: string
  name?: string
}

export interface AddonButtonMethods {
  getActiveDeckId: () => string
  goBack: () => Promise<void> | void
  invalidate: () => void
  navigateToDeck: (deckId: string) => Promise<void> | void
  runCommand: (command: string) => Promise<CommandExecutionResult>
}

export interface AddonButtonInstance {
  dispose?: () => Promise<void> | void
  onActivate?: () => Promise<void> | void
  onDeactivate?: () => Promise<void> | void
  onPress?: () => Promise<void> | void
  onRelease?: () => Promise<void> | void
  onTap?: () => Promise<void> | void
  refresh?: () => Promise<void> | void
  render: () => ReactElement
}

export interface ButtonSurfaceProps extends AddonButtonSurfaceContract {
  children: ReactNode
}

export interface CreateAddonButtonInstanceOptions<TConfig> {
  button: AddonButtonEnvelope
  config: TConfig
  hostContext: HostContext
  methods: AddonButtonMethods
  theme: Theme
}

export interface AddonButtonDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  createInstance: (options: CreateAddonButtonInstanceOptions<TConfig>) => AddonButtonInstance
  defaultIntervalMs?: number
  type: string
}

export function ButtonSurface(props: ButtonSurfaceProps): ReactElement {
  return createElement("div", {
    "data-sireno-button-surface": "true",
    ...(props.full_surface !== undefined ? { "data-sireno-full-surface": props.full_surface ? "true" : "false" } : {}),
    ...(props.sample_interval_ms !== undefined ? { "data-sireno-media-sample-interval-ms": String(props.sample_interval_ms) } : {}),
    children: props.children,
    style: {
      display: "contents",
    },
  })
}

export function createDomTextLabel(props: {
  children: ReactNode
}): ReactElement {
  return createElement("span", {
    children: props.children,
    style: {
      color: "#eef2f7",
      display: "block",
      fontFamily: "IBM Plex Sans, sans-serif",
      fontSize: "12px",
      fontWeight: 700,
      letterSpacing: "0.01em",
      lineHeight: 1.2,
      textAlign: "center",
    },
  })
}

export function createDomIcon(props: {
  src: string
  size?: number
}): ReactElement {
  const size = props.size ?? 24

  return createElement("img", {
    alt: "",
    src: props.src,
    style: {
      height: `${size}px`,
      objectFit: "contain",
      width: `${size}px`,
    },
  })
}

export function createDomStack(props: {
  children: ReactNode
  gap?: number
}): ReactElement {
  const children = Array.isArray(props.children)
    ? props.children.map((child, index) => (child === null ? null : createElement("span", { key: index }, child)))
    : props.children

  return createElement("div", {
    children,
    style: {
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: `${props.gap ?? 6}px`,
      justifyContent: "center",
      width: "100%",
    },
  })
}

export function createBaseShapeIconLabelContent(props: {
  icon?: string
  keyIndex: number
  label: string
}): ReactElement {
  return createDomStack({
    children: [
      props.icon ? createDomIcon({ src: props.icon }) : null,
      createDomTextLabel({ children: props.label }),
    ],
  })
}

export function createBaseShapeTextContent(props: {
  fit?: "shrink" | "wrap"
  keyIndex: number
  label: string
}): ReactElement {
  return createDomTextLabel({ children: props.label })
}

export interface CreateAddonDeckOptions<TConfig> {
  config: TConfig
  deck: AddonDeckEnvelope
}

export interface AddonDeckDefinition<TConfig = unknown> {
  configSchema: ZodType<TConfig>
  createDecks: (options: CreateAddonDeckOptions<TConfig>) => Record<string, AddonGeneratedDeck>
  type: string
}

export interface SirenoAddon {
  apiVersion: number
  assets?: Record<string, string>
  buttons: readonly AddonButtonDefinition[]
  decks?: readonly AddonDeckDefinition[]
  name: string
}
