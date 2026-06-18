import { Fragment, createContext, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Reconciler from 'react-reconciler'
import {
  ConcurrentRoot,
  DefaultEventPriority,
} from 'react-reconciler/constants'

import type { ReactElement, ReactNode } from 'react'

import type { Theme, ThemeFrameState } from '@/config/theme'
import { resolveDeckLayout } from '../browser-renderer'
import {
  createHostedButtonElement,
  createMountedHostedButtonElement,
} from './button'
import { DeckDocument } from './deck-document'
import { STREAM_DECK_KEY_PRESET, type RenderPreset } from '../render-preset'
import {
  getSirenoRuntimeStylesheet,
  getTailwindBrowserStylesheet,
} from '../theme-utilities'

export interface HostedButton {
  content: ReactElement
  frame_state?: ThemeFrameState
  full?: boolean
  html?: string
  keyIndex: number
  sample_interval_ms?: number
  theme?: Theme
}

export interface DomHostRenderOptions {
  background?: string
  emulatorMode?: boolean
  inlineWarning?: {
    detail: string
    title: string
  }
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
  reloadStylesheet(): void
  toHtml(): string
  unmount(): void
}

export interface MountedHostedButtonSnapshot {
  html: string
  keyIndex: number
}

type MountedHostContext = {}

const EMPTY_HOST_CONTEXT: MountedHostContext = Object.freeze({})
const HOST_TRANSITION_CONTEXT = createContext<null>(null)
const MOUNTED_BUTTON_SLOT_TAG = 'sireno-mounted-slot'

let currentUpdatePriority = DefaultEventPriority

function createMountedHostElementNode(
  type: string,
  props: Record<string, unknown>,
): MountedHostElementNode {
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

function omitChildrenProp(
  props: Record<string, unknown>,
): Record<string, unknown> {
  const { children: _children, ...rest } = props

  return rest
}

function appendMountedHostChild(
  parent: { children: MountedHostNode[] },
  child: MountedHostNode,
): void {
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

function removeMountedHostChild(
  parent: { children: MountedHostNode[] },
  child: MountedHostNode,
): void {
  const childIndex = parent.children.indexOf(child)

  if (childIndex !== -1) {
    parent.children.splice(childIndex, 1)
  }
}

function mountedHostNodeToReactNode(node: MountedHostNode): ReactNode {
  if (node.hidden) {
    return null
  }

  if ('text' in node) {
    return node.text
  }

  return createElement(
    node.type,
    node.props,
    ...node.children.map((child) => mountedHostNodeToReactNode(child)),
  )
}

const mountedHostReconciler = Reconciler<
  string,
  Record<string, unknown>,
  MountedHostContainer,
  MountedHostElementNode,
  MountedHostTextNode,
  never,
  never,
  never,
  MountedHostNode,
  MountedHostContext,
  never,
  ReturnType<typeof setTimeout>,
  -1,
  null
>({
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
    'sireno-dom-host',
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
          ...container.children.map((child) =>
            mountedHostNodeToReactNode(child),
          ),
        ),
      )
    },
    unmount() {
      mountedHostReconciler.updateContainerSync(null, root, null, null)
      mountedHostReconciler.flushSyncWork()
    },
    reloadStylesheet() {
    },
  }
}

export function renderMountedHostedButtons(
  host: MountedDomHost,
  buttons: readonly HostedButton[],
): MountedHostedButtonSnapshot[] {
  host.render(
    createElement(
      Fragment,
      null,
      ...buttons.map((button) =>
        createElement(
          MOUNTED_BUTTON_SLOT_TAG,
          {
            'data-sireno-mounted-key': button.keyIndex,
            key: button.keyIndex,
          },
          createMountedHostedButtonElement(button),
        ),
      ),
    ),
  )

  const snapshots: MountedHostedButtonSnapshot[] = []
  const html = host.toHtml()
  const slotPattern = new RegExp(
    `<${MOUNTED_BUTTON_SLOT_TAG} data-sireno-mounted-key="(\\d+)">([\\s\\S]*?)</${MOUNTED_BUTTON_SLOT_TAG}>`,
    'g',
  )

  for (const match of html.matchAll(slotPattern)) {
    const keyIndex = Number(match[1])
    if (Number.isNaN(keyIndex)) {
      continue
    }

    snapshots.push({
      html: match[2] ?? '',
      keyIndex,
    })
  }

  return snapshots
}

export function renderDomDeck(
  buttons: readonly HostedButton[],
  options: DomHostRenderOptions,
): string {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const background = options.background ?? preset.background
  const runtimeStylesheet = getSirenoRuntimeStylesheet()
  const tailwindStylesheet = getTailwindBrowserStylesheet()
  const themeAssetStylesheet = options.theme?.stylesheets.join('\n') ?? ''

  const html = renderToStaticMarkup(
    <DeckDocument
      background={background}
      buttons={buttons}
      emulatorMode={options.emulatorMode ?? false}
      inlineWarning={options.inlineWarning}
      keyCount={options.keyCount}
      layout={layout}
      preset={preset}
      runtimeStylesheet={runtimeStylesheet}
      tailwindStylesheet={tailwindStylesheet}
      theme={options.theme}
      themeAssetStylesheet={themeAssetStylesheet}
    />,
  )

  return `<!doctype html>${html}`
}

export { createHostedButtonElement }