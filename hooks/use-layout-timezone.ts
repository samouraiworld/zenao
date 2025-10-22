import { useLayoutEffect, useState } from "react";

// this ensure the same timezone is used on client and server to prevent hydration mismatches
// then set it to the client's timezone before first paint
export function useLayoutTimezone(override?: string) {
  const [clientTimezone, setClientTimezone] = useState<string>();

  useLayoutEffect(() => {
    if (override) {
      return;
    }
    setClientTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [override]);

  return override || clientTimezone || "Etc/UTC";
}
