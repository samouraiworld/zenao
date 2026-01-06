import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye } from "lucide-react";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import { Button } from "@/components/shadcn/button";
import { SafeCommunityUser } from "@/types/schemas";

const useCommunitiesTableColumns: () => ColumnDef<SafeCommunityUser>[] = () =>
  useMemo(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => <span>{row.original.community.displayName}</span>,
        enableSorting: true,
      },
      {
        accessorKey: "countMembers",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Members" />
        ),
        cell: ({ row }) => <span>{row.original.community.countMembers}</span>,
        enableSorting: true,
      },
      {
        accessorKey: "Roles",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Role(s)" />
        ),
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-1">
            {row.original.roles.map((role) => (
              <span
                key={role}
                className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-color"
              >
                {role}
              </span>
            ))}
          </div>
        ),
        enableSorting: false,
      },
      {
        id: "actions",
        header: () => <div>Actions</div>,
        cell: ({ row }) => (
          <Link href={`/community/${row.original.community.id}`}>
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
