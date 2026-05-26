import { Fragment, createContext, createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import Reconciler from "react-reconciler"
import { ConcurrentRoot, DefaultEventPriority } from "react-reconciler/constants"

import type { ReactElement, ReactNode } from "react"

import { ButtonSurface } from "../addon/api.js"
import type { ThemeFrameState } from "../config/theme.js"
import type { Theme } from "../config/theme.js"
import { buttonFrame as defaultButtonFrame } from "./button-frame.js"
import { resolveDeckLayout } from "./browser-renderer.js"
import { STREAM_DECK_KEY_PRESET, type RenderPreset } from "./render-preset.js"
import { getThemeUtilityStylesheet, renderThemeCssVariables } from "./theme-utilities.js"

export interface HostedButton {
  content: ReactElement
  frame_state?: ThemeFrameState
  full_surface?: boolean
  keyIndex: number
  sample_interval_ms?: number
  theme?: Theme
}

export interface DomHostRenderOptions {
  background?: string
  keyCount: number
  preset?: RenderPreset
  theme?: Theme
}

interface MountedHostContainer {
  children: MountedHostNode[]
}

interface MountedHostElementNode {
  children: MountedHostNode[]
  hidden: boolean
  props: Record<string, unknown>
  type: string
}

interface MountedHostTextNode {
  hidden: boolean
  text: string
}

type MountedHostNode = MountedHostElementNode | MountedHostTextNode

export interface MountedDomHost {
  render(node: ReactElement): void
  toHtml(): string
  unmount(): void
}

type MountedHostContext = {}

const EMPTY_HOST_CONTEXT: MountedHostContext = Object.freeze({})
const HOST_TRANSITION_CONTEXT = createContext<null>(null)

let currentUpdatePriority = DefaultEventPriority

function createMountedHostElementNode(type: string, props: Record<string, unknown>): MountedHostElementNode {
  return {
    children: [],
    hidden: false,
    props: omitChildrenProp(props),
    type,
  }
}

function createMountedHostTextNode(text: string): MountedHostTextNode {
  return {
    hidden: false,
    text,
  }
}

function omitChildrenProp(props: Record<string, unknown>): Record<string, unknown> {
  const { children: _children, ...rest } = props

  return rest
}

function appendMountedHostChild(parent: { children: MountedHostNode[] }, child: MountedHostNode): void {
  removeMountedHostChild(parent, child)
  parent.children.push(child)
}

function insertMountedHostChild(
  parent: { children: MountedHostNode[] },
  child: MountedHostNode,
  beforeChild: MountedHostNode,
): void {
  removeMountedHostChild(parent, child)

  const beforeIndex = parent.children.indexOf(beforeChild)

  if (beforeIndex === -1) {
    parent.children.push(child)
    return
  }

  parent.children.splice(beforeIndex, 0, child)
}

function removeMountedHostChild(parent: { children: MountedHostNode[] }, child: MountedHostNode): void {
  const childIndex = parent.children.indexOf(child)

  if (childIndex !== -1) {
    parent.children.splice(childIndex, 1)
  }
}

function mountedHostNodeToReactNode(node: MountedHostNode): ReactNode {
  if (node.hidden) {
    return null
  }

  if ("text" in node) {
    return node.text
  }

  return createElement(
    node.type,
    node.props,
    ...node.children.map((child) => mountedHostNodeToReactNode(child)),
  )
}

const mountedHostReconciler = Reconciler<string, Record<string, unknown>, MountedHostContainer, MountedHostElementNode, MountedHostTextNode, never, never, never, MountedHostNode, MountedHostContext, never, ReturnType<typeof setTimeout>, -1, null>({
  HostTransitionContext: HOST_TRANSITION_CONTEXT,
  NotPendingTransition: null,
  afterActiveInstanceBlur() {},
  appendChild: appendMountedHostChild,
  appendChildToContainer: appendMountedHostChild,
  appendInitialChild: appendMountedHostChild,
  beforeActiveInstanceBlur() {},
  cancelTimeout: clearTimeout,
  clearContainer(container) {
    container.children.length = 0
  },
  commitMount() {},
  commitTextUpdate(textInstance, _oldText, newText) {
    textInstance.text = newText
  },
  commitUpdate(instance, _type, _oldProps, newProps) {
    instance.props = omitChildrenProp(newProps)
  },
  createInstance(type, props) {
    return createMountedHostElementNode(type, props)
  },
  createTextInstance(text) {
    return createMountedHostTextNode(text)
  },
  detachDeletedInstance() {},
  finalizeInitialChildren() {
    return false
  },
  getChildHostContext() {
    return EMPTY_HOST_CONTEXT
  },
  getCurrentUpdatePriority() {
    return currentUpdatePriority
  },
  getInstanceFromNode() {
    return null
  },
  getInstanceFromScope() {
    return null
  },
  getPublicInstance(instance) {
    return instance
  },
  getRootHostContext() {
    return EMPTY_HOST_CONTEXT
  },
  hideInstance(instance) {
    instance.hidden = true
  },
  hideTextInstance(textInstance) {
    textInstance.hidden = true
  },
  insertBefore: insertMountedHostChild,
  insertInContainerBefore: insertMountedHostChild,
  isPrimaryRenderer: false,
  maySuspendCommit() {
    return false
  },
  noTimeout: -1,
  prepareForCommit() {
    return null
  },
  preparePortalMount() {},
  prepareScopeUpdate() {},
  preloadInstance() {
    return true
  },
  removeChild: removeMountedHostChild,
  removeChildFromContainer: removeMountedHostChild,
  requestPostPaintCallback(callback) {
    setTimeout(() => callback(Date.now()), 0)
  },
  resetAfterCommit() {},
  resetFormInstance() {},
  resetTextContent(instance) {
    instance.children.length = 0
  },
  resolveEventTimeStamp() {
    return Date.now()
  },
  resolveEventType() {
    return null
  },
  resolveUpdatePriority() {
    return currentUpdatePriority
  },
  scheduleMicrotask: queueMicrotask,
  scheduleTimeout: setTimeout,
  setCurrentUpdatePriority(newPriority) {
    currentUpdatePriority = newPriority
  },
  shouldAttemptEagerTransition() {
    return false
  },
  shouldSetTextContent() {
    return false
  },
  startSuspendingCommit() {},
  supportsHydration: false,
  supportsMicrotasks: true,
  supportsMutation: true,
  supportsPersistence: false,
  suspendInstance() {},
  trackSchedulerEvent() {},
  unhideInstance(instance) {
    instance.hidden = false
  },
  unhideTextInstance(textInstance) {
    textInstance.hidden = false
  },
  waitForCommitToBeReady() {
    return null
  },
  warnsIfNotActing: false,
})

export function renderReactNodeToHtml(node: ReactElement): string {
  return renderToStaticMarkup(node)
}

export function createMountedDomHost(): MountedDomHost {
  const container: MountedHostContainer = { children: [] }
  const root = mountedHostReconciler.createContainer(
    container,
    ConcurrentRoot,
    null,
    false,
    null,
    "sireno-dom-host",
    (error) => {
      throw error
    },
    (error) => {
      throw error
    },
    (error) => {
      throw error
    },
    () => {},
  )

  return {
    render(node) {
      mountedHostReconciler.updateContainerSync(node, root, null, null)
      mountedHostReconciler.flushSyncWork()
    },
    toHtml() {
      return renderToStaticMarkup(
        createElement(
          Fragment,
          null,
          ...container.children.map((child) => mountedHostNodeToReactNode(child)),
        ),
      )
    },
    unmount() {
      mountedHostReconciler.updateContainerSync(null, root, null, null)
      mountedHostReconciler.flushSyncWork()
    },
  }
}

export function createHostedButtonElement(button: HostedButton): ReactElement {
  const surface = button.content.type === ButtonSurface
    ? button.content
    : createElement(ButtonSurface, {
        ...(button.full_surface !== undefined ? { full_surface: button.full_surface } : {}),
        ...(button.sample_interval_ms !== undefined ? { sample_interval_ms: button.sample_interval_ms } : {}),
      }, button.content)

  if (button.full_surface) {
    return surface
  }

  const frame = button.theme?.buttonFrame ?? defaultButtonFrame

  return createElement(frame, { state: button.frame_state ?? "idle" }, surface)
}

export function renderDomDeck(buttons: readonly HostedButton[], options: DomHostRenderOptions): string {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const background = options.background ?? preset.background
  const themeVariables = options.theme ? renderThemeCssVariables(options.theme) : ""
  const themeStylesheet = getThemeUtilityStylesheet()
  const themeAssetStylesheet = options.theme?.stylesheets.join("\n") ?? ""
  const buttonsByKey = new Map(buttons.map((button) => [button.keyIndex, button]))
  const slots = Array.from({ length: options.keyCount }, (_, keyIndex) => {
    const button = buttonsByKey.get(keyIndex)
    const content = button ? renderReactNodeToHtml(createHostedButtonElement({ ...button, theme: options.theme })) : ""

    return `<div data-sireno-key="${keyIndex}" style="align-items:center;background:#05070a;box-sizing:border-box;display:flex;height:${preset.keyHeight}px;justify-content:center;overflow:hidden;width:${preset.keyWidth}px;">${content}</div>`
  }).join("")

  return [
    "<!doctype html>",
    `<html><head><style data-sireno-theme-utilities="true">${themeStylesheet}</style><style data-sireno-theme-assets="true">${themeAssetStylesheet}</style></head><body style="margin:0;background:${background};">`,
    `<div id="deck-root" style="${themeVariables}background:${background};display:grid;grid-template-columns:repeat(${layout.columns}, ${preset.keyWidth}px);grid-template-rows:repeat(${layout.rows}, ${preset.keyHeight}px);height:${layout.rows * preset.keyHeight}px;width:${layout.columns * preset.keyWidth}px;">`,
    slots,
    "</div>",
    "</body></html>",
  ].join("")
}
