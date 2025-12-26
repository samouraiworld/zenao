"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
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
  tab: "upcoming" | "past";
}

export default function EventsTable({ now, tab }: EventsTableProps) {
  const { getToken, userId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );

  const [tablePage, setTablePage] = useQueryState("page", {
    defaultValue: 1,
    parse: (value) => {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    },
  });

  const { data: pastEvents, isFetching: isFetchingPastEvents } =
    useSuspenseQuery(
      eventsByOrganizerListSuspense(
        userInfo?.realmId,
        DiscoverableFilter.UNSPECIFIED,
        now - 1,
        0,
        DEFAULT_EVENTS_LIMIT,
        tablePage - 1,
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
        tablePage - 1,
      ),
    );

  const {
    hasNextPage: hasPastNextPage,
    hasPreviousPage: hasPastPreviousPage,
    fetchNextPage: fetchPastNextPage,
    fetchPreviousPage: fetchPastPreviousPage,
  } = useManualPagination({
    page: tablePage,
    onPageChange: (newPage) => {
      console.log("Setting table page to:", newPage);
      setTablePage(newPage < 1 ? 1 : newPage);
    },
    getHasNextPage: () => {
      return pastEvents.length > DEFAULT_EVENTS_LIMIT;
    },
    getHasPreviousPage: (currentPage) => {
      return (
        currentPage > 0 &&
        pastEvents.length < DEFAULT_EVENTS_LIMIT &&
        tablePage > 1
      );
    },
  });

  const {
    hasNextPage: hasUpcomingNextPage,
    hasPreviousPage: hasUpcomingPreviousPage,
    fetchNextPage: fetchUpcomingNextPage,
    fetchPreviousPage: fetchUpcomingPreviousPage,
  } = useManualPagination({
    page: tablePage,
    onPageChange: (newPage) => {
      console.log("Setting table page to:", newPage);
      setTablePage(newPage < 1 ? 1 : newPage);
    },
    getHasNextPage: () => {
      return upcomingEvents.length == DEFAULT_EVENTS_LIMIT;
    },
    getHasPreviousPage: (currentPage) => {
      return (
        currentPage > 0 &&
        upcomingEvents.length < DEFAULT_EVENTS_LIMIT &&
        tablePage > 1
      );
    },
  });

  return (
    <EventsTableView
      now={now}
      tab={tab}
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
