"use client";

import { useMembersColumns } from "./columns";
import { DataTable } from "@/components/widgets/data-table/data-table";
import Text from "@/components/widgets/texts/text";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DEFAULT_COMMUNITY_MEMBERS_LIMIT } from "@/lib/queries/community";

export default function DashboardMembersPageLoading() {
  const columns = useMembersColumns();
  const table = useDataTableInstance({
    data: [], // We don't care about data during loading
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_COMMUNITY_MEMBERS_LIMIT,
    getRowId: (row) => `${row.entityType}:${row.entityId}`,
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
              <Text className="text-center">Loading...</Text>
            </div>
          )}
        />
      </div>
    </div>
  );
}
