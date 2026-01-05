import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye } from "lucide-react";
import { CommunityInfo } from "@/app/gen/zenao/v1/zenao_pb";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import { Button } from "@/components/shadcn/button";

const useCommunitiesTableColumns: () => ColumnDef<CommunityInfo>[] = () =>
  useMemo(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => <span>{row.original.displayName}</span>,
        enableSorting: true,
      },
      {
        accessorKey: "countMembers",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Members" />
        ),
        cell: ({ row }) => <span>{row.original.countMembers}</span>,
        enableSorting: true,
      },
      {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: ({ row }) => (
          <Link href={`/event/${row.original.id}`}>
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

export default useCommunitiesTableColumns;
