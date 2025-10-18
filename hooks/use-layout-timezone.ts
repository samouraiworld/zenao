import { useLayoutEffect, useState } from "react";

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
