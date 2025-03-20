import { EventLocation } from "@/app/gen/zenao/v1/zenao_pb";
import { EventFormSchemaType } from "@/components/form/types";

export const makeLocationFromEvent = (
  eventLocation: EventLocation | undefined,
): EventFormSchemaType["location"] => {
  switch (eventLocation?.address.case) {
    case "custom":
      return {
        kind: "custom",
        address: eventLocation?.address.value.address,
        timeZone: eventLocation?.address.value.timezone,
      };
      break;
    case "geo":
      return {
        kind: "geo",
        address: eventLocation?.address.value.address,
        lat: eventLocation?.address.value.lat,
        lng: eventLocation?.address.value.lng,
        size: eventLocation?.address.value.size,
      };
      break;
    case "virtual":
      return {
        kind: "virtual",
        location: eventLocation?.address.value.uri,
        // ! TODO Add timeZone
      };
  }
  return {
    kind: "custom",
    address: "",
    timeZone: "",
  };
};
