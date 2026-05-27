import type { ReactNode } from 'react'

import type { Theme } from '../config/theme.js'

import type { HostedButton } from './dom-host.js'
import { createHostedButtonElement } from './dom-host-button.js'

export function HostedButtonContent(props: {
  button: HostedButton | undefined
  theme: Theme | undefined
}): ReactNode {
  if (!props.button) {
    return null
  }

  if (props.button.html !== undefined) {
    return (
      <div
        className="contents"
        dangerouslySetInnerHTML={{ __html: props.button.html }}
      />
    )
  }

  return createHostedButtonElement({ ...props.button, theme: props.theme })
}
