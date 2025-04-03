import { useEffect, useState } from "react";
import { determineTimezone } from "@/lib/determine-timezone";
import { EventFormSchemaType } from "@/components/form/types";
import { currentTimezone } from "@/lib/time";

export const useLocationTimezone = (
  location: EventFormSchemaType["location"],
) => {
  const [timezone, setTimezone] = useState<string>(currentTimezone());

  useEffect(() => {
    setTimezone(determineTimezone(location));
  }, [location]);

  return timezone;
};
