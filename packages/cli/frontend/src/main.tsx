import { StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { ErrorBoundary, useHmrResetKey } from "./components/ErrorBoundary";
import "./index.css";

const Root = (): ReactNode => {
  const resetKey = useHmrResetKey();
  return (
    <StrictMode>
      <ErrorBoundary resetKey={resetKey}>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
};

const container = document.getElementById("root");
if (container === null) throw new Error("#root not found");
createRoot(container).render(<Root />);
