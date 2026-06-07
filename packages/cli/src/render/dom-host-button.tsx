import { createElement, type ReactElement } from 'react'

import { ButtonSurface } from '@/addon/api'
import { buttonFrame as defaultButtonFrame } from '@/themes/default/index'
import {
  DomThemeUiPresentationProvider,
  MountedThemeUiPresentationProvider,
} from '@/ui/theme-presentation'

import type { HostedButton } from './dom-host'

function createHostedButtonElementWithProvider(
  button: HostedButton,
  provider: typeof DomThemeUiPresentationProvider,
): ReactElement {
  const surface =
    button.content.type === ButtonSurface
      ? button.content
      : createElement(
          ButtonSurface,
          {
            ...(button.full !== undefined ? { full: button.full } : {}),
            ...(button.sample_interval_ms !== undefined
              ? { sample_interval_ms: button.sample_interval_ms }
              : {}),
          },
          button.content,
        )

  const frame = button.theme?.buttonFrame ?? defaultButtonFrame
  const themedSurface = createElement(
    provider,
    { presentation: button.theme?.ui },
    surface,
  )

  if (button.full) {
    return themedSurface
  }

  return createElement(
    frame,
    { state: button.frame_state ?? 'idle' },
    themedSurface,
  )
}

export function createHostedButtonElement(button: HostedButton): ReactElement {
  return createHostedButtonElementWithProvider(
    button,
    DomThemeUiPresentationProvider,
  )
}

export function createMountedHostedButtonElement(
  button: HostedButton,
): ReactElement {
  return createHostedButtonElementWithProvider(
    button,
    MountedThemeUiPresentationProvider,
  )
}
