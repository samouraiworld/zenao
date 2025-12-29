import { Table } from "@tanstack/react-table";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

import { useTranslations } from "next-intl";
import { Button } from "@/components/shadcn/button";
import { Label } from "@/components/shadcn/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/shadcn/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pagination?: {
    page: number;
    setPage: (page: number) => void;
    limit: number;
    setLimit: (limit: number) => void;
  };
  manuelPagination?: {
    isFetchingNext: boolean;
    isFetchingPrevious: boolean;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    fetchNextPage: () => void;
    fetchPreviousPage: () => void;
  };
}

export function DataTablePaginationSync<TData>({
  table,
  pagination,
}: DataTablePaginationProps<TData>) {
  const t = useTranslations("data-table.pagination");

  return (
    <div className="flex items-center justify-between">
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            {t("rows-per-page")}
          </Label>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
              pagination?.setLimit(Number(value));
            }}
          >
            <SelectTrigger className="w-20 text-sm" id="rows-per-page">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(table.getPageCount() > 0 &&
          (pagination?.page ?? 1) - 1 < table.getPageCount()) ??
          (0 < table.getPageCount() && (
            <div className="flex w-fit items-center justify-center text-sm font-medium">
              {t("page-of", {
                page: table.getState().pagination.pageIndex + 1,
                pages: table.getPageCount(),
              })}
            </div>
          ))}
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => {
              table.setPageIndex(0);
              pagination?.setPage(1);
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => {
              if (table.getState().pagination.pageIndex !== 0) {
                pagination?.setPage(table.getState().pagination.pageIndex - 1);
              }
              table.previousPage();
            }}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => {
              pagination?.setPage(table.getState().pagination.pageIndex + 1);
              table.nextPage();
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => {
              pagination?.setPage(table.getPageCount());
              table.setPageIndex(table.getPageCount() - 1);
            }}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function DataTablePagination<TData>({
  table,
  manuelPagination = undefined,
  pagination = undefined,
}: DataTablePaginationProps<TData>) {
  if (!manuelPagination) {
    return <DataTablePaginationSync table={table} pagination={pagination} />;
  }

  return (
    <div className="flex items-center justify-between mt-2">
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={manuelPagination.fetchPreviousPage}
            disabled={
              !manuelPagination.hasPreviousPage ||
              manuelPagination.isFetchingPrevious
            }
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={manuelPagination.fetchNextPage}
            disabled={
              !manuelPagination.hasNextPage || manuelPagination.isFetchingNext
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
