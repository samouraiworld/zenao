"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { useTransition } from "react";
import {
  DEFAULT_EVENT_PARTICIPANTS_LIMIT,
  eventUsersWithRole,
} from "@/lib/queries/event-users";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import Text from "@/components/widgets/texts/text";
import { useParticipantsColumns } from "@/components/features/dashboard/event-details/columns";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { Button } from "@/components/shadcn/button";
import { zenaoClient } from "@/lib/zenao-client";

interface ParticipantsTableProps {
  eventId: string;
}

export default function ParticipantsTable({ eventId }: ParticipantsTableProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const { data: participants } = useSuspenseQuery(
    eventUsersWithRole(eventId, "participant"),
  );
  const columns = useParticipantsColumns();
  const table = useDataTableInstance({
    data: participants,
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_EVENT_PARTICIPANTS_LIMIT,
    getRowId: (row) => row,
  });

  const [isPending, startTransition] = useTransition();
  const onDownloadParticipantList = () => {
    startTransition(async () => {
      const token = await getToken();
      const response = await zenaoClient.exportParticipants(
        { eventId: eventId },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const blob = new Blob([response.content], { type: response.mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = response.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <Button
        variant="outline"
        size="sm"
        className="ml-auto hidden h-8 lg:flex"
        disabled={isPending}
        onClick={onDownloadParticipantList}
      >
        <Download />
        Export CSV
      </Button>
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">No participants found.</Text>
              </div>
            )}
            onClickRow={(row) => {
              router.push(`/profile/${row.original}`);
            }}
          />
        </div>
      </div>
      <DataTablePagination table={table} />
    </div>
  );
}
