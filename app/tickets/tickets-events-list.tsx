"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { EventsList } from "@/components/lists/events-list";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { FromFilter } from "@/lib/searchParams";

export function TicketsEventsList({
  now,
  from,
  address,
}: {
  now: number;
  from: FromFilter;
  address: string;
}) {
  const { data: events } = useSuspenseQuery(
    from === "upcoming"
      ? eventsByParticipantList(address, now, Number.MAX_SAFE_INTEGER, 20)
      : eventsByParticipantList(address, now - 1, 0, 20),
  );

  return <EventsList list={events} />;
}
