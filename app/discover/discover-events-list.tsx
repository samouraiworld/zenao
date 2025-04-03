"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { EventsList } from "@/components/lists/events-list";
import { eventsList } from "@/lib/queries/events-list";

export function DiscoverEventsList({
  from,
  now,
}: {
  from: "upcoming" | "past";
  now: number;
}) {
  const { data: events } = useSuspenseQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, 20)
      : eventsList(now - 1, 0, 20, {
          staleTime: 60000,
        }),
  );

  return <EventsList list={events} />;
}
