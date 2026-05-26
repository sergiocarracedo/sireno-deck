import { createElement } from 'react'

const addon = {
  apiVersion: 1,
  name: 'phase-23-local-raw-addon',
  buttons: [
    {
      type: 'phase-23-local-raw-button',
      configSchema: {
        safeParse(value: unknown) {
          return { success: true as const, data: value }
        },
      },
      createInstance({}) {
        return {
          render() {
            return createElement('p', null, 'Test')
          },
        }
      },
    },
  ],
}

export default addon
