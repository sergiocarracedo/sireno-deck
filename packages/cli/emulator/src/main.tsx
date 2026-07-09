import React from "react"
import ReactDOM from "react-dom/client"

import { Shell } from "./Shell"

import "./index.css"

const ENV_WS_URL = (import.meta.env.VITE_WS_URL ??
  "ws://127.0.0.1:52937") as string
const ENV_FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL ??
  "http://127.0.0.1:5173") as string

const root = document.getElementById("root")
if (root === null) {
  throw new Error("Could not find #root element")
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Shell
      wsUrl={ENV_WS_URL}
      frontendUrl={ENV_FRONTEND_URL}
      initialDeviceModel="mk2"
    />
  </React.StrictMode>,
)
