import GeoTZFind from "tz-lookup";
import { EventFormSchemaType } from "@/components/form/types";

export const determineTimezone = (
  location: EventFormSchemaType["location"],
) => {
  switch (location.kind) {
    case "custom":
      return location.timeZone;
    case "virtual":
      return "";
    case "geo":
      const tz = GeoTZFind(location.lat, location.lng);
      return tz;
  }
};
