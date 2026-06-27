import { useEffect, useState } from "react";

import { useAddonChannel } from "sireno-deck-2/react";

interface ComponentProps {
  readonly config: unknown;
  readonly state: unknown;
}

const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const formatTime = (date: Date, showSeconds: boolean): string => {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return showSeconds ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
};

const formatDateParts = (date: Date) => {
  const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short" });
  const dayFmt = new Intl.DateTimeFormat("en-US", { day: "numeric" });
  const weekdayFmt = new Intl.DateTimeFormat("en-US", { weekday: "long" });
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
  };
};

const ChannelNow = ({ children }: { children: (now: Date) => React.ReactNode }) => {
  const { data } = useAddonChannel<{ now: number }>("date-time:now");
  const tickNow = useNow(1000);
  const fallbackNow = data !== undefined && data.now ? new Date(data.now) : tickNow;
  return <>{children(fallbackNow)}</>;
};

const CoreTime = ({ config }: ComponentProps) => {
  const { variant } = (config as { variant?: "default" | "big" }) ?? {};
  return (
    <ChannelNow>
      {(now) => (
        <span
          className={
            variant === "big"
              ? "flex h-full w-full items-center justify-center font-mono text-3xl text-fg"
              : "flex h-full w-full items-center justify-center font-mono text-xl text-fg"
          }
        >
          {formatTime(now, false)}
        </span>
      )}
    </ChannelNow>
  );
};

const CoreDate = () => (
  <ChannelNow>
    {(now) => {
      const { day, month, weekday } = formatDateParts(now);
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase leading-none text-accent">
            {month}
          </span>
          <span className="text-3xl font-semibold leading-none text-fg">{day}</span>
          <span className="text-xs uppercase tracking-wider text-muted">{weekday}</span>
        </span>
      );
    }}
  </ChannelNow>
);

const CoreClock = ({ config }: ComponentProps) => {
  const { showSeconds } = (config as { showSeconds?: boolean }) ?? {};
  return (
    <ChannelNow>
      {(now) => (
        <span className="flex h-full w-full items-center justify-center font-mono text-lg text-fg">
          {formatTime(now, showSeconds === true)}
        </span>
      )}
    </ChannelNow>
  );
};

const CoreAnalogClock = () => (
  <ChannelNow>
    {(now) => {
      const h = now.getHours() % 12;
      const m = now.getMinutes();
      const s = now.getSeconds();
      const hAngle = (h + m / 60) * 30;
      const mAngle = (m + s / 60) * 6;
      const sAngle = s * 6;
      return (
        <svg viewBox="0 0 100 100" className="h-full w-full">
          <circle cx="50" cy="50" r="46" fill="none" stroke="var(--color-fg)" strokeWidth="2" />
          <line
            x1="50"
            y1="50"
            x2={50 + 28 * Math.sin((hAngle * Math.PI) / 180)}
            y2={50 - 28 * Math.cos((hAngle * Math.PI) / 180)}
            stroke="var(--color-fg)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="50"
            x2={50 + 38 * Math.sin((mAngle * Math.PI) / 180)}
            y2={50 - 38 * Math.cos((mAngle * Math.PI) / 180)}
            stroke="var(--color-fg)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <line
            x1="50"
            y1="50"
            x2={50 + 42 * Math.sin((sAngle * Math.PI) / 180)}
            y2={50 - 42 * Math.cos((sAngle * Math.PI) / 180)}
            stroke="var(--color-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      );
    }}
  </ChannelNow>
);

const CoreDateTime = ({ config }: ComponentProps) => {
  const { format } = (config as { format?: string }) ?? {};
  const pattern = format ?? "DD/MM/YYYY HH:mm:ss";
  return (
    <ChannelNow>
      {(now) => {
        const yy = String(now.getFullYear());
        const MM = String(now.getMonth() + 1).padStart(2, "0");
        const dd = String(now.getDate()).padStart(2, "0");
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const ss = String(now.getSeconds()).padStart(2, "0");
        return (
          <span className="flex h-full w-full items-center justify-center font-mono text-xs text-fg">
            {pattern
              .replace(/YYYY/g, yy)
              .replace(/MM/g, MM)
              .replace(/DD/g, dd)
              .replace(/HH/g, hh)
              .replace(/mm/g, mm)
              .replace(/ss/g, ss)}
          </span>
        );
      }}
    </ChannelNow>
  );
};

const CoreLockedTimeTile = ({ config }: ComponentProps) => {
  const { slot } = (config as { slot?: string }) ?? {};
  return (
    <ChannelNow>
      {(now) => {
        const hh = String(now.getHours()).padStart(2, "0");
        const mm = String(now.getMinutes()).padStart(2, "0");
        const map: Record<string, string> = {
          "hour": hh[0] ?? "",
          "hour-tens": hh[0] ?? "",
          "hour-ones": hh[1] ?? "",
          "separator": ":",
          "minute": mm[0] ?? "",
          "minute-tens": mm[0] ?? "",
          "minute-ones": mm[1] ?? "",
        };
        return (
          <span className="flex h-full w-full items-center justify-center font-mono text-2xl text-fg">
            {map[slot ?? "hour"] ?? ""}
          </span>
        );
      }}
    </ChannelNow>
  );
};

const Component = (props: ComponentProps) => {
  const type = (props as { buttonType?: string }).buttonType;
  if (type === "core:date") return <CoreDate />;
  if (type === "core:clock") return <CoreClock config={props.config} />;
  if (type === "core:analog-clock") return <CoreAnalogClock />;
  if (type === "core:date-time") return <CoreDateTime config={props.config} />;
  if (type === "core:locked-time-tile") return <CoreLockedTimeTile config={props.config} />;
  return <CoreTime config={props.config} />;
};

export default Component;
