import { createElement } from "react"

function LightButtonFrame(props) {
  return createElement(
    "div",
    {
      className: "bg-background border-accent",
      "data-sireno-button-frame": "true",
      style: {
        alignItems: "stretch",
        background: [
          "linear-gradient(180deg, color-mix(in oklab, var(--sireno-color-background) 96%, white 4%) 0%, color-mix(in oklab, var(--sireno-color-background) 92%, var(--sireno-color-primary) 8%) 100%)",
          "radial-gradient(circle at 82% 12%, color-mix(in oklab, var(--sireno-color-accent) 14%, transparent) 0%, transparent 36%)",
        ].join(","),
        border: "1.5px solid color-mix(in oklab, var(--sireno-color-accent) 56%, var(--sireno-color-background) 44%)",
        borderRadius: "18px",
        boxShadow: [
          "0 10px 24px color-mix(in oklab, var(--sireno-color-background) 70%, transparent)",
          "inset 0 1px 0 color-mix(in oklab, white 55%, transparent)",
        ].join(","),
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
          background: "linear-gradient(180deg, color-mix(in oklab, white 68%, var(--sireno-color-background) 32%) 0%, color-mix(in oklab, white 36%, var(--sireno-color-background) 64%) 100%)",
          borderRadius: "13px",
          display: "flex",
          flex: 1,
          justifyContent: "center",
          overflow: "hidden",
          padding: "8px",
          position: "relative",
        },
      },
      props.children,
    ),
  )
}

export const buttonFrame = LightButtonFrame

export default {
  buttonFrame,
}
