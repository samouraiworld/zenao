"use client";

import * as React from "react";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEventsTableColumns } from "../columns";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { eventIdFromPkgPath } from "@/lib/queries/event";
import { DEFAULT_EVENTS_LIMIT } from "@/lib/queries/events-list";
import { SafeEventUser } from "@/types/schemas";

interface EventsTableViewProps {
  now: number;
  tab: "upcoming" | "past";
  events: SafeEventUser[];
  isFetchingPastNextPage: boolean;
  isFetchingPastPreviousPage: boolean;
  fetchPastNextPage: () => void | Promise<void>;
  fetchPastPreviousPage: () => void | Promise<void>;
  isFetchingUpcomingNextPage: boolean;
  isFetchingUpcomingPreviousPage: boolean;
  fetchUpcomingNextPage: () => void | Promise<void>;
  fetchUpcomingPreviousPage: () => void | Promise<void>;
  hasUpcomingNextPage: boolean;
  hasUpcomingPreviousPage: boolean;
  hasPastNextPage: boolean;
  hasPastPreviousPage: boolean;
}

export function EventsTableView({
  now,
  tab,
  events,
  isFetchingPastNextPage,
  isFetchingPastPreviousPage,
  fetchPastNextPage,
  fetchPastPreviousPage,
  isFetchingUpcomingNextPage,
  isFetchingUpcomingPreviousPage,
  fetchUpcomingNextPage,
  fetchUpcomingPreviousPage,
  hasUpcomingNextPage,
  hasUpcomingPreviousPage,
  hasPastNextPage,
  hasPastPreviousPage,
}: EventsTableViewProps) {
  const router = useRouter();
  const columns = useEventsTableColumns(now);
  const t = useTranslations("dashboard.eventsTable");
  const table = useDataTableInstance({
    data: events,
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_EVENTS_LIMIT,
    getRowId: (row) => row.event.pkgPath.toString(),
  });

  return (
    <>
      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">{t("no-events")}</Text>
                <Link href="/dashboard/event/create">
                  <Button size="sm">
                    <Plus />
                    {t("create-event-btn")}
                  </Button>
                </Link>
              </div>
            )}
            onClickRow={(row) => {
              router.push(
                `/dashboard/event/${eventIdFromPkgPath(row.original.event.pkgPath)}`,
              );
            }}
          />
        </div>
      </div>
      <DataTablePagination
        table={table}
        manuelPagination={{
          isFetchingNext:
            tab === "upcoming"
              ? isFetchingUpcomingNextPage
              : isFetchingPastNextPage,
          isFetchingPrevious:
            tab === "upcoming"
              ? isFetchingUpcomingPreviousPage
              : isFetchingPastPreviousPage,
          hasNextPage:
            tab === "upcoming" ? hasUpcomingNextPage : hasPastNextPage,
          hasPreviousPage:
            tab === "upcoming" ? hasUpcomingPreviousPage : hasPastPreviousPage,
          fetchNextPage:
            tab === "upcoming" ? fetchUpcomingNextPage : fetchPastNextPage,
          fetchPreviousPage:
            tab === "upcoming"
              ? fetchUpcomingPreviousPage
              : fetchPastPreviousPage,
        }}
      />
    </>
  );
}
