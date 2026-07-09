import { StrictMode, type ReactNode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import { App } from "./App"
import { ErrorBoundary, useHmrResetKey } from "./components/ErrorBoundary"
import "./index.css"

const Root = (): ReactNode => {
  const resetKey = useHmrResetKey()
  return (
    <StrictMode>
      <ErrorBoundary resetKey={resetKey}>
        <BrowserRouter>
          <Routes>
            <Route path="/decks/:deckId" element={<App />} />
            <Route path="*" element={<Navigate to="/decks/main" replace />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </StrictMode>
  )
}

const container = document.getElementById("root")
if (container === null) throw new Error("#root not found")
createRoot(container).render(<Root />)
