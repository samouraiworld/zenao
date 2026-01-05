"use client";

import { parseAsInteger, useQueryStates } from "nuqs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useDashboardCommunityContext } from "../dashboard-community-context-provider";
import { useMembersColumns } from "./columns";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import {
  communityUsersWithRoles,
  DEFAULT_COMMUNITY_MEMBERS_LIMIT,
} from "@/lib/queries/community";
import Text from "@/components/widgets/texts/text";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";

export default function MembersTable() {
  const t = useTranslations("dashboard.communityDetails.members");
  const { communityId } = useDashboardCommunityContext();
  const { data: members } = useSuspenseQuery(
    communityUsersWithRoles(communityId, ["member"]),
  );

  const [tablePagination, setTablePagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_COMMUNITY_MEMBERS_LIMIT),
    },
    {
      scroll: false,
      clearOnDefault: true,
    },
  );

  const columns = useMembersColumns();
  const table = useDataTableInstance({
    data: members,
    columns,
    enableRowSelection: false,
    defaultPageSize:
      tablePagination.limit < 10
        ? tablePagination.limit
        : DEFAULT_COMMUNITY_MEMBERS_LIMIT,
    defaultPageIndex:
      tablePagination.page - 1 >= 0 ? tablePagination.page - 1 : 0,
    getRowId: (row) => `${row.entityType}:${row.entityId}`,
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
                <Text className="text-center">{t("no-members")}</Text>
              </div>
            )}
            onClickRow={(row) => {
              if (row.original.entityType !== "user") {
                return;
              }

              window.open(`/profile/${row.original.entityId}`, "_blank");
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
