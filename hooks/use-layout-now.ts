import { useNow } from "next-intl";
import { useLayoutEffect, useState } from "react";

// this ensure the same now is used on client and server to prevent hydration mismatches
// then updates it before first paint on the client
export function useLayoutNow() {
  const [clientNow, setClientNow] = useState<Date>();
  const serverNow = useNow();

  useLayoutEffect(() => {
    setClientNow(new Date());
  }, []);

  return clientNow || serverNow;
}
