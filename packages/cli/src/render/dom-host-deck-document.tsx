import type { ReactElement } from 'react'

import type { Theme } from '@/config/theme'
import { cn } from '@/themes/utils/cn'

import type { BrowserRendererLayout } from './browser-renderer.js'
import { DeckKeySlot } from './dom-host-deck-key-slot.js'
import type { HostedButton } from './dom-host.js'
import type { RenderPreset } from './render-preset.js'
import { getShrinkFitBrowserScript } from './shrink-fit-browser-script.js'
import { getThemeCssVariables } from './theme-utilities.js'

function getThemeVariableStyle(theme?: Theme): Record<string, string> {
  if (!theme) {
    return {}
  }

  return Object.fromEntries(
    getThemeCssVariables(theme).map((entry) => [entry.name, entry.value]),
  )
}

export interface DeckDocumentProps {
  background: string
  frame: string
  buttons: readonly HostedButton[]
  emulatorMode: boolean
  inlineWarning?: {
    detail: string
    title: string
  }
  keyCount: number
  layout: BrowserRendererLayout
  preset: RenderPreset
  runtimeStylesheet: string
  tailwindStylesheet: string
  theme?: Theme
  themeAssetStylesheet: string
}

export function DeckDocument(props: DeckDocumentProps): ReactElement {
  const buttonsByKey = new Map(
    props.buttons.map((button) => [button.keyIndex, button]),
  )
  const themeVariableStyle = getThemeVariableStyle(props.theme)

  const gap = props.emulatorMode ? props.preset.gap : 0

  return (
    <html>
      <head>
        <style data-sireno-tailwind="true">{props.tailwindStylesheet}</style>
        <style data-sireno-runtime="true">{props.runtimeStylesheet}</style>
        <style data-sireno-theme-assets="true">
          {props.themeAssetStylesheet}
        </style>
        <script
          data-sireno-shrink-fit-script="true"
          dangerouslySetInnerHTML={{ __html: getShrinkFitBrowserScript() }}
        />
      </head>
      <body
        data-sireno-browser-document="true"
        style={{
          background: props.background,
          fontFamily: 'var(--sireno-font-main-family)',
          fontWeight: 'var(--sireno-font-main-weight)',
          letterSpacing: 'var(--sireno-font-main-tracking)',
          margin: 0,
        }}
      >
        <div
          data-sireno-browser-shell="true"
          id="deck-root"
          className={cn('grid isolate overflow-hidden')}
          style={{
            ...themeVariableStyle,
            gap: `${gap}px`,
            background: props.emulatorMode
              ? `radial-gradient(circle at top, rgba(255,255,255,0.09) 0%, rgba(255,255,255,0) 34%), linear-gradient(180deg, color-mix(in srgb, ${props.background} 82%, black) 0%, ${props.background} 100%)`
              : props.background,
            boxShadow: props.emulatorMode
              ? 'inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -14px 24px rgba(0,0,0,0.2)'
              : 'none',
            color: 'var(--sireno-color-foreground)',
            gridTemplateColumns: `repeat(${props.layout.columns}, ${props.preset.keyWidth}px)`,
            gridTemplateRows: `repeat(${props.layout.rows}, ${props.preset.keyHeight}px)`,
            height: `${props.layout.rows * props.preset.keyHeight + (props.layout.rows - 1) * gap}px`,
            width: `${props.layout.columns * props.preset.keyWidth + (props.layout.columns - 1) * gap}px`,
          }}
        >
          {props.inlineWarning ? (
            <div
              data-sireno-inline-warning="true"
              className={cn('flex flex-col items-start gap-1')}
              style={{
                background:
                  'linear-gradient(180deg, rgba(245,158,11,0.22) 0%, rgba(161,98,7,0.12) 100%)',
                borderBottom: '1px solid rgba(245,158,11,0.35)',
                color: 'var(--sireno-color-foreground)',
                gridColumn: `1 / span ${props.layout.columns}`,
                padding: '10px 12px',
              }}
            >
              <strong
                style={{
                  fontSize: '11px',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
              >
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
