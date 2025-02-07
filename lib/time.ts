export function dateToUnixSeconds(d: Date) {
  return Math.floor(d.getTime() / 1000);
}
