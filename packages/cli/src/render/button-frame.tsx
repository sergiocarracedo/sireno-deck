import { createElement } from "react"

import type { ReactNode } from "react"

export interface ButtonFrameProps {
  children: ReactNode
}

export function ButtonFrame(props: ButtonFrameProps) {
  return createElement(
    "div",
    {
      "data-sireno-button-frame": "true",
      style: {
        alignItems: "stretch",
        background: "linear-gradient(135deg, #1e2935 0%, #17202b 100%)",
        border: "1.5px solid #314254",
        borderRadius: "18px",
        boxSizing: "border-box",
        display: "flex",
        height: "72px",
        padding: "4px",
        width: "72px",
      },
    },
    createElement(
      "div",
      {
        style: {
          alignItems: "center",
          background: "linear-gradient(135deg, #223140 0%, #19222d 100%)",
          borderRadius: "13px",
          display: "flex",
          flex: 1,
          justifyContent: "center",
          overflow: "hidden",
          padding: "8px",
        },
      },
      props.children,
    ),
  )
}

export const buttonFrame = ButtonFrame
