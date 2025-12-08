import { Table } from "@tanstack/react-table";
import { ChevronRight, ChevronLeft, ChevronsLeft } from "lucide-react";

import {
  FetchNextPageOptions,
  FetchPreviousPageOptions,
  InfiniteData,
  InfiniteQueryObserverResult,
} from "@tanstack/react-query";
import { Button } from "@/components/shadcn/button";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  async?: {
    isFetchingNext: boolean;
    isFetchingPrevious: boolean;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    fetchNextPage: (
      options?: FetchNextPageOptions,
    ) => Promise<
      InfiniteQueryObserverResult<InfiniteData<TData[], unknown>, Error>
    >;
    fetchPreviousPage: (
      options?: FetchPreviousPageOptions,
    ) => Promise<
      InfiniteQueryObserverResult<InfiniteData<TData[], unknown>, Error>
    >;
  };
}

export function DataTablePagination<TData>({
  table,
  async = undefined,
}: DataTablePaginationProps<TData>) {
  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredSelectedRowModel().rows.length} of{" "}
        {table.getFilteredRowModel().rows.length} row(s) selected.
      </div>
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="flex w-fit items-center justify-center text-sm font-medium">
          Page {table.getState().pagination.pageIndex + 1} of{" "}
          {table.getPageCount()}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage() || !async?.hasPreviousPage}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={async () => {
              if (async) {
                await async.fetchPreviousPage();
              }
              table.previousPage();
            }}
            disabled={
              !table.getCanPreviousPage() ||
              async?.isFetchingPrevious ||
              !async?.hasPreviousPage
            }
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={async () => {
              if (async) {
                await async.fetchNextPage();
              }
              table.nextPage();
            }}
            disabled={
              !table.getCanNextPage() ||
              async?.isFetchingNext ||
              !async?.hasNextPage
            }
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
