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
import { userInfoOptions } from "@/lib/queries/user";

export default function CommunitiesTable() {
  const { getToken, userId: authId } = useAuth();
  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, authId),
  );

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
        userInfo?.userId,
        tablePage - 1,
        DEFAULT_COMMUNITIES_LIMIT,
        ["administrator"],
        getToken,
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
