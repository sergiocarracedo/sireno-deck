import { Component, type ErrorInfo, type ReactNode } from "react";
import { Icon } from "@sireno-deck/cli";

interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly onError?: (error: Error, info: ErrorInfo) => void;
  readonly resetKey?: string | number;
}

interface ErrorBoundaryState {
  readonly error: Error | null;
  readonly info: ErrorInfo | null;
}

/**
 * Catches render errors in the deck tree and displays a fallback surface on
 * each button position. Without this, a single broken addon's React render
 * unmounts the whole tree and the emulator continues taking screenshots of
 * a blank page with no log signal.
 *
 * Self-recovers via Vite's `import.meta.hot` API when present — once the
 * developer fixes the broken module, HMR updates the parent and the boundary
 * resets itself without a full page reload.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ error, info });
    this.props.onError?.(error, info);
    if (typeof console !== "undefined") {
      console.error("[ErrorBoundary] React render error:", error, info.componentStack);
    }
  }

  override componentDidUpdate(prev: ErrorBoundaryProps): void {
    if (this.state.error !== null && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null });
    }
  }

  override render(): ReactNode {
    const { error } = this.state;
    if (error === null) return this.props.children;

    return (
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-1 p-1 text-center"
        data-sireno-error-boundary="true"
      >
        <Icon name="alert-circle" size={18} tone="danger" />
        <span className="truncate font-mono text-[9px] uppercase opacity-70">
          HMR error
        </span>
        <span className="line-clamp-2 font-mono text-[8px] opacity-50">
          {String(error.message)}
        </span>
      </div>
    );
  }
}

/**
 * HMR-aware hook that swaps a `resetKey` whenever Vite invalidates a module,
 * forcing any mounted `ErrorBoundary` to re-render fresh instead of staying
 * in the error state.
 *
 * Returns a stable `resetKey` value that updates when the importer is
 * re-evaluated.
 */
export const useHmrResetKey = (): string => {
  if (typeof import.meta === "undefined") return "stable";
  const hot = (import.meta as { hot?: { data?: Record<string, unknown> } }).hot;
  if (hot === undefined) return "stable";
  const data = (hot.data ?? (hot.data = {})) as Record<string, unknown>;
  const existing = data["resetKey"];
  if (typeof existing === "string") return existing;
  const generated: string = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  data["resetKey"] = generated;
  return generated;
};
