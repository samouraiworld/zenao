export function dateToUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

/**
 * @deprecated this is a source of hydration mismatch use next-intl utilities instead
 */
export function currentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
