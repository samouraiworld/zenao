import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { EllipsisVertical } from "lucide-react";
import { useTranslations } from "next-intl";

import { DataTableColumnHeader } from "@/components/widgets/data-table/data-table-column-header";
import { Button } from "@/components/shadcn/button";
import { SafeCommunityUser } from "@/types/schemas";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/shadcn/dropdown-menu";

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
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title={t("email-column")} />
        ),
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="data-[state=open]:bg-muted text-muted-foreground flex size-8"
                size="icon"
              >
                <EllipsisVertical />
                <span className="sr-only">{t("view-community")}</span>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Link
                  href={`/dashboard/community/${row.original.community.id}`}
                >
                  {t("actions-menu.dashboard-view")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  href={`/community/${row.original.community.id}`}
                  target="_blank"
                >
                  {t("actions-menu.customer-view")}
                </Link>
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
    [t],
  );
};
export default useCommunitiesTableColumns;
