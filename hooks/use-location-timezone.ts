import { useEffect, useState } from "react";
import { determineTimezone } from "@/lib/determine-timezone";
import { currentTimezone } from "@/lib/time";
import { EventFormSchemaType } from "@/types/schemas";

export const useLocationTimezone = (
  location: EventFormSchemaType["location"],
) => {
  const [timezone, setTimezone] = useState<string>(currentTimezone());

  useEffect(() => {
    setTimezone(determineTimezone(location));
  }, [location]);

  return timezone;
};
