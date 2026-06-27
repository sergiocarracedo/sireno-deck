import { useEffect, useState } from "react";

import type { AddonButtonTypeDefinition } from "@/addon/api.ts";
import { Text } from "@/themes/default/components/Text.tsx";

import { formatDigitalDateTimeLabel } from "../format.ts";
import {
  ANALOG_CLOCK_INTERVAL_MS,
  BuiltinAnalogClockButtonSchema,
  BuiltinClockButtonSchema,
  BuiltinDateButtonSchema,
  BuiltinDateTimeButtonSchema,
  BuiltinTimePresetButtonSchema,
  CLOCK_BUTTON_INTERVAL_MS,
  DATE_BUTTON_INTERVAL_MS,
  DIGITAL_DATE_TIME_INTERVAL_MS,
  LockedTimeTileButtonSchema,
  type BuiltinDateButtonConfig,
} from "../schemas.ts";

const useNow = (intervalMs: number): Date => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
};

const formatTimeWithTZ = (date: Date, timeZone: string | undefined, showSeconds: boolean): string => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    ...(showSeconds ? { second: "2-digit" } : {}),
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  });
  return fmt.format(date);
};

const formatDateParts = (config: BuiltinDateButtonConfig, date: Date) => {
  const locale = config.locale ?? "en-US";
  const timeZone = config.time_zone;
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    ...(timeZone ? { timeZone } : {}),
  });
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    ...(timeZone ? { timeZone } : {}),
  });
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    ...(timeZone ? { timeZone } : {}),
  });
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
  };
};

export const builtinDateTimeButton: AddonButtonTypeDefinition = {
  type: "core:date-time",
  configSchema: BuiltinDateTimeButtonSchema,
  defaultRenderIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ config }) => {
    const now = useNow(DIGITAL_DATE_TIME_INTERVAL_MS);
    const format = config.format ?? "DD/MM/YYYY HH:mm:ss";
    return (
      <span className="flex h-full w-full items-center justify-center">
        <Text size="lg" tone="fg">
          {formatDigitalDateTimeLabel(format, now)}
        </Text>
      </span>
    );
  },
};

export const builtinTimeButton: AddonButtonTypeDefinition = {
  type: "core:time",
  configSchema: BuiltinTimePresetButtonSchema,
  defaultRenderIntervalMs: DIGITAL_DATE_TIME_INTERVAL_MS,
  render: ({ config }) => {
    const now = useNow(DIGITAL_DATE_TIME_INTERVAL_MS);
    const variant = config.variant ?? "default";
    const format = variant === "big" ? "<2xl>HH</2xl><dim>.</dim>mm" : "HH:mm";
    return (
      <span className="flex h-full w-full items-center justify-center">
        <Text size={variant === "big" ? "lg" : "md"} tone="fg">
          {formatDigitalDateTimeLabel(format, now)}
        </Text>
      </span>
    );
  },
};

export const builtinDateButton: AddonButtonTypeDefinition = {
  type: "core:date",
  configSchema: BuiltinDateButtonSchema,
  defaultRenderIntervalMs: DATE_BUTTON_INTERVAL_MS,
  render: ({ config }) => {
    const now = useNow(DATE_BUTTON_INTERVAL_MS);
    const { day, month, weekday } = formatDateParts(config, now);
    return (
      <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase leading-none text-accent">
          {month}
        </span>
        <span className="text-3xl font-semibold leading-none text-fg">{day}</span>
        <span className="text-xs uppercase tracking-wider text-muted">{weekday}</span>
      </span>
    );
  },
};

export const builtinClockButton: AddonButtonTypeDefinition = {
  type: "core:clock",
  configSchema: BuiltinClockButtonSchema,
  defaultRenderIntervalMs: CLOCK_BUTTON_INTERVAL_MS,
  render: ({ config }) => {
    const now = useNow(CLOCK_BUTTON_INTERVAL_MS);
    const time = formatTimeWithTZ(now, config.time_zone, config.showSeconds ?? false);
    return (
      <span className="flex h-full w-full items-center justify-center">
        <Text size="lg" tone="fg" className="font-mono">
          {time}
        </Text>
      </span>
    );
  },
};

const polar = (cx: number, cy: number, r: number, deg: number): { x: number; y: number } => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
};

export const builtinAnalogClockButton: AddonButtonTypeDefinition = {
  type: "core:analog-clock",
  configSchema: BuiltinAnalogClockButtonSchema,
  defaultRenderIntervalMs: ANALOG_CLOCK_INTERVAL_MS,
  render: () => {
    const now = useNow(ANALOG_CLOCK_INTERVAL_MS);
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
  },
};

const formatLockedCharacter = (
  slot: LockedTimeTileButtonConfig["slot"],
  now: Date,
): string => {
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  switch (slot) {
    case "hour":
      return h;
    case "hour-tens":
      return h[0] ?? "0";
    case "hour-ones":
      return h[1] ?? "0";
    case "separator":
      return ":";
    case "minute":
      return m;
    case "minute-tens":
      return m[0] ?? "0";
    case "minute-ones":
      return m[1] ?? "0";
  }
};

export const builtinLockedTimeTileButton: AddonButtonTypeDefinition = {
  type: "core:locked-time-tile",
  configSchema: LockedTimeTileButtonSchema,
  defaultRenderIntervalMs: CLOCK_BUTTON_INTERVAL_MS,
  render: ({ config }) => {
    const now = useNow(CLOCK_BUTTON_INTERVAL_MS);
    return (
      <span className="flex h-full w-full items-center justify-center">
        <Text size="lg" tone="fg" className="font-mono">
          {formatLockedCharacter(config.slot, now)}
        </Text>
      </span>
    );
  },
};

export const dateTimeAddon = {
  apiVersion: 3 as const,
  name: "date-time",
  kind: "runtime" as const,
  frontend: { main: "./frontend.tsx" },
  publishIntervalMs: 1000,
  buttons: [
    builtinDateTimeButton,
    builtinTimeButton,
    builtinDateButton,
    builtinClockButton,
    builtinAnalogClockButton,
    builtinLockedTimeTileButton,
  ],
};