import { createContext, createElement } from "react"
import ReactReconciler from "react-reconciler"
import { DefaultEventPriority } from "react-reconciler/constants"

import type { ReactElement } from "react"
import type { ReactContext } from "react-reconciler"

import type { ButtonInstance } from "../core/schemas.js"
import type {
  DeckButtonProps,
  DeckSurfaceProps,
  DeckTextProps,
} from "./types.js"

export type { DeckButtonProps, DeckSurfaceProps, DeckTextProps } from "./types.js"

export interface RenderNode {
  accent?: string
  background?: string
  detailLines?: string[]
  type: "deck-button" | "deck-surface" | "deck-text"
  displayValue?: string
  fit?: "shrink" | "wrap"
  full_surface?: boolean
  keyIndex?: number
  label?: string
  icon?: string
  progress?: number
  style_id?: string
  subtitle?: string
  toggle_mode?: "get-set" | "internal" | "toggle-status"
  text?: string
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "error" | "fan" | "media" | "metric" | "toggle"
  wrapper?: "shared"
  wrapper_id?: string
  children: RenderNode[]
}

export interface RenderDescription {
  accent?: string
  background?: string
  detailLines?: string[]
  displayValue?: string
  fit?: "shrink" | "wrap"
  full_surface?: boolean
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  style_id?: string
  subtitle?: string
  toggle_mode?: "get-set" | "internal" | "toggle-status"
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "error" | "fan" | "media" | "metric" | "toggle"
  wrapper?: "shared"
  wrapper_id?: string
}

interface RenderContainer {
  children: RenderNode[]
}

type RenderInstance = RenderNode
type RenderTextInstance = never
type HostContext = Record<string, never>
type RenderProps = DeckButtonProps | DeckSurfaceProps | DeckTextProps

const ROOT_HOST_CONTEXT: HostContext = {}
const HOST_TRANSITION_CONTEXT = createContext<"not-pending">("not-pending") as unknown as ReactContext<"not-pending">

function createContainer(): RenderContainer {
  return { children: [] }
}

function appendChild(parent: RenderContainer | RenderInstance, child: RenderInstance): void {
  parent.children.push(child)
}

function removeChild(parent: RenderContainer | RenderInstance, child: RenderInstance): void {
  const index = parent.children.indexOf(child)
  if (index >= 0) {
    parent.children.splice(index, 1)
  }
}

function isDeckTextProps(props: unknown): props is DeckTextProps {
  return (
    typeof props === "object" &&
    props !== null &&
    "keyIndex" in props &&
    typeof (props as DeckTextProps).keyIndex === "number" &&
    "text" in props &&
    typeof (props as DeckTextProps).text === "string"
  )
}

function isDeckSurfaceProps(props: unknown): props is DeckSurfaceProps {
  return (
    typeof props === "object" &&
    props !== null &&
    "buttons" in props &&
    Array.isArray((props as DeckSurfaceProps).buttons)
  )
}

function isDeckButtonProps(props: unknown): props is DeckButtonProps {
  return (
    typeof props === "object" &&
    props !== null &&
    "keyIndex" in props &&
    typeof (props as DeckButtonProps).keyIndex === "number"
  )
}

const hostConfig: ReactReconciler.HostConfig<
  string,
  RenderProps,
  RenderContainer,
  RenderInstance,
  RenderTextInstance,
  never,
  never,
  never,
  RenderInstance,
  HostContext,
  never,
  number,
  -1,
  "not-pending"
