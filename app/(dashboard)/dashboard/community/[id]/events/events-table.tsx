"use client";

import { parseAsInteger, useQueryStates } from "nuqs";
import {
  useSuspenseQueries,
  useSuspenseQuery,
  UseSuspenseQueryResult,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCommunityEventsColumns } from "./columns";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  communityUsersWithRoles,
  DEFAULT_COMMUNITY_EVENTS_PAGE_LIMIT,
} from "@/lib/queries/community";
import Text from "@/components/widgets/texts/text";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { eventOptions } from "@/lib/queries/event";
import { SafeEventInfo } from "@/types/schemas";
import { useDashboardCommunityContext } from "@/components/providers/dashboard-community-context-provider";

export default function CommunityEventsTable() {
  const t = useTranslations("dashboard.communityDetails.events");
  const router = useRouter();
  const { communityId } = useDashboardCommunityContext();
  const { data: eventRoles } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["event"]),
  );

  const events = useSuspenseQueries({
    queries: eventRoles.map((role) => eventOptions(role.entityId)),
    combine: (results) =>
      results
        .filter(
          (elem): elem is UseSuspenseQueryResult<SafeEventInfo, Error> =>
            elem.isSuccess && !!elem.data,
        )
        .map((elem) => ({
          ...elem.data,
        })),
  });

  const [tablePagination, setTablePagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_COMMUNITY_EVENTS_PAGE_LIMIT),
    },
    {
      scroll: false,
      clearOnDefault: true,
    },
  );

  const columns = useCommunityEventsColumns();
  const table = useDataTableInstance({
    data: events,
    columns,
    enableRowSelection: false,
    defaultPageSize:
      tablePagination.limit < 10
        ? tablePagination.limit
        : DEFAULT_COMMUNITY_EVENTS_PAGE_LIMIT,
    defaultPageIndex:
      tablePagination.page - 1 >= 0 ? tablePagination.page - 1 : 0,
    getRowId: (row) => row.id,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-events")}</Text>
              </div>
            )}
            onClickRow={(row) => {
              router.push(`/dashboard/event/${row.original.id}`);
            }}
          />
        </div>
      </div>
      <DataTablePagination
        pagination={{
          page: tablePagination.page,
          limit: tablePagination.limit,
          setLimit: (newLimit) => {
            setTablePagination((prev) => ({
              ...prev,
              limit: newLimit,
            }));
          },
          setPage: (newPage) => {
            setTablePagination((prev) => ({
              ...prev,
              page: newPage,
            }));
          },
        }}
        table={table}
      />
    </div>
  );
}
