export function dateToUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}

export function currentTimezone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}
