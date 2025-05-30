"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format, fromUnixTime } from "date-fns";
import { EventInfo } from "../gen/zenao/v1/zenao_pb";
import { eventsList } from "@/lib/queries/events-list";
import EmptyEventsList from "@/components/widgets/empty-events-list";
import { EventCard } from "@/components/cards/event-card";
import { idFromPkgPath } from "@/lib/queries/event";
import Text from "@/components/texts/text";
import EventCardListLayout from "@/components/layout/event-card-list-layout";

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

  const eventsByDay = useMemo(() => {
    return events.reduce(
      (acc, event) => {
        // Format the date to YYYY-MM-DD (or any format you prefer)
        const dateKey = fromUnixTime(Number(event.startDate))
          .toISOString()
          .split("T")[0];

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }

        acc[dateKey].push(event);
        return acc;
      },
      {} as Record<string, EventInfo[]>,
    );
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="my-5">
        <EmptyEventsList />
      </div>
    );
  }

  return Object.entries(eventsByDay).map(([startOfDay, eventsOfTheDay]) => {
    return (
      <div key={startOfDay} className="flex flex-col gap-4">
        <Text>{format(startOfDay, "iiii d  MMM")}</Text>

        <EventCardListLayout>
          {eventsOfTheDay.map((evt) => (
            <EventCard
              key={evt.pkgPath}
              evt={evt}
              href={`/event/${idFromPkgPath(evt.pkgPath)}`}
            />
          ))}
        </EventCardListLayout>
      </div>
    );
  });
}
