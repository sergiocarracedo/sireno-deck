import type { AddonFrontendButton } from "@/addon/api";
import { useNow } from '../../shared/use-now'
const INTERVAL_MS = 60000;
const formatDateParts = (config: { locale?: string; time_zone?: string }, date: Date) => {
  const locale = config.locale ?? "en-US";
  const tz = config.time_zone;
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: "short",
    ...(tz ? { timeZone: tz } : {}),
  });
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    ...(tz ? { timeZone: tz } : {}),
  });
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    ...(tz ? { timeZone: tz } : {}),
  });
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
  };
};
export const DateButtonFrontend: AddonFrontendButton = ({ config }) => {
  const now = useNow(INTERVAL_MS);
  const { day, month, weekday } = formatDateParts(config as { locale?: string; time_zone?: string }, now);
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
      <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase leading-none text-accent">
        {month}
      </span>
      <span className="text-3xl font-semibold leading-none text-fg">{day}</span>
      <span className="text-xs uppercase tracking-wider text-muted">{weekday}</span>
    </span>
  );
};