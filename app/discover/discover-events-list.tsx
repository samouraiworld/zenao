"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format, fromUnixTime } from "date-fns";
import { EventInfo } from "../gen/zenao/v1/zenao_pb";
import { DEFAULT_EVENTS_LIMIT, eventsList } from "@/lib/queries/events-list";
import EmptyEventsList from "@/components/features/event/event-empty-list";
import { idFromPkgPath } from "@/lib/queries/event";
import Text from "@/components/widgets/texts/text";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

export function DiscoverEventsList({
  from,
  now,
}: {
  from: "upcoming" | "past";
  now: number;
}) {
  const {
    data: eventsPages,
    isFetchingNextPage,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = useSuspenseInfiniteQuery(
    from === "upcoming"
      ? eventsList(now, Number.MAX_SAFE_INTEGER, DEFAULT_EVENTS_LIMIT)
      : eventsList(now - 1, 0, DEFAULT_EVENTS_LIMIT, {
          staleTime: 1000 * 60, // 1 minute
        }),
  );

  const events = useMemo(() => eventsPages.pages.flat(), [eventsPages]);

  const eventsByDay = useMemo(() => {
    return events.reduce(
      (acc, event) => {
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

  return (
    <div className="space-y-8">
      {Object.entries(eventsByDay).map(([startOfDay, eventsOfTheDay]) => {
        return (
          <div key={startOfDay} className="flex flex-col gap-4">
            <Text size="lg" className="font-semibold">
              {format(startOfDay, "iiii d  MMM")}
            </Text>

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
      })}
      <LoaderMoreButton
        fetchNextPage={fetchNextPage}
        hasNextPage={hasNextPage}
        isFetching={isFetching}
        isFetchingNextPage={isFetchingNextPage}
        page={events}
        noMoreLabel={""}
      />
    </div>
  );
}
