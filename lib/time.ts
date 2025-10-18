export function dateToUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

/**
 * Returns the context's timezone, on the client it will be the browser timezone, on the server, the server's timezone.
 * This is a common source of hydration mismatch, it should only be used on the client side aka NOT during SSR.
 */
export function currentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
