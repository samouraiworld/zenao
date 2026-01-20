"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import CommunitiesTableView from "./communities-table-view";
import {
  communitiesByUserRolesListSuspense,
  DEFAULT_COMMUNITIES_LIMIT,
} from "@/lib/queries/community";
import useManualPagination from "@/hooks/use-manual-pagination";
import useActor from "@/hooks/use-actor";

export default function CommunitiesTable() {
  const actor = useActor();
  const { getToken } = useAuth();

  const entityId = actor?.actingAs;
  const teamId = actor?.type === "team" ? actor?.actingAs : undefined;

  const [tablePage, setTablePage] = useQueryState("page", {
    defaultValue: 1,
    parse: (value) => {
      const parsed = parseInt(value, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    },
  });

  const { data: communities, isFetching: isFetchingCommunities } =
    useSuspenseQuery(
      communitiesByUserRolesListSuspense(
        entityId,
        tablePage - 1,
        DEFAULT_COMMUNITIES_LIMIT,
        ["administrator"],
        getToken,
        teamId,
      ),
    );

  const { hasNextPage, hasPreviousPage, fetchNextPage, fetchPreviousPage } =
    useManualPagination({
      page: tablePage,
      onPageChange: (newPage) => {
        setTablePage(newPage < 1 ? 1 : newPage);
      },
      getHasNextPage: () => {
        return communities.length >= DEFAULT_COMMUNITIES_LIMIT;
      },
      getHasPreviousPage: (currentPage) => {
        return currentPage > 1;
      },
    });

  return (
    <CommunitiesTableView
      communities={communities}
      isFetchingNextPage={isFetchingCommunities}
      isFetchingPreviousPage={isFetchingCommunities}
      hasNextPage={hasNextPage}
      hasPreviousPage={hasPreviousPage}
      fetchNextPage={fetchNextPage}
      fetchPreviousPage={fetchPreviousPage}
    />
  );
}
