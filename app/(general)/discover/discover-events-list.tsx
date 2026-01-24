"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState, useCallback } from "react";
import { format, fromUnixTime } from "date-fns";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsList,
  LocationFilterParams,
} from "@/lib/queries/events-list";
import EmptyEventsList from "@/components/features/event/event-empty-list";
import Text from "@/components/widgets/texts/text";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { EventCard } from "@/components/features/event/event-card";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { EventLocationFilter } from "@/components/features/event/event-location-filter";
import { SafeEventInfo } from "@/types/schemas";

export function DiscoverEventsList({
  from,
  now,
}: {
  from: "upcoming" | "past";
  now: number;
}) {
  const [locationFilter, setLocationFilter] = useState<
    LocationFilterParams | undefined
  >(undefined);

  const handleFilterChange = useCallback(
    (filter: LocationFilterParams | undefined) => {
      setLocationFilter(filter);
    },
    [],
  );

  const {
    data: eventsPages,
    isFetchingNextPage,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = useSuspenseInfiniteQuery(
    from === "upcoming"
      ? eventsList(
          now,
          Number.MAX_SAFE_INTEGER,
          DEFAULT_EVENTS_LIMIT,
          undefined,
          locationFilter,
        )
      : eventsList(
          now - 1,
          0,
          DEFAULT_EVENTS_LIMIT,
          {
            staleTime: 1000 * 60, // 1 minute
          },
          locationFilter,
        ),
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
      {} as Record<string, SafeEventInfo[]>,
    );
  }, [events]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <EventLocationFilter
          onFilterChange={handleFilterChange}
          currentFilter={locationFilter}
        />
      </div>

      {events.length === 0 ? (
        <div className="my-5">
          <EmptyEventsList />
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(eventsByDay).map(([startOfDay, eventsOfTheDay]) => {
            return (
              <div key={startOfDay} className="flex flex-col gap-4">
                <Text size="lg" className="font-semibold">
                  {format(startOfDay, "iiii d  MMM")}
                </Text>

                <EventCardListLayout>
                  {eventsOfTheDay.map((evt) => (
                    <EventCard key={evt.id} evt={evt} href={`/event/${evt.id}`} />
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
      )}
    </div>
  );
}
