"use client";

import { EventCard } from "@/components/cards/event-card";
import EmptyEventsList from "@/components/widgets/empty-events-list";
import { idFromPkgPath } from "@/lib/queries/event";
import { eventsList } from "@/lib/queries/events-list";
import { useSuspenseQuery } from "@tanstack/react-query";

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

  return (
    <div className="my-5">
      {!events.length ? (
        <EmptyEventsList />
      ) : (
        events.map((evt) => (
          <EventCard
            key={evt.pkgPath}
            evt={evt}
            href={`/event/${idFromPkgPath(evt.pkgPath)}`}
          />
        ))
      )}
    </div>
  );
}
