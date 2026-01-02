import { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import Link from "next/link";
import { format as formatTZ } from "date-fns-tz";
import { fromUnixTime } from "date-fns";
import { useMemo } from "react";
import { Button } from "@/components/shadcn/button";
import { eventIdFromPkgPath } from "@/lib/queries/event";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import Text from "@/components/widgets/texts/text";
import { SafeEventUser } from "@/types/schemas";

export const useEventsTableColumns: () => ColumnDef<SafeEventUser>[] = () =>
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
            {formatTZ(
              fromUnixTime(Number(row.original.event.startDate)),
              "PPp O",
            )}
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
        cell: ({ row }) => <Text size="sm">{row.original.event.title}</Text>,
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
            {row.original.event.participants}
          </Text>
        ),
      },
      {
        accessorKey: "roles",
        enableSorting: false,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Roles" />
        ),
        cell: ({ row }) => (
          <Text size="sm" variant="secondary">
            {row.original.roles.map((role) => role).join(", ")}
          </Text>
        ),
      },
      {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: ({ row }) => (
          <Link
            href={`/event/${eventIdFromPkgPath(row.original.event.pkgPath)}`}
          >
            <Button
              variant="ghost"
              className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
              size="icon"
            >
              <Eye />
              <span className="sr-only">View</span>
            </Button>
          </Link>
        ),
        enableSorting: false,
        meta: {
          className: "flex justify-end items-center px-4",
        },
      },
    ],
    [],
  );
