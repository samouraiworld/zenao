import { EventFormSchemaType } from "@/components/form/types";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { currentTimezone } from "@/lib/time";

// Correctly reconstruct location object
export function eventLocation(event: EventInfo) {
  let location: EventFormSchemaType["location"] = {
    kind: "custom",
    address: "",
    timeZone: "",
  };
  switch (event.location?.address.case) {
    case "custom":
      location = {
        kind: "custom",
        address: event.location?.address.value.address,
        timeZone: event.location?.address.value.timezone,
      };
      break;
    case "geo":
      location = {
        kind: "geo",
        address: event.location?.address.value.address,
        lat: event.location?.address.value.lat,
        lng: event.location?.address.value.lng,
        size: event.location?.address.value.size,
      };
      break;
    case "virtual":
      location = {
        kind: "virtual",
        location: event.location?.address.value.uri,
      };
  }
  return location;
}

// Construct location object for the call
export function eventFormLocationValue(eventFormValues: EventFormSchemaType) {
  let value = {};
  switch (eventFormValues.location.kind) {
    case "custom":
      value = {
        address: eventFormValues.location.address,
        timezone: currentTimezone(),
      };
      break;
    case "virtual":
      value = { uri: eventFormValues.location.location };
      break;
    case "geo":
      value = {
        address: eventFormValues.location.address,
        lat: eventFormValues.location.lat,
        lng: eventFormValues.location.lng,
        size: eventFormValues.location.size,
      };
      break;
    default:
      value = {};
  }
  return value;
}
