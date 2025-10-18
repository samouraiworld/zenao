import GeoTZFind from "tz-lookup";
import { EventFormSchemaType } from "@/types/schemas";

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
