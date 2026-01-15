"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { format, fromUnixTime } from "date-fns";
import { useAuth } from "@clerk/nextjs";
import { DiscoverableFilter } from "../../gen/zenao/v1/zenao_pb";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByParticipantList,
} from "@/lib/queries/events-list";
import { FromFilter } from "@/lib/search-params";
import EmptyEventsList from "@/components/features/event/event-empty-list";
import { EventCard } from "@/components/features/event/event-card";
import Text from "@/components/widgets/texts/text";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";
import { SafeEventInfo } from "@/types/schemas";
import { useActiveAccount } from "@/components/providers/active-account-provider";

export function TicketsEventsList({
  now,
  from,
  userId,
}: {
  now: number;
  from: FromFilter;
  userId: string;
}) {
  const { getToken } = useAuth();
  const { activeAccount } = useActiveAccount();

  const entityId = activeAccount?.id ?? userId;
  const teamId = activeAccount?.type === "team" ? activeAccount.id : undefined;

  const {
    data: eventsPages,
    isFetchingNextPage,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = useSuspenseInfiniteQuery(
    from === "upcoming"
      ? eventsByParticipantList(
          entityId,
          DiscoverableFilter.UNSPECIFIED,
          now,
          Number.MAX_SAFE_INTEGER,
          DEFAULT_EVENTS_LIMIT,
          getToken,
          teamId,
        )
      : eventsByParticipantList(
          entityId,
          DiscoverableFilter.UNSPECIFIED,
          now - 1,
          0,
          DEFAULT_EVENTS_LIMIT,
          getToken,
          teamId,
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
            <Text suppressHydrationWarning size="lg" className="font-semibold">
              {format(startOfDay, "iiii d  MMM")}
            </Text>

            <EventCardListLayout>
              {eventsOfTheDay.map((evt) => (
                <EventCard key={evt.id} evt={evt} href={`/ticket/${evt.id}`} />
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
