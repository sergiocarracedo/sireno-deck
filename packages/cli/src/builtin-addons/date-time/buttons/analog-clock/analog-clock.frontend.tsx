import type { AddonFrontendButton } from "@/addon/api";
import { useNow } from '../../shared/use-now'
const polar = (cx: number, cy: number, r: number, deg: number): { x: number; y: number } => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};
const INTERVAL_MS = 1000;
export const AnalogClockButtonFrontend: AddonFrontendButton = () => {
  const now = useNow(INTERVAL_MS);
  const h = now.getHours() % 12;
  const m = now.getMinutes();
  const s = now.getSeconds();
  const hourAngle = (h + m / 60) * 30;
  const minuteAngle = (m + s / 60) * 6;
  const secondAngle = s * 6;
  const hourEnd = polar(50, 50, 22, hourAngle);
  const minEnd = polar(50, 50, 32, minuteAngle);
  const secEnd = polar(50, 50, 36, secondAngle);
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30;
    const outer = polar(50, 50, 40, angle);
    const inner = polar(50, 50, i % 3 === 0 ? 34 : 37, angle);
    return (
      <line
        key={i}
        x1={outer.x}
        y1={outer.y}
        x2={inner.x}
        y2={inner.y}
        stroke="var(--color-muted)"
        strokeWidth={i % 3 === 0 ? 1.5 : 0.75}
      />
    );
  });
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <circle cx="50" cy="50" r="42" fill="none" stroke="var(--color-muted)" strokeWidth={1} />
      {ticks}
      <line
        x1="50"
        y1="50"
        x2={hourEnd.x}
        y2={hourEnd.y}
        stroke="var(--color-fg)"
        strokeWidth={3}
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2={minEnd.x}
        y2={minEnd.y}
        stroke="var(--color-fg)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <line
        x1="50"
        y1="50"
        x2={secEnd.x}
        y2={secEnd.y}
        stroke="var(--color-accent)"
        strokeWidth={1}
        strokeLinecap="round"
      />
      <circle cx="50" cy="50" r="2" fill="var(--color-fg)" />
    </svg>
  );
};