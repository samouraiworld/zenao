import { useLayoutEffect, useState } from "react";
import { locationTimezone } from "@/lib/event-location";
import { EventFormSchemaType } from "@/types/schemas";

export const useLocationTimezone = (
  location: EventFormSchemaType["location"],
) => {
  const eventTimezone = locationTimezone(location);
  const [clientTimezone, setClientTimezone] = useState<string>();

  useLayoutEffect(() => {
    if (eventTimezone) {
      return;
    }
    setClientTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, [eventTimezone]);

  return eventTimezone || clientTimezone || "Etc/UTC";
};