> = {
  supportsMutation: true,
  supportsPersistence: false,
  supportsHydration: false,
  isPrimaryRenderer: false,
  noTimeout: -1,
  supportsMicrotasks: true,
  warnsIfNotActing: false,

  createInstance(type, props) {
    if (type === "deck-button" && isDeckButtonProps(props)) {
      return {
        type: "deck-button",
        accent: props.accent,
        background: props.background,
        keyIndex: props.keyIndex,
        detailLines: props.detailLines,
        displayValue: props.displayValue,
        fit: props.fit,
        full_surface: props.full_surface,
        label: props.label,
        icon: props.icon,
        progress: props.progress,
        style_id: props.style_id,
        subtitle: props.subtitle,
        toggle_mode: props.toggle_mode,
        variant: props.variant,
        wrapper: props.wrapper,
        wrapper_id: props.wrapper_id,
        children: [],
      }
    }

    if (type === "deck-text" && isDeckTextProps(props)) {
      return {
        type: "deck-text",
        background: props.background,
        fit: props.fit,
        keyIndex: props.keyIndex,
        text: props.text,
        children: [],
      }
    }

    if (type === "deck-surface" && isDeckSurfaceProps(props)) {
      return {
        type: "deck-surface",
        children: props.buttons.map((button) => ({
          type: "deck-button",
          accent: button.accent,
          background: button.background ?? props.background,
          detailLines: button.detailLines,
          displayValue: button.displayValue,
          fit: button.fit,
          full_surface: button.full_surface,
          icon: button.icon,
          keyIndex: button.keyIndex,
          label: button.label,
          progress: button.progress,
          style_id: button.style_id,
          subtitle: button.subtitle,
          toggle_mode: button.toggle_mode,
          variant: button.variant,
          wrapper: button.wrapper,
          wrapper_id: button.wrapper_id,
          children: [],
        })),
      }
    }

    throw new Error(`Unsupported render node '${type}'`)
  },
  createTextInstance() {
    throw new Error("Text nodes are not supported; use <deck-text text=... />")
  },
  appendInitialChild(parent, child) {
    appendChild(parent, child)
  },
  finalizeInitialChildren() {
    return false
  },
  shouldSetTextContent() {
    return false
  },
  getRootHostContext() {
    return ROOT_HOST_CONTEXT
  },
  getChildHostContext() {
    return ROOT_HOST_CONTEXT
  },
  getPublicInstance(instance) {
    return instance
  },
  prepareForCommit() {
    return null
  },
  resetAfterCommit() {},
  preparePortalMount() {},
  scheduleTimeout: setTimeout,
  cancelTimeout: clearTimeout,
  scheduleMicrotask(fn) {
    queueMicrotask(fn)
  },
  getInstanceFromNode() {
    return null
  },
  beforeActiveInstanceBlur() {},
  afterActiveInstanceBlur() {},
  prepareScopeUpdate() {},
  getInstanceFromScope() {
    return null
  },
  detachDeletedInstance() {},
  appendChild(parent, child) {
    appendChild(parent, child)
  },
  appendChildToContainer(container, child) {
    appendChild(container, child)
  },
  removeChild(parent, child) {
    removeChild(parent, child)
  },
  removeChildFromContainer(container, child) {
    removeChild(container, child)
  },
  insertBefore(parent, child, beforeChild) {
    removeChild(parent, child)
    const index = parent.children.indexOf(beforeChild as RenderInstance)
    parent.children.splice(index >= 0 ? index : parent.children.length, 0, child)
  },
  insertInContainerBefore(container, child, beforeChild) {
    removeChild(container, child)
    const index = container.children.indexOf(beforeChild as RenderInstance)
    container.children.splice(index >= 0 ? index : container.children.length, 0, child)
  },
  commitUpdate(instance, _type, _oldProps, newProps) {
    if (instance.type === "deck-button" && isDeckButtonProps(newProps)) {
      instance.keyIndex = newProps.keyIndex
      instance.accent = newProps.accent
      instance.background = newProps.background
      instance.detailLines = newProps.detailLines
      instance.displayValue = newProps.displayValue
      instance.fit = newProps.fit
      instance.full_surface = newProps.full_surface
      instance.label = newProps.label
      instance.icon = newProps.icon
      instance.progress = newProps.progress
      instance.style_id = newProps.style_id
      instance.subtitle = newProps.subtitle
      instance.toggle_mode = newProps.toggle_mode
      instance.variant = newProps.variant
      instance.wrapper = newProps.wrapper
      instance.wrapper_id = newProps.wrapper_id
      return
    }

    if (instance.type === "deck-text" && isDeckTextProps(newProps)) {
      instance.keyIndex = newProps.keyIndex
      instance.background = newProps.background
      instance.fit = newProps.fit
      instance.text = newProps.text
      return
    }

    if (instance.type === "deck-surface" && isDeckSurfaceProps(newProps)) {
      instance.children = newProps.buttons.map((button) => ({
          type: "deck-button",
          accent: button.accent,
          background: button.background ?? newProps.background,
        keyIndex: button.keyIndex,
        detailLines: button.detailLines,
        displayValue: button.displayValue,
        fit: button.fit,
        full_surface: button.full_surface,
        label: button.label,
        icon: button.icon,
        progress: button.progress,
        style_id: button.style_id,
        subtitle: button.subtitle,
        toggle_mode: button.toggle_mode,
        variant: button.variant,
        wrapper: button.wrapper,
        wrapper_id: button.wrapper_id,
        children: [],
      }))
    }
  },
  commitTextUpdate() {},
  resetTextContent() {},
  hideInstance() {},
  hideTextInstance() {},
  unhideInstance() {},
  unhideTextInstance() {},
  clearContainer(container) {
    container.children = []
  },
  maySuspendCommit() {
    return false
  },
  preloadInstance() {
    return true
  },
  startSuspendingCommit() {},
  suspendInstance() {},
  waitForCommitToBeReady() {
    return null
  },
  NotPendingTransition: "not-pending",
  HostTransitionContext: HOST_TRANSITION_CONTEXT,
  getCurrentUpdatePriority() {
    return DefaultEventPriority
  },
  setCurrentUpdatePriority() {},
  resolveUpdatePriority() {
    return DefaultEventPriority
  },
  resetFormInstance() {},
  requestPostPaintCallback(callback) {
    callback(Date.now())
  },
  trackSchedulerEvent() {},
  resolveEventType() {
    return null
  },
  resolveEventTimeStamp() {
    return Date.now()
  },
  shouldAttemptEagerTransition() {
    return false
  },
}

