"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { FromFilter } from "@/lib/searchParams";
import { eventsList } from "@/lib/queries/events-list";
import { EventsList } from "@/components/lists/events-list";

export function DiscoverEventsList({
  now,
  from,
}: {
  now: number;
  from: FromFilter;
}) {
  const { data: events } = useSuspenseQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, 20)
      : eventsList(now - 1, 0, 20),
  );

  return <EventsList list={events} />;
}
