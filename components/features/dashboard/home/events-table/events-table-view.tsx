"use client";

import * as React from "react";

import {
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  InfiniteData,
  InfiniteQueryObserverResult,
} from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eventsTableColumns } from "../columns";
import { DataTablePagination } from "@/components/widgets/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/widgets/data-table/data-table-view-options";
import { DataTable as DataTableNew } from "@/components/widgets/data-table/data-table";
import { withDndColumn } from "@/lib/utils/data-table-utils";
import { Label } from "@/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/shadcn/tabs";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { DEFAULT_EVENTS_LIMIT } from "@/lib/queries/events-list";
import Text from "@/components/widgets/texts/text";
import { Button } from "@/components/shadcn/button";
import { eventIdFromPkgPath } from "@/lib/queries/event";

interface EventsTableViewProps {
  upcomingEvents: EventInfo[];
  pastEvents: EventInfo[];
  isFetchingPastNextPage: boolean;
  isFetchingPastPreviousPage: boolean;
  fetchPastNextPage: (
    options?: FetchNextPageOptions,
  ) => Promise<
    InfiniteQueryObserverResult<InfiniteData<EventInfo[], unknown>, Error>
  >;
  fetchPastPreviousPage: (
    options?: FetchPreviousPageOptions,
  ) => Promise<
    InfiniteQueryObserverResult<InfiniteData<EventInfo[], unknown>, Error>
  >;
  isFetchingUpcomingNextPage: boolean;
  isFetchingUpcomingPreviousPage: boolean;
  fetchUpcomingNextPage: (
    options?: FetchNextPageOptions,
  ) => Promise<
    InfiniteQueryObserverResult<InfiniteData<EventInfo[], unknown>, Error>
  >;
  fetchUpcomingPreviousPage: (
    options?: FetchPreviousPageOptions,
  ) => Promise<
    InfiniteQueryObserverResult<InfiniteData<EventInfo[], unknown>, Error>
  >;

  hasUpcomingNextPage: boolean;
  hasUpcomingPreviousPage: boolean;
  hasPastNextPage: boolean;
  hasPastPreviousPage: boolean;
}

export function EventsTableView({
  upcomingEvents,
  pastEvents,
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
  const [tab, setTab] = React.useState<"upcoming" | "past">("upcoming");
  const columns = withDndColumn(eventsTableColumns);
  const table = useDataTableInstance({
    data: tab === "upcoming" ? upcomingEvents : pastEvents,
    columns,
    enableRowSelection: false,
    defaultPageSize: DEFAULT_EVENTS_LIMIT,
    getRowId: (row) => row.pkgPath.toString(),
  });

  return (
    <Tabs
      defaultValue="upcoming"
      value={tab}
      onValueChange={setTab as React.Dispatch<React.SetStateAction<string>>}
      className="w-full flex-col justify-start gap-6"
    >
      <div className="flex items-center justify-between">
        <Label htmlFor="view-selector" className="sr-only">
          View
        </Label>
        <Select
          defaultValue="upcoming"
          value={tab}
          onValueChange={setTab as React.Dispatch<React.SetStateAction<string>>}
        >
          <SelectTrigger className="flex w-fit xl:hidden" id="view-selector">
            <SelectValue placeholder="Select a view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="upcoming">Upcoming</SelectItem>
            <SelectItem value="past">Past</SelectItem>
          </SelectContent>
        </Select>
        <TabsList className="**:data-[slot=badge]:bg-muted-foreground/30 hidden **:data-[slot=badge]:size-5 **:data-[slot=badge]:rounded-full **:data-[slot=badge]:px-1 xl:flex">
          <TabsTrigger value="upcoming" className="gap-2">
            Upcoming
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-2">
            Past
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="mt-2 relative flex flex-col gap-4 overflow-hidden rounded-lg border">
        <div className="w-full">
          <DataTableNew
            table={table}
            columns={columns}
            dndEnabled={false}
            nothingFn={() => (
              <div className="flex h-48 flex-col justify-center items-center gap-4">
                <Text className="text-center">No events found.</Text>
                <Link href="/dashboard/event/create">
                  <Button size="sm">
                    <Plus />
                    Create event
                  </Button>
                </Link>
              </div>
            )}
            onClickRow={(row) => {
              router.push(
                `/dashboard/event/${eventIdFromPkgPath(row.original.pkgPath)}`,
              );
            }}
          />
        </div>
      </div>
      <DataTablePagination
        table={table}
        async={{
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
    </Tabs>
  );
}
