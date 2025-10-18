import GeoTZFind from "tz-lookup";
import { EventFormSchemaType } from "@/types/schemas";

// use this to conditionally pass timezone in next-intl formatter and ensure no hydration mismatch
export const locationTimezone = (location: EventFormSchemaType["location"]) => {
  switch (location.kind) {
    case "custom":
      return location.timeZone === "" ? undefined : location.timeZone;
    case "virtual":
      return undefined;
    case "geo":
      const tz = GeoTZFind(location.lat, location.lng);
      return tz;
  }
};
