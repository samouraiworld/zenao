import { useEffect, useState } from "react";
import { EventFormSchemaType } from "@/components/form/types";
import { currentTimezone } from "@/lib/time";

export const useLocationTimezone = (
  location: EventFormSchemaType["location"],
) => {
  const [timezone, setTimezone] = useState<string>(currentTimezone());

  useEffect(() => {
    const determineTimezone = async () => {
      switch (location.kind) {
        case "custom":
          return location.timeZone === ""
            ? currentTimezone()
            : location.timeZone;
        case "virtual":
          // ! Change to organizer timezone (#286)
          return currentTimezone();
        case "geo":
          const GeoTZFind = (await import("browser-geo-tz")).find;
          const tz = await GeoTZFind(location.lat, location.lng);
          return tz[0];
      }
    };

    determineTimezone().then((found) => {
      setTimezone(found);
    });
  }, [location]);

  return timezone;
};
