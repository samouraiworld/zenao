"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { createContext, useContext } from "react";
import { EventFormSchemaType } from "../form/types";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { eventOptions } from "@/lib/queries/event";
import { makeLocationFromEvent } from "@/lib/location";
import { useLocationTimezone } from "@/app/hooks/use-location-timezone";

type EventProviderProps = {
  id: string;
  children: React.ReactNode | React.ReactNode[];
};

type EventContextProps = Omit<EventInfo, "location"> & {
  id: string;
  timezone: string;
  location: EventFormSchemaType["location"];
};

const defaultValue: EventContextProps = {
  id: "",
  capacity: 1,
  creator: "",
  $typeName: "zenao.v1.EventInfo",
  description: "",
  endDate: BigInt(0),
  startDate: BigInt(0),
  imageUri: "",
  participants: 0,
  pkgPath: "",
  title: "",
  location: {
    kind: "custom",
    address: "",
    timeZone: "",
  },
  timezone: "",
};

export const EventContext = createContext<EventContextProps>(defaultValue);

export const useEventInfo = () => useContext(EventContext);

export function EventProvider({ id, children }: EventProviderProps) {
  const { data: eventInfo } = useSuspenseQuery(eventOptions(id));
  const location = makeLocationFromEvent(eventInfo.location);
  const timezone = useLocationTimezone(location);

  return (
    <EventContext.Provider value={{ ...eventInfo, id, location, timezone }}>
      {children}
    </EventContext.Provider>
  );
}
