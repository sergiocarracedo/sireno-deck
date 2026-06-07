import type { ReactNode } from 'react'

import type { Theme } from '@/config/theme'

import { createHostedButtonElement } from './dom-host-button'
import type { HostedButton } from './dom-host'

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
