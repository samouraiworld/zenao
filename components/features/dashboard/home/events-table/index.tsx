"use client";

import { useAuth } from "@clerk/nextjs";
import {
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useMemo } from "react";
import { EventsTableView } from "./events-table-view";
import { userInfoOptions } from "@/lib/queries/user";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerList,
} from "@/lib/queries/events-list";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";

interface EventsTableProps {
  now: number;
}

export default function EventsTable({ now }: EventsTableProps) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const {
    data: upcomingEventsPages,
    isFetchingNextPage: isFetchingUpcomingNextPage,
    isFetchingPreviousPage: isFetchingUpcomingPreviousPage,
    hasNextPage: hasNextUpcomingPage,
    hasPreviousPage: hasPreviousUpcomingPage,
    fetchNextPage: fetchNextUpcomingPage,
    fetchPreviousPage: fetchPreviousUpcomingPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      userInfo?.realmId,
      DiscoverableFilter.UNSPECIFIED,
      now,
      Number.MAX_SAFE_INTEGER,
      DEFAULT_EVENTS_LIMIT,
    ),
  );
  const {
    data: pastEventsPages,
    isFetchingNextPage: isFetchingPastNextPage,
    isFetchingPreviousPage: isFetchingPastPreviousPage,
    hasNextPage: hasNextPastPage,
    hasPreviousPage: hasPreviousPastPage,
    fetchNextPage: fetchNextPastPage,
    fetchPreviousPage: fetchPreviousPastPage,
  } = useSuspenseInfiniteQuery(
    eventsByOrganizerList(
      userInfo?.realmId,
      DiscoverableFilter.UNSPECIFIED,
      now - 1,
      0,
      DEFAULT_EVENTS_LIMIT,
    ),
  );

  const upcomingEvents = useMemo(
    () => upcomingEventsPages.pages.flat(),
    [upcomingEventsPages],
  );
  const pastEvents = useMemo(
    () => pastEventsPages.pages.flat(),
    [pastEventsPages],
  );

  return (
    <EventsTableView
      upcomingEvents={upcomingEvents}
      pastEvents={pastEvents}
      isFetchingPastNextPage={isFetchingPastNextPage}
      isFetchingPastPreviousPage={isFetchingPastPreviousPage}
      hasPastNextPage={hasNextPastPage}
      hasPastPreviousPage={hasPreviousPastPage}
      fetchPastNextPage={fetchNextPastPage}
      fetchPastPreviousPage={fetchPreviousPastPage}
      isFetchingUpcomingNextPage={isFetchingUpcomingNextPage}
      isFetchingUpcomingPreviousPage={isFetchingUpcomingPreviousPage}
      hasUpcomingNextPage={hasNextUpcomingPage}
      hasUpcomingPreviousPage={hasPreviousUpcomingPage}
      fetchUpcomingNextPage={fetchNextUpcomingPage}
      fetchUpcomingPreviousPage={fetchPreviousUpcomingPage}
    />
  );
}
