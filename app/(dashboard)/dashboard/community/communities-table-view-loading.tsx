"use client";

import { useTranslations } from "next-intl";
import useCommunitiesTableColumns from "./columns";
import { DataTable } from "@/components/widgets/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DEFAULT_COMMUNITIES_LIMIT } from "@/lib/queries/community";
import Text from "@/components/widgets/texts/text";

export default function CommunitiesTableViewLoading() {
  const t = useTranslations("dashboard.communitiesTable");
  const columns = useCommunitiesTableColumns();
  const table = useDataTableInstance({
    data: [], // We don't care about data during loading
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_COMMUNITIES_LIMIT,
    getRowId: (row) => row.community.id.toString(),
  });

  return (
    <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
      <div className="w-full">
        <DataTable
          table={table}
          columns={columns}
          dndEnabled={false}
          isLoading
          loadingFn={() => (
            <div className="flex h-48 flex-col justify-center items-center gap-4">
              <Text className="text-center">{t("loading")}</Text>
            </div>
          )}
        />
      </div>
    </div>
  );
}
