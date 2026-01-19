"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { parseAsInteger, useQueryStates } from "nuqs";
import { useTranslations } from "next-intl";
import { useGatekeepersEdition } from "./gatekeepers-edition-context-provider";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import {
  DEFAULT_EVENT_PARTICIPANTS_LIMIT,
  eventUserRoles,
} from "@/lib/queries/event-users";
import { useGatekeepersColumns } from "@/components/features/dashboard/event-details/columns";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import Text from "@/components/widgets/texts/text";
import { AddGatekeeperForm } from "@/components/features/dashboard/event-details/gatekeepers/add-gatekeeper-form";
import useActor from "@/hooks/use-actor";

interface GatekeepersTableProps {
  eventId: string;
}

export default function GatekeepersTable({ eventId }: GatekeepersTableProps) {
  const t = useTranslations("dashboard.eventDetails.gatekeepers");
  const actor = useActor();

  const { data: userRoles } = useSuspenseQuery(
    eventUserRoles(eventId, actor?.actingAs),
  );

  const { gatekeepers, onDelete } = useGatekeepersEdition();

  const columns = useGatekeepersColumns({
    onDelete,
  });

  const [tablePagination, setTablePagination] = useQueryStates(
    {
      page: parseAsInteger.withDefault(1),
      limit: parseAsInteger.withDefault(DEFAULT_EVENT_PARTICIPANTS_LIMIT),
    },
    {
      scroll: false,
      clearOnDefault: true,
    },
  );

  const table = useDataTableInstance({
    data: gatekeepers,
    columns,
    enableRowSelection: false,
    getRowId: (row) => row,
  });

  if (!userRoles.includes("organizer")) {
    return null;
  }

  return (
    <div className="flex flex-col gap-4">
      <AddGatekeeperForm />
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-gatekeepers")}</Text>
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
