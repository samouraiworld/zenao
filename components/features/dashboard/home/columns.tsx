import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { useMemo } from "react";
import { EventInfo } from "@/app/gen/zenao/v1/zenao_pb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";
import { Button } from "@/components/shadcn/button";
import { eventIdFromPkgPath } from "@/lib/queries/event";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import Text from "@/components/widgets/texts/text";

export const useEventsTableColumns: (now: number) => ColumnDef<EventInfo>[] = (
  now,
) =>
  useMemo(
    () => [
      {
        accessorKey: "startDate",
        enableSorting: true,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Date" />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {formatTZ(fromUnixTime(Number(row.original.startDate)), "PPp O")}
          </Text>
        ),
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: ({ column }) => (
          <DataTableColumnHeader
            className="w-full text-left"
            column={column}
            title="Name"
          />
        ),
        cell: ({ row }) => <Text size="sm">{row.original.title}</Text>,
        enableSorting: false,
        sortDescFirst: true,
      },
      {
        accessorKey: "participants",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Participants" />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {row.original.participants}
          </Text>
        ),
      },
      {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <EllipsisVertical />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-32">
              <DropdownMenuItem>
                <Link
                  href={`/event/${eventIdFromPkgPath(row.original.pkgPath)}`}
                >
                  View
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem disabled={now >= Number(row.original.endDate)}>
                <Link
                  href={`/event/${eventIdFromPkgPath(row.original.pkgPath)}/edit`}
                >
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={now >= Number(row.original.startDate)}
              >
                Cancel Event
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
        enableSorting: false,
        meta: {
          className: "flex justify-end items-center px-4",
        },
      },
    ],
    [now],
  );
