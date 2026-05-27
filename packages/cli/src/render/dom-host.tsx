import { Fragment, createContext, createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import Reconciler from 'react-reconciler'
import {
  ConcurrentRoot,
  DefaultEventPriority,
} from 'react-reconciler/constants'

import type { ReactElement, ReactNode } from 'react'

import { ButtonSurface } from '../addon/api.js'
import type { Theme, ThemeFrameState } from '../config/theme.js'
import { resolveDeckLayout } from './browser-renderer.js'
import { buttonFrame as defaultButtonFrame } from '../themes/default/index.js'
import { STREAM_DECK_KEY_PRESET, type RenderPreset } from './render-preset.js'
import {
  getThemeCssVariables,
  getThemeUtilityStylesheet,
  renderThemeCssVariables,
} from './theme-utilities.js'

export interface HostedButton {
  content: ReactElement
  frame_state?: ThemeFrameState
  full_surface?: boolean
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
          createHostedButtonElement(button),
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

export function createHostedButtonElement(button: HostedButton): ReactElement {
  const surface =
    button.content.type === ButtonSurface
      ? button.content
      : createElement(
          ButtonSurface,
          {
            ...(button.full_surface !== undefined
              ? { full_surface: button.full_surface }
              : {}),
            ...(button.sample_interval_ms !== undefined
              ? { sample_interval_ms: button.sample_interval_ms }
              : {}),
          },
          button.content,
        )

  if (button.full_surface) {
    return surface
  }

  const frame = button.theme?.buttonFrame ?? defaultButtonFrame

  return createElement(frame, { state: button.frame_state ?? 'idle' }, surface)
}

function getThemeVariableStyle(theme?: Theme): Record<string, string> {
  if (!theme) {
    return {}
  }

  return Object.fromEntries(
    getThemeCssVariables(theme).map((entry) => [entry.name, entry.value]),
  )
}

function renderHostedButtonContent(
  button: HostedButton | undefined,
  theme: Theme | undefined,
): ReactNode {
  if (!button) {
    return null
  }

  if (button.html !== undefined) {
    return (
      <div
        dangerouslySetInnerHTML={{ __html: button.html }}
        style={{ display: 'contents' }}
      />
    )
  }

  return createHostedButtonElement({ ...button, theme })
}

function DeckKeySlot(props: {
  button?: HostedButton
  emulatorMode: boolean
  keyIndex: number
  preset: RenderPreset
  theme?: Theme
}): ReactElement {
  const hasButton = props.button !== undefined

  return (
    <div
      data-sireno-empty-key={hasButton ? 'false' : 'true'}
      data-sireno-key={props.keyIndex}
      data-sireno-key-well="true"
      style={{
        alignItems: 'center',
        background: props.emulatorMode
          ? hasButton
            ? 'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 48%), linear-gradient(180deg, rgba(15,23,32,0.92) 0%, rgba(7,10,14,0.98) 100%)'
            : 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 38%), linear-gradient(180deg, rgba(7,10,14,0.98) 0%, rgba(3,5,8,1) 100%)'
          : 'transparent',
        borderRadius: props.emulatorMode ? '18px' : '0',
        boxShadow: props.emulatorMode
          ? hasButton
            ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 6px rgba(0,0,0,0.4), 0 8px 18px rgba(0,0,0,0.24)'
            : 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -3px 8px rgba(0,0,0,0.46)'
          : 'none',
        boxSizing: 'border-box',
        display: 'flex',
        height: `${props.preset.keyHeight}px`,
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
        width: `${props.preset.keyWidth}px`,
      }}
    >
      {props.emulatorMode ? (
        <div
          aria-hidden="true"
          style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 42%)',
            inset: 0,
            pointerEvents: 'none',
            position: 'absolute',
          }}
        />
      ) : null}
      {renderHostedButtonContent(props.button, props.theme)}
    </div>
  )
}

function DeckDocument(props: {
  background: string
  buttons: readonly HostedButton[]
  emulatorMode: boolean
  inlineWarning?: {
    detail: string
    title: string
  }
  keyCount: number
  layout: ReturnType<typeof resolveDeckLayout>
  preset: RenderPreset
  theme?: Theme
  themeAssetStylesheet: string
  themeStylesheet: string
}): ReactElement {
  const buttonsByKey = new Map(
    props.buttons.map((button) => [button.keyIndex, button]),
  )
  const themeVariableStyle = getThemeVariableStyle(props.theme)

  return (
    <html>
      <head>
        <style data-sireno-theme-utilities="true">{props.themeStylesheet}</style>
        <style data-sireno-theme-assets="true">{props.themeAssetStylesheet}</style>
      </head>
      <body
        data-sireno-browser-document="true"
        style={{
          background: props.background,
          margin: 0,
        }}
      >
        <div
          data-sireno-browser-shell="true"
          id="deck-root"
          style={{
            ...themeVariableStyle,
            background: props.emulatorMode
              ? `radial-gradient(circle at top, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 34%), linear-gradient(180deg, color-mix(in srgb, ${props.background} 82%, black) 0%, ${props.background} 100%)`
              : props.background,
            boxShadow: props.emulatorMode
              ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -14px 24px rgba(0,0,0,0.2)'
              : 'none',
            color: 'var(--sireno-color-foreground)',
            display: 'grid',
            gridTemplateColumns: `repeat(${props.layout.columns}, ${props.preset.keyWidth}px)`,
            gridTemplateRows: `repeat(${props.layout.rows}, ${props.preset.keyHeight}px)`,
            height: `${props.layout.rows * props.preset.keyHeight}px`,
            isolation: 'isolate',
            overflow: 'hidden',
            width: `${props.layout.columns * props.preset.keyWidth}px`,
          }}
        >
          {props.inlineWarning ? (
            <div
              data-sireno-inline-warning="true"
              style={{
                alignItems: 'flex-start',
                background: 'linear-gradient(180deg, rgba(245,158,11,0.22) 0%, rgba(161,98,7,0.12) 100%)',
                borderBottom: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--sireno-color-foreground)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                gridColumn: `1 / span ${props.layout.columns}`,
                padding: '10px 12px',
              }}
            >
              <strong style={{ fontSize: '11px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {props.inlineWarning.title}
              </strong>
              <span style={{ fontSize: '12px', lineHeight: 1.35 }}>
                {props.inlineWarning.detail}
              </span>
            </div>
          ) : null}
          {Array.from({ length: props.keyCount }, (_, keyIndex) => (
            <DeckKeySlot
              button={buttonsByKey.get(keyIndex)}
              emulatorMode={props.emulatorMode}
              key={keyIndex}
              keyIndex={keyIndex}
              preset={props.preset}
              theme={props.theme}
            />
          ))}
        </div>
      </body>
    </html>
  )
}

export function renderDomDeck(
  buttons: readonly HostedButton[],
  options: DomHostRenderOptions,
): string {
  const preset = options.preset ?? STREAM_DECK_KEY_PRESET
  const layout = resolveDeckLayout(options.keyCount)
  const background = options.background ?? preset.background
  const themeStylesheet = getThemeUtilityStylesheet()
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
      theme={options.theme}
      themeAssetStylesheet={themeAssetStylesheet}
      themeStylesheet={themeStylesheet}
    />,
  )

  return `<!doctype html>${html}`
}
