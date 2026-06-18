import type { ReactElement } from 'react'

import type { Theme } from '@/config/theme'
import { cn } from '@/themes/utils/cn'

import { HostedButtonContent } from './hosted-button-content'
import type { HostedButton } from './index'
import type { RenderPreset } from '../render-preset'

export interface DeckKeySlotProps {
  button?: HostedButton
  emulatorMode: boolean
  keyIndex: number
  preset: RenderPreset
  theme?: Theme
}

export function DeckKeySlot(props: DeckKeySlotProps): ReactElement {
  const hasButton = props.button !== undefined

  const emulatorModeStyles = {
    background: hasButton
      ? 'radial-gradient(circle at 20% 18%, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 48%), linear-gradient(180deg, rgba(15,23,32,0.92) 0%, rgba(7,10,14,0.98) 100%)'
      : 'radial-gradient(circle at 50% 20%, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 38%), linear-gradient(180deg, rgba(7,10,14,0.98) 0%, rgba(3,5,8,1) 100%)',
    borderRadius: '18px',
    boxShadow: hasButton
      ? 'inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -2px 6px rgba(0,0,0,0.4), 0 8px 18px rgba(0,0,0,0.24)'
      : 'inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -3px 8px rgba(0,0,0,0.46)',
  }

  const hardwareStyles = {
    background: 'transparent',
    borderRadius: '0',
    boxShadow: 'none',
  }
  return (
    <div
      data-sireno-empty-key={hasButton ? 'false' : 'true'}
      data-sireno-key={props.keyIndex}
      data-sireno-key-well="true"
      className={cn(
        'flex items-stretch justify-center relative overflow-hidden',
      )}
      style={{
        ...(props.emulatorMode ? emulatorModeStyles : hardwareStyles),
        alignItems: 'center',
        boxSizing: 'border-box',
        height: `${props.preset.keyHeight}px`,
        justifyContent: 'center',
        width: `${props.preset.keyWidth}px`,
      }}
    >
      {props.emulatorMode ? (
        <div
          aria-hidden="true"
          className={cn('absolute inset-0 pointer-events-none')}
          style={{
            background:
              'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 42%)',
          }}
        />
      ) : null}
      <HostedButtonContent button={props.button} theme={props.theme} />
    </div>
  )
}