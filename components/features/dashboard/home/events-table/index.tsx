"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { EventsTableView } from "./events-table-view";
import { userInfoOptions } from "@/lib/queries/user";
import {
  DEFAULT_EVENTS_LIMIT,
  eventsByOrganizerListSuspense,
} from "@/lib/queries/events-list";
import { DiscoverableFilter } from "@/app/gen/zenao/v1/zenao_pb";
import useManualPagination from "@/hooks/use-manual-pagination";

interface EventsTableProps {
  now: number;
}

export default function EventsTable({ now }: EventsTableProps) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const [tablePage, setTablePage] = useState(0);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  const { data: pastEvents, isFetching: isFetchingPastEvents } =
    useSuspenseQuery(
      eventsByOrganizerListSuspense(
        userInfo?.realmId,
        DiscoverableFilter.UNSPECIFIED,
        now - 1,
        0,
        DEFAULT_EVENTS_LIMIT,
        tablePage,
      ),
    );

  const { data: upcomingEvents, isFetching: isFetchingUpcomingEvents } =
    useSuspenseQuery(
      eventsByOrganizerListSuspense(
        userInfo?.realmId,
        DiscoverableFilter.UNSPECIFIED,
        now,
        Number.MAX_SAFE_INTEGER,
        DEFAULT_EVENTS_LIMIT,
        tablePage,
      ),
    );

  const {
    hasNextPage: hasPastNextPage,
    hasPreviousPage: hasPastPreviousPage,
    fetchNextPage: fetchPastNextPage,
    fetchPreviousPage: fetchPastPreviousPage,
  } = useManualPagination({
    page: tablePage,
    onPageChange: setTablePage,
    getHasNextPage: () => {
      return pastEvents.length > DEFAULT_EVENTS_LIMIT;
    },
    getHasPreviousPage: (currentPage) => {
      return currentPage > 0 && pastEvents.length < DEFAULT_EVENTS_LIMIT;
    },
  });

  const {
    hasNextPage: hasUpcomingNextPage,
    hasPreviousPage: hasUpcomingPreviousPage,
    fetchNextPage: fetchUpcomingNextPage,
    fetchPreviousPage: fetchUpcomingPreviousPage,
  } = useManualPagination({
    page: tablePage,
    onPageChange: setTablePage,
    getHasNextPage: () => {
      return upcomingEvents.length == DEFAULT_EVENTS_LIMIT;
    },
    getHasPreviousPage: (currentPage) => {
      return currentPage > 0 && upcomingEvents.length < DEFAULT_EVENTS_LIMIT;
    },
  });

  return (
    <EventsTableView
      now={now}
      tab={tab}
      onTabChange={setTab}
      events={tab === "upcoming" ? upcomingEvents : pastEvents}
      isFetchingPastNextPage={isFetchingPastEvents}
      isFetchingPastPreviousPage={isFetchingPastEvents}
      hasPastNextPage={hasPastNextPage}
      hasPastPreviousPage={hasPastPreviousPage}
      fetchPastNextPage={fetchPastNextPage}
      fetchPastPreviousPage={fetchPastPreviousPage}
      isFetchingUpcomingNextPage={isFetchingUpcomingEvents}
      isFetchingUpcomingPreviousPage={isFetchingUpcomingEvents}
      hasUpcomingNextPage={hasUpcomingNextPage}
      hasUpcomingPreviousPage={hasUpcomingPreviousPage}
      fetchUpcomingNextPage={fetchUpcomingNextPage}
      fetchUpcomingPreviousPage={fetchUpcomingPreviousPage}
    />
  );
}
