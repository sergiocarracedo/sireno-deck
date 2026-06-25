import { useContext, useState } from "react";
import { primitives as themePrimitives, activeTheme } from "virtual:sireno/themes/manifest";

import { ThemeContext, ThemeProvider, type ThemeContextValue } from "@/themes/index.ts";

export interface ButtonFrameProps {
  label?: string;
  buttonType: string;
  children?: React.ReactNode;
  onPress?: () => void;
  onDoublePress?: () => void;
  onHold?: () => void;
  onNavigate?: () => void;
  holdDurationMs?: number;
}

const HOLD_DURATION_MS = 500;

const resolveFallbackContext = (): ThemeContextValue | null => {
  if (!activeTheme) return null;
  return {
    name: activeTheme.name,
    cssPath: "",
    frontendPath: activeTheme.frontendPath,
    theme: {
      name: activeTheme.name,
      apiVersion: 3,
      source: { kind: "builtin", resolvedPath: activeTheme.frontendPath },
      cssPath: "",
      frontendPath: activeTheme.frontendPath,
    },
  };
};

export const ButtonFrame = (props: ButtonFrameProps) => {
  const fallback = resolveFallbackContext();
  if (fallback) {
    return (
      <ThemeProvider value={fallback}>
        <ButtonFrameInner {...props} />
      </ThemeProvider>
    );
  }
  return <ButtonFrameInner {...props} />;
};

interface ButtonFrameInnerProps extends ButtonFrameProps {
  holdDurationMs: number;
}

const ButtonFrameInner = ({
  label,
  buttonType,
  children,
  onPress,
  onDoublePress,
  onHold,
  onNavigate,
  holdDurationMs = HOLD_DURATION_MS,
}: ButtonFrameInnerProps) => {
  const provided = useContext(ThemeContext);
  const primitives = provided?.primitives ?? themePrimitives;
  const ThemeButtonFrame = primitives.ButtonFrame;
  const [pressed, setPressed] = useState(false);
  const [isTapping, setIsTapping] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);

  const trigger = (which: "tap" | "dbl-tap" | "hold") => {
    if (which === "tap") onPress?.();
    if (which === "dbl-tap") onDoublePress?.();
    if (which === "hold") onHold?.();
    if (which === "tap" && onNavigate) onNavigate();
  };

  const handlePointerDown = () => {
    setPressed(true);
    setIsHolding(true);
    setHoldProgress(0);
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.max(0, Math.min(1, elapsed / holdDurationMs));
      setHoldProgress(p);
      if (p < 1 && pressed) {
        requestAnimationFrame(tick);
      }
    };
    requestAnimationFrame(tick);
  };

  const handlePointerUp = () => {
    setPressed(false);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handlePointerLeave = () => {
    setPressed(false);
    setIsHolding(false);
    setHoldProgress(0);
  };

  const handleClick = () => {
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 160);
    trigger("tap");
  };

  const handleDoubleClick = () => {
    setIsTapping(true);
    setTimeout(() => setIsTapping(false), 160);
    trigger("dbl-tap");
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    trigger("hold");
  };

  if (!ThemeButtonFrame) {
    throw new Error(
      "ButtonFrame: active theme does not export a ButtonFrame primitive. Provide a ThemeProvider with a theme that exports primitives.ButtonFrame.",
    );
  }

  return (
    <ThemeButtonFrame
      pressed={pressed}
      isTapping={isTapping}
      isHolding={isHolding}
      holdProgress={holdProgress}
      buttonType={buttonType}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
    >
      {children ?? <span className="truncate font-mono text-xs uppercase">{label}</span>}
    </ThemeButtonFrame>
  );
};
