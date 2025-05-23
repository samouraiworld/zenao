import GeoTZFind from "tz-lookup";
import { currentTimezone } from "./time";
import { EventFormSchemaType } from "@/components/form/types";

export const determineTimezone = (
  location: EventFormSchemaType["location"],
) => {
  switch (location.kind) {
    case "custom":
      return location.timeZone === "" ? currentTimezone() : location.timeZone;
    case "virtual":
      return currentTimezone();
    case "geo":
      const tz = GeoTZFind(location.lat, location.lng);
      return tz;
  }
};
