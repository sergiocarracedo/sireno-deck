import { createElement } from "react"

export function ButtonFrame(props) {
  return createElement(
    "div",
    {
      className: "bg-background border-accent",
      "data-sireno-button-frame": "true",
      style: {
        alignItems: "stretch",
        background: [
          "radial-gradient(circle at 18% 18%, color-mix(in oklab, var(--sireno-color-primary) 20%, transparent) 0%, transparent 44%)",
          "linear-gradient(145deg, color-mix(in oklab, var(--sireno-color-background) 88%, var(--sireno-color-foreground) 12%) 0%, color-mix(in oklab, var(--sireno-color-background) 94%, var(--sireno-color-primary) 6%) 100%)",
        ].join(","),
        border: "1.5px solid color-mix(in oklab, var(--sireno-color-accent) 68%, var(--sireno-color-background) 32%)",
        borderRadius: "18px",
        boxShadow: [
          "0 0 0 1px color-mix(in oklab, var(--sireno-color-foreground) 10%, transparent)",
          "0 8px 20px color-mix(in oklab, var(--sireno-color-background) 72%, transparent)",
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
        className: "bg-background",
        style: {
          alignItems: "center",
          background: "linear-gradient(180deg, color-mix(in oklab, var(--sireno-color-background) 82%, var(--sireno-color-foreground) 18%) 0%, color-mix(in oklab, var(--sireno-color-background) 90%, var(--sireno-color-primary) 10%) 100%)",
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
