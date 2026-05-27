"use client";

import { useTranslations } from "next-intl";
import { useSuspenseQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryStates } from "nuqs";
import { useCommunityAdministratorsEditionContext } from "../../../../../../components/providers/community-administrators-edition-context-provider";
import { useCommunityAdministratorsColumns } from "./columns";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import {
  communityUserRoles,
  DEFAULT_ADMINISTRATORS_PAGE_LIMIT,
} from "@/lib/queries/community";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import Text from "@/components/widgets/texts/text";
import { AddAdministratorsForm } from "@/components/features/dashboard/community-details/admins/add-administrator-form";
import { useDashboardCommunityContext } from "@/components/providers/dashboard-community-context-provider";
import useActor from "@/hooks/use-actor";

export default function AdministratorsTable() {
  const { communityId } = useDashboardCommunityContext();
  const t = useTranslations("dashboard.communityDetails.administrators");
  const actor = useActor();

  const { data: userRoles } = useSuspenseQuery(
    communityUserRoles(communityId, actor?.actingAs),
  );

  const { administrators, onDelete } =
    useCommunityAdministratorsEditionContext();

  const columns = useCommunityAdministratorsColumns({
    onDelete,
    canBeDeleted: administrators.length > 1,
  });

  const [tablePagination, setTablePagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_ADMINISTRATORS_PAGE_LIMIT),
    },
    {
      scroll: false,
      clearOnDefault: true,
    },
  );

  const table = useDataTableInstance({
    data: administrators,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row,
  });

  if (!userRoles.includes("administrator")) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <AddAdministratorsForm />
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-administrators")}</Text>
              </div>
            )}
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
