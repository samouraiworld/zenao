import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useTranslations } from "next-intl";
import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import { Button } from "@/components/shadcn/button";
import { SafeCommunityUser } from "@/types/schemas";

const useCommunitiesTableColumns: () => ColumnDef<SafeCommunityUser>[] = () => {
  const t = useTranslations("dashboard.communitiesTable");

  return useMemo(
    () => [
      {
        accessorKey: "displayName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("name-column")} />
        ),
        cell: ({ row }) => <span>{row.original.community.displayName}</span>,
        enableSorting: true,
      },
      {
        accessorKey: "countMembers",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("members-column")} />
        ),
        cell: ({ row }) => <span>{row.original.community.countMembers}</span>,
        enableSorting: true,
      },
      {
        accessorKey: "Roles",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("roles-column")} />
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
        header: () => <div>{t("actions-column")}</div>,
        cell: ({ row }) => (
          <Link href={`/event/${row.original.community.id}`}>
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
    [t],
  );
};
export default useCommunitiesTableColumns;
