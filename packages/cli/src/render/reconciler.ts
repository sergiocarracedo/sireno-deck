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
  background?: string
  detailLines?: string[]
  type: "deck-button" | "deck-surface" | "deck-text"
  displayValue?: string
  fit?: "shrink" | "wrap"
  keyIndex?: number
  label?: string
  icon?: string
  progress?: number
  subtitle?: string
  text?: string
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
  wrapper?: "shared"
  children: RenderNode[]
}

export interface RenderDescription {
  background?: string
  detailLines?: string[]
  displayValue?: string
  fit?: "shrink" | "wrap"
  keyIndex: number
  label?: string
  icon?: string
  progress?: number
  subtitle?: string
  variant?: "analog-clock" | "calendar-sheet" | "default" | "emoji" | "fan" | "media" | "metric" | "toggle"
  wrapper?: "shared"
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
        background: props.background,
        keyIndex: props.keyIndex,
        detailLines: props.detailLines,
        displayValue: props.displayValue,
        fit: props.fit,
        label: props.label,
        icon: props.icon,
        progress: props.progress,
        subtitle: props.subtitle,
        variant: props.variant,
        wrapper: props.wrapper,
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
          background: button.background ?? props.background,
          detailLines: button.detailLines,
          displayValue: button.displayValue,
          fit: button.fit,
          icon: button.icon,
          keyIndex: button.keyIndex,
          label: button.label,
          progress: button.progress,
          subtitle: button.subtitle,
          variant: button.variant,
          wrapper: button.wrapper,
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
      instance.background = newProps.background
      instance.detailLines = newProps.detailLines
      instance.displayValue = newProps.displayValue
      instance.fit = newProps.fit
      instance.label = newProps.label
      instance.icon = newProps.icon
      instance.progress = newProps.progress
      instance.subtitle = newProps.subtitle
      instance.variant = newProps.variant
      instance.wrapper = newProps.wrapper
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
        background: button.background ?? newProps.background,
        keyIndex: button.keyIndex,
        detailLines: button.detailLines,
        displayValue: button.displayValue,
        fit: button.fit,
        label: button.label,
        icon: button.icon,
        progress: button.progress,
        subtitle: button.subtitle,
        variant: button.variant,
        wrapper: button.wrapper,
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
        ...(node.background !== undefined ? { background: node.background } : {}),
        ...(node.detailLines !== undefined ? { detailLines: node.detailLines } : {}),
        ...(node.displayValue !== undefined ? { displayValue: node.displayValue } : {}),
        ...(node.fit !== undefined ? { fit: node.fit } : {}),
        ...(node.icon !== undefined ? { icon: node.icon } : {}),
        ...(node.label !== undefined ? { label: node.label } : {}),
        ...(node.progress !== undefined ? { progress: node.progress } : {}),
        ...(node.subtitle !== undefined ? { subtitle: node.subtitle } : {}),
        ...(node.variant !== undefined ? { variant: node.variant } : {}),
        ...(node.wrapper !== undefined ? { wrapper: node.wrapper } : {}),
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

export function createDisplayButtonModels(buttons: readonly ButtonInstance[]): DeckButtonProps[] {
  return buttons.map((button) => {
    return {
      ...(button.background !== undefined ? { background: button.background } : {}),
      keyIndex: button.position,
      ...(button.label !== undefined ? { label: button.label } : {}),
      ...(button.icon !== undefined ? { icon: button.icon } : {}),
      variant: "default" as const,
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