const reconciler = ReactReconciler(hostConfig)

function collectRenderDescriptions(nodes: readonly RenderNode[]): RenderDescription[] {
  const descriptions: RenderDescription[] = []

  for (const node of nodes) {
    if (node.type === "deck-button" && node.keyIndex !== undefined) {
      descriptions.push({
        keyIndex: node.keyIndex,
        ...(node.accent !== undefined ? { accent: node.accent } : {}),
        ...(node.background !== undefined ? { background: node.background } : {}),
        ...(node.detailLines !== undefined ? { detailLines: node.detailLines } : {}),
        ...(node.displayValue !== undefined ? { displayValue: node.displayValue } : {}),
        ...(node.fit !== undefined ? { fit: node.fit } : {}),
        ...(node.full_surface !== undefined ? { full_surface: node.full_surface } : {}),
        ...(node.icon !== undefined ? { icon: node.icon } : {}),
        ...(node.label !== undefined ? { label: node.label } : {}),
        ...(node.progress !== undefined ? { progress: node.progress } : {}),
        ...(node.style_id !== undefined ? { style_id: node.style_id } : {}),
        ...(node.subtitle !== undefined ? { subtitle: node.subtitle } : {}),
        ...(node.toggle_mode !== undefined ? { toggle_mode: node.toggle_mode } : {}),
        ...(node.variant !== undefined ? { variant: node.variant } : {}),
        ...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
        ...(node.wrapper_id !== undefined ? { wrapper_id: node.wrapper_id } : {}),
      })
    }

    if (node.type === "deck-text" && node.keyIndex !== undefined && node.text !== undefined) {
      descriptions.push({
        keyIndex: node.keyIndex,
        ...(node.background !== undefined ? { background: node.background } : {}),
        ...(node.fit !== undefined ? { fit: node.fit } : {}),
        label: node.text,
      })
    }

    descriptions.push(...collectRenderDescriptions(node.children))
  }

  return descriptions
}

export function createDeckTextElement(props: DeckTextProps): ReactElement<DeckTextProps> {
  return createElement("deck-text", props)
}

export function createDeckButtonElement(props: DeckButtonProps): ReactElement<DeckButtonProps> {
  return createElement("deck-button", props)
}

export function createDeckSurfaceElement(props: DeckSurfaceProps): ReactElement<DeckSurfaceProps> {
  return createElement("deck-surface", props)
}

// Legacy compatibility helper for the SVG fallback path.
export function createLegacyDisplayButtonModels(buttons: readonly ButtonInstance[]): DeckButtonProps[] {
  return buttons.map((button) => {
    return {
      ...(button.accent !== undefined ? { accent: button.accent } : {}),
      ...(button.background !== undefined ? { background: button.background } : {}),
      keyIndex: button.position,
      ...(typeof button.config.label === "string" ? { label: button.config.label } : {}),
      ...(typeof button.config.icon === "string" ? { icon: button.config.icon } : {}),
      variant: "default" as const,
      ...(button.style_id !== undefined ? { style_id: button.style_id } : {}),
      ...(button.wrapper_id !== undefined ? { wrapper_id: button.wrapper_id } : {}),
    }
  })
}

export function renderDeck(
  element: ReactElement<DeckTextProps | DeckButtonProps | DeckSurfaceProps>,
): RenderDescription[] {
  const container = createContainer()
  const root = reconciler.createContainer(
    container,
    0,
    null,
    false,
    null,
    "",
    console.error,
    console.error,
    console.error,
    () => {},
  )

  reconciler.updateContainerSync(element, root, null, null)
  reconciler.flushSyncWork()

  return collectRenderDescriptions(container.children)
}
