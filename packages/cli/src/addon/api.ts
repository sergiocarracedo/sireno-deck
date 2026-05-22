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
  style_id?: string
  wrapper_id?: string
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
    ...(props.style_id !== undefined ? { "data-sireno-style-id": props.style_id } : {}),
    ...(props.wrapper_id !== undefined ? { "data-sireno-wrapper-id": props.wrapper_id } : {}),
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

export function createBaseShapeIconLabelContent(props: {
  icon?: string
  keyIndex: number
  label: string
}): ReactElement {
  return createElement(ButtonSurface, null, createElement("div", {
    style: {
      alignItems: "center",
      display: "flex",
      flexDirection: "column",
      gap: "6px",
      justifyContent: "center",
      width: "100%",
    },
  },
  props.icon
    ? createElement("img", { alt: "", src: props.icon, style: { height: "24px", objectFit: "contain", width: "24px" } })
    : null,
  createDomTextLabel({ children: props.label })))
}

export function createBaseShapeTextContent(props: {
  fit?: "shrink" | "wrap"
  keyIndex: number
  label: string
}): ReactElement {
  return createElement(ButtonSurface, null, createDomTextLabel({ children: props.label }))
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

export interface AddonWrapperPrimitiveDefinition {
  name: string
  wrapper: "shared"
}

export interface AddonSharedStylePrimitiveDefinition {
  tone?: "accent" | "default"
}

export interface AddonStylePrimitiveDefinition {
  name: string
  shared?: AddonSharedStylePrimitiveDefinition
}

export interface RegisteredAddonWrapperPrimitive extends AddonWrapperPrimitiveDefinition {
  addonName: string
  id: string
}

export interface RegisteredAddonStylePrimitive extends AddonStylePrimitiveDefinition {
  addonName: string
  id: string
}

export interface SirenoAddon {
  apiVersion: number
  assets?: Record<string, string>
  buttons: readonly AddonButtonDefinition[]
  decks?: readonly AddonDeckDefinition[]
  name: string
  styles?: readonly AddonStylePrimitiveDefinition[]
  wrappers?: readonly AddonWrapperPrimitiveDefinition[]
}
