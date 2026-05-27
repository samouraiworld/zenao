export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): T {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: Parameters<T>) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  } as T;
}
