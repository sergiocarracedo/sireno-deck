export const formatDateParts = (
  config: {
    locale?: string
    time_zone?: string
    weekDayFormat?: "long" | "short" | "narrow"
    dateFormat?: "numeric" | "2-digit"
    monthFormat?: "numeric" | "2-digit" | "long" | "short" | "narrow"
    yearFormat?: "numeric" | "2-digit"
  },
  date: Date,
) => {
  const locale = config.locale ?? "en-US"
  const tz = config.time_zone
  const monthFmt = new Intl.DateTimeFormat(locale, {
    month: config.monthFormat ?? "short",
    ...(tz ? { timeZone: tz } : {}),
  })
  const dayFmt = new Intl.DateTimeFormat(locale, {
    day: config.dateFormat ?? "numeric",
    ...(tz ? { timeZone: tz } : {}),
  })
  const weekdayFmt = new Intl.DateTimeFormat(locale, {
    weekday: config.weekDayFormat ?? "long",
    ...(tz ? { timeZone: tz } : {}),
  })
  const yearFmt = new Intl.DateTimeFormat(locale, {
    year: config.yearFormat ?? "numeric",
    ...(tz ? { timeZone: tz } : {}),
  })
  return {
    day: dayFmt.format(date),
    month: monthFmt.format(date).toUpperCase(),
    weekday: weekdayFmt.format(date).toUpperCase(),
    year: yearFmt.format(date),
  }
}
