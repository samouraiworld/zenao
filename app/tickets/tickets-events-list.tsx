"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { eventsByParticipantList } from "@/lib/queries/events-list";
import { FromFilter } from "@/lib/searchParams";
import EmptyEventsList from "@/components/widgets/empty-events-list";
import { EventCard } from "@/components/cards/event-card";
import { idFromPkgPath } from "@/lib/queries/event";

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

  return (
    <div className="my-5">
      {!events.length ? (
        <EmptyEventsList />
      ) : (
        events.map((evt) => (
          <EventCard
            key={evt.pkgPath}
            evt={evt}
            href={`/ticket/${idFromPkgPath(evt.pkgPath)}`}
          />
        ))
      )}
    </div>
  );
}
