import React from "react"

interface CalloutProps {
  type?: "note" | "warning" | "tip" | "info"
  title?: string
  children: React.ReactNode
}

const styles = {
  note: {
    bg: "bg-blue-500/10",
    border: "border-blue-500",
    title: "text-blue-400",
    icon: "ℹ️",
  },
  warning: {
    bg: "bg-yellow-500/10",
    border: "border-yellow-500",
    title: "text-yellow-400",
    icon: "⚠️",
  },
  tip: {
    bg: "bg-green-500/10",
    border: "border-green-500",
    title: "text-green-400",
    icon: "💡",
  },
  info: {
    bg: "bg-purple-500/10",
    border: "border-purple-500",
    title: "text-purple-400",
    icon: "ℹ️",
  },
}

export function Callout({ type = "note", title, children }: CalloutProps) {
  const style = styles[type]

  return (
    <div
      className={`${style.bg} border-l-4 ${style.border} p-4 rounded-r my-4`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{style.icon}</span>
        <span className={`font-semibold ${style.title}`}>
          {title || type.charAt(0).toUpperCase() + type.slice(1)}
        </span>
      </div>
      <div className="text-gray-300">{children}</div>
    </div>
  )
}
