"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { eventsOptions } from "@/lib/queries/event";

export function EventList() {
  const { data } = useSuspenseQuery(eventsOptions());

  if (!data) {
    return (
      <div>
        <p>no events to show</p>
      </div>
    );
  }

  return <div>{JSON.stringify(data)}</div>;
}
