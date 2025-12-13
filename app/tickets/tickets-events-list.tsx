"use client";

import {
  useSuspenseInfiniteQuery,
  useSuspenseQueries,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { format, fromUnixTime } from "date-fns";
import { useAccount } from "wagmi";
import { EventInfo } from "../gen/zenao/v1/zenao_pb";
import { ticketsByOwner } from "@/lib/queries/events-list";
import { FromFilter } from "@/lib/search-params";
import EmptyEventsList from "@/components/features/event/event-empty-list";
import { EventCard } from "@/components/features/event/event-card";
import { eventOptions } from "@/lib/queries/event";
import Text from "@/components/widgets/texts/text";
import EventCardListLayout from "@/components/features/event/event-card-list-layout";
import { LoaderMoreButton } from "@/components/widgets/buttons/load-more-button";

export function TicketsEventsList({
  now,
  from,
}: {
  now: number;
  from: FromFilter;
}) {
  const { address } = useAccount();

  const {
    data: ticketsPages,
    isFetchingNextPage,
    hasNextPage,
    isFetching,
    fetchNextPage,
  } = useSuspenseInfiniteQuery(
    from === "upcoming"
      ? ticketsByOwner(address || "", 200)
      : ticketsByOwner(address || "", 200),
  );

  const eventsAddrs = useMemo(
    () => [
      ...ticketsPages.pages.reduce((prev, page) => {
        for (const ticket of page) {
          prev.add(ticket.eventAddr);
        }
        return prev;
      }, new Set<string>()),
    ],
    [ticketsPages.pages],
  );

  const events = useSuspenseQueries({
    queries: eventsAddrs.map((eventAddr) => eventOptions(eventAddr)),
  });

  const eventsByDay = useMemo(() => {
    return events.reduce(
      (acc, event, idx) => {
        if (event.data.startDate < now && from == "upcoming") {
          return acc;
        }
        if (event.data.startDate >= now && from == "past") {
          return acc;
        }
        const dateKey = fromUnixTime(Number(event.data.startDate))
          .toISOString()
          .split("T")[0];

        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }

        acc[dateKey].push({ ...event.data, addr: eventsAddrs[idx] });
        return acc;
      },
      {} as Record<string, (EventInfo & { addr: string })[]>,
    );
  }, [events, eventsAddrs, from, now]);

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
                <EventCard
                  key={evt.addr}
                  evt={{
                    eventAddr: evt.addr,
                    discoverable: evt.discoverable,
                    saleEnd: evt.endDate.toString(),
                    creatorAddr: evt.organizers[0],
                  }}
                  href={`/ticket/${evt.addr}`}
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
