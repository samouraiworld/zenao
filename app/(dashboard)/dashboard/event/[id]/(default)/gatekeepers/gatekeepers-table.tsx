"use client";

import { useAuth } from "@clerk/nextjs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { eventGatekeepersEmails } from "@/lib/queries/event";
import { userInfoOptions } from "@/lib/queries/user";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { eventUserRoles } from "@/lib/queries/event-users";
import { useGatekeepersColumns } from "@/components/features/dashboard/event-details/columns";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import Text from "@/components/widgets/texts/text";

interface GatekeepersTableProps {
  eventId: string;
}

export default function GatekeepersTable({ eventId }: GatekeepersTableProps) {
  const { getToken, userId } = useAuth();

  const { data: userInfo } = useSuspenseQuery(
    userInfoOptions(getToken, userId),
  );
  const { data: userRoles } = useSuspenseQuery(
    eventUserRoles(eventId, userInfo?.realmId),
  );
  const { data: gatekeepers } = useSuspenseQuery(
    eventGatekeepersEmails(eventId, getToken),
  );

  const columns = useGatekeepersColumns();
  const table = useDataTableInstance({
    data: gatekeepers.gatekeepers,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row,
  });

  if (!userRoles.includes("organizer")) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <h2 className="mb-4 text-lg font-semibold">Gatekeepers</h2>
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">No gatekeepers found.</Text>
              </div>
            )}
          />
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
